import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, Search, Building2, FileText, MapPin, User, DollarSign, AlertCircle, FlaskConical, CheckCircle2, Layers, Hash } from "lucide-react";
import { toast } from "sonner";
import { lookupTID, type TIDData } from "@/lib/mock-data";
import { type Department, DEPARTMENTS, getWFAccount } from "@/lib/department-config";
import { getWireInstructions, formatEmailBody, type WireInstructionDetails } from "@/lib/wire-instructions";
import { useCreateWireRecord } from "@/hooks/useWireRecords";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import { useAuth } from "@/hooks/useAuth";

export default function NewWire() {
  const navigate = useNavigate();
  const createRecord = useCreateWireRecord();
  const { user } = useAuth();
  const [department, setDepartment] = useState<Department | "">("");
  const [tid, setTid] = useState("");
  const [tidData, setTidData] = useState<TIDData | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSentData, setLastSentData] = useState<{ email: string; pdf: string; tid: string; address: string; agent: string; wireId: string } | null>(null);

  const handleLookup = () => {
    setLookupError("");
    if (!tid.trim()) {
      setLookupError("Please enter a TID");
      return;
    }
    setIsLookingUp(true);
    setTidData(null);
    setTimeout(() => {
      const data = lookupTID(tid);
      setIsLookingUp(false);
      if (!data) {
        setLookupError(`No record found for "${tid}". Try: TID-10001, TID-10002, or TID-10003`);
        setTidData(null);
        return;
      }
      setTidData(data);
      toast.success("Deal data loaded successfully");
    }, 800);
  };

  // Only departments with wire accounts can be used here
  const wireDepartments = Object.entries(DEPARTMENTS).filter(([, cfg]) => cfg.wfAccount !== null);

  const wfAccount = department ? getWFAccount(department as Department) : null;

  let wireDetails: WireInstructionDetails | null = null;
  let pdfFileName = "";

  if (wfAccount) {
    wireDetails = getWireInstructions(wfAccount);
    pdfFileName = wfAccount === "8022" ? "8022_wire_instructions.pdf" : "3694_wire_instructions.pdf";
  }

  const emailBody = tidData && wireDetails
    ? formatEmailBody({
        tid: tid.toUpperCase().trim(),
        propertyAddress: tidData.propertyAddress,
        agentName: tidData.agentName,
        balanceDue: tidData.balanceDue,
        customerName: tidData.customerName,
        wire: wireDetails,
      })
    : "";

  const handlePreviewOrSend = () => {
    if (!department || !tidData) {
      toast.error("Please select a department and look up deal data first");
      return;
    }
    if (!tid.trim()) {
      toast.error("Please enter a TID");
      return;
    }
    if (!emailRecipient.trim()) {
      toast.error("Please enter an email recipient");
      return;
    }
    setShowPreview(true);
  };

  const buildRecordPayload = () => {
    return {
      tid: tid.toUpperCase().trim(),
      department: department as string,
      wf_account: wfAccount as string,
      invoice_number: tidData!.invoiceNumber,
      invoice_date: tidData!.invoiceDate || null,
      original_amount: tidData!.originalAmount || null,
      balance_due: tidData!.balanceDue || null,
      customer_name: tidData!.customerName,
      entity: tidData!.entity || null,
      customer_id_prefix: tidData!.customerIdPrefix || null,
      customer_id_suffix: tidData!.customerIdSuffix || null,
      property_address: tidData!.propertyAddress || null,
      transaction_state: tidData!.transactionState || null,
      agent_name: tidData!.agentName || null,
      assigned_analyst: tidData!.assignedAnalyst || null,
      deal_notes: tidData!.dealNotes || null,
      email_sent: !testMode,
      email_sent_at: testMode ? null : new Date().toISOString(),
      email_recipient: emailRecipient,
      status: "Sent",
      created_by: user?.id ?? null,
    };
  };

  const handleConfirmSend = async () => {
    if (!department || !tidData) return;
    try {
      const result: any = await createRecord.mutateAsync(buildRecordPayload());
      setShowPreview(false);
      setLastSentData({
        email: emailRecipient,
        pdf: pdfFileName,
        tid: tid.toUpperCase().trim(),
        address: tidData.propertyAddress,
        agent: tidData.agentName,
        wireId: result.id,
      });
      setShowSuccess(true);
    } catch (err: any) {
      toast.error("Failed to create wire record", { description: err.message });
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/expected-wires", { state: { highlightWireId: lastSentData?.wireId } });
  };

  const canDispatch = tidData && department && wireDetails && tid.trim();

  const getDeptBorderColor = (dept: string) => {
    switch (dept) {
      case "Transactions": return "ring-[#0056D2]/30";
      case "ASC": return "ring-slate-300";
      default: return "ring-primary/20";
    }
  };

  const deptRing = department ? getDeptBorderColor(department) : "";

  const hasDataBelow = isLookingUp || tidData || canDispatch;

  return (
    <div className="relative min-h-full p-4 sm:p-8 overflow-hidden bg-background">
      {/* eXp watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none" aria-hidden="true">
        <span className="text-[12rem] sm:text-[18rem] font-black tracking-tighter text-foreground/[0.03]">eXp</span>
      </div>

      <div className={`relative z-10 mx-auto max-w-4xl transition-all duration-500 ${!hasDataBelow ? "flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center" : "space-y-8"}`}>
        {/* Header */}
        <div className={`w-full ${!hasDataBelow ? "mb-6" : "mb-0"}`}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary">Send Wire Instructions</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select department, look up the TID, and dispatch wire instructions.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <FlaskConical className="h-4 w-4 text-amber-600" />
              <Label htmlFor="test-mode" className="text-sm font-medium text-amber-800 cursor-pointer">Test Mode</Label>
              <Switch id="test-mode" checked={testMode} onCheckedChange={setTestMode} />
            </div>
          </div>

          {testMode && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6">
              <strong>🧪 Test Mode Active</strong> — Records will be saved to the dashboard but no emails will actually be sent.
            </div>
          )}
        </div>

        {/* Step 1: Department + TID Lookup */}
        <Card className={`w-full border-0 bg-card rounded-2xl shadow-xl transition-all duration-300 p-2 ${department ? `ring-2 ${deptRing}` : ""}`}>
          <CardHeader className="pb-4 px-6 pt-6">
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <Building2 className="h-5 w-5 text-primary" />
              Department & TID Lookup
            </CardTitle>
            <CardDescription>Choose department and look up the transaction ID.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</Label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10 pointer-events-none" />
                  <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
                    <SelectTrigger className="h-11 rounded-[10px] pl-10 text-sm border-0 bg-muted/30 focus:bg-card focus:ring-2 focus:ring-primary transition-all">
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent>
                      {wireDepartments.map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {department && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    → {DEPARTMENTS[department as Department].accountLabel}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transaction ID (TID)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      placeholder="e.g. TID-10001"
                      value={tid}
                      onChange={(e) => setTid(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                      className="h-11 rounded-[10px] pl-10 pr-20 text-sm border-0 bg-muted/30 focus:bg-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 transition-all"
                    />
                    {department && wfAccount && (
                      <span className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold font-mono ${
                        wfAccount === "8022"
                          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
                          : "bg-blue-100 text-blue-800 ring-1 ring-blue-300"
                      }`}>
                        {wfAccount}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLookup}
                    disabled={isLookingUp}
                    className="shrink-0 h-11 px-5 rounded-[10px] text-sm font-semibold text-white transition-all disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, #00245D 0%, #0056D2 100%)',
                      boxShadow: '0 2px 8px rgba(0, 86, 210, 0.25)',
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.boxShadow = '0 4px 20px rgba(0, 86, 210, 0.45)'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(0, 86, 210, 0.25)'; }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Search className="h-4 w-4" />
                      {isLookingUp ? "Looking up..." : "Lookup"}
                    </span>
                  </button>
                </div>
                {lookupError && (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-3 w-3" /> {lookupError}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skeleton Loading State */}
        {isLookingUp && (
          <Card className="border-0 bg-card rounded-2xl shadow-xl animate-fade-in mt-8">
            <CardHeader className="pb-4 px-6 pt-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-56 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              <div className="grid gap-3 sm:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lookup Result — Deal Data */}
        <div className={`transition-all duration-500 ease-out mt-8 ${tidData ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none h-0 overflow-hidden"}`}>
          {tidData && (
            <Card className="border-0 bg-card rounded-2xl shadow-xl animate-fade-in">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  <FileText className="h-5 w-5 text-primary" />
                  Deal Data
                </CardTitle>
                <CardDescription>Auto-populated from Task Center. Review before sending.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <DollarSign className="h-4 w-4 text-emerald-600" /> Financials
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />} label="Invoice #" value={tidData.invoiceNumber} />
                    <Field label="Invoice Date" value={tidData.invoiceDate} />
                    <Field icon={<DollarSign className="h-3.5 w-3.5 text-muted-foreground" />} label="Original Amount" value={`$${tidData.originalAmount.toLocaleString()}`} />
                    <Field icon={<DollarSign className="h-3.5 w-3.5 text-primary" />} label="Balance Due" value={`$${tidData.balanceDue.toLocaleString()}`} highlight />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <User className="h-4 w-4 text-primary" /> Identity
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field icon={<User className="h-3.5 w-3.5 text-muted-foreground" />} label="Customer Name" value={tidData.customerName} />
                    <Field label="Entity" value={tidData.entity} />
                    <Field label="ID Prefix" value={tidData.customerIdPrefix} />
                    <Field label="ID Suffix" value={tidData.customerIdSuffix} />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <MapPin className="h-4 w-4 text-rose-500" /> Logistics
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />} label="Property Address" value={tidData.propertyAddress} />
                    <Field label="Transaction State" value={tidData.transactionState} />
                    <Field icon={<User className="h-3.5 w-3.5 text-muted-foreground" />} label="Agent Name" value={tidData.agentName} />
                    <Field label="Assigned Analyst" value={tidData.assignedAnalyst} />
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="mt-1 rounded-lg bg-muted/30 p-3 text-sm text-foreground">{tidData.dealNotes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Step 3: Dispatch */}
        <div className={`transition-all duration-500 ease-out delay-150 mt-8 ${canDispatch ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none h-0 overflow-hidden"}`}>
          {canDispatch && (
            <Card className="border-0 bg-card rounded-2xl shadow-xl animate-fade-in">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  <Send className="h-5 w-5 text-primary" />
                  Dispatch Wire Instructions
                </CardTitle>
                <CardDescription>
                  Email will include TID, property address, agent name, fee disclosure, and the{" "}
                  <span className="font-semibold text-foreground">{wireDetails?.accountLabel}</span>{" "}
                  PDF attachment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipient Email</Label>
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="h-11 rounded-[10px] border-0 bg-muted/30 focus:bg-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 transition-all"
                  />
                </div>

                {wireDetails && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1">
                    <p className="font-semibold text-foreground">{wireDetails.accountLabel}</p>
                    <p className="text-muted-foreground">
                      Routing: {wireDetails.routingNumber} · Account: {wireDetails.accountNumber}
                    </p>
                    <p className="text-muted-foreground">
                      {wireDetails.bankName}, {wireDetails.bankAddress}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <strong>Fee Disclosure:</strong> All bank fees (wire transfer fees) are to be paid by the
                  Originator (remitter). This will be included in the email body.
                </div>

                <button
                  onClick={handlePreviewOrSend}
                  disabled={createRecord.isPending}
                  className={`w-full h-12 rounded-[10px] text-sm font-semibold text-primary-foreground transition-all disabled:opacity-60 shadow-md ${testMode ? 'bg-secondary' : 'bg-primary hover:bg-primary/90'}`}
                >
                  {testMode ? (
                    <span className="flex items-center justify-center gap-2">
                      <FlaskConical className="h-4 w-4" />
                      Preview & Test
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send className="h-4 w-4" />
                      Preview & Send
                    </span>
                  )}
                </button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Email Preview Dialog */}
        <EmailPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          onConfirmSend={handleConfirmSend}
          isSending={createRecord.isPending}
          isTestMode={testMode}
          recipientEmail={emailRecipient}
          emailBody={emailBody}
          pdfFileName={pdfFileName}
          accountLabel={wireDetails?.accountLabel ?? ""}
        />

        {/* Success Modal */}
        <Dialog open={showSuccess} onOpenChange={(open) => { if (!open) handleSuccessClose(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="items-center text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <DialogTitle className="text-xl">Wire Instructions Sent!</DialogTitle>
              <DialogDescription>Your wire record has been created successfully.</DialogDescription>
            </DialogHeader>
            {lastSentData && (
              <div className="space-y-3 mt-2">
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipient</span>
                    <span className="font-medium">{lastSentData.email}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PDF Attached</span>
                    <Badge variant="secondary" className="font-mono text-xs">{lastSentData.pdf}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TID</span>
                    <span className="font-bold font-mono text-primary">{lastSentData.tid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</span>
                    <span className="font-medium text-right max-w-[200px]">{lastSentData.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Agent</span>
                    <span className="font-medium">{lastSentData.agent}</span>
                  </div>
                </div>
                <button
                  className="w-full h-11 rounded-[10px] text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-md"
                  onClick={handleSuccessClose}
                >
                  Go to Expected Wires
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Field({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </Label>
      <p className={`mt-0.5 text-sm font-medium ${highlight ? "text-primary font-bold" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
