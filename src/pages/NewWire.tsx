import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, Search, Building2, FileText, MapPin, User, DollarSign, AlertCircle, FlaskConical, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { lookupTID, type TIDData } from "@/lib/mock-data";
import { type Department, DEPARTMENTS, getWFAccount } from "@/lib/department-config";
import { getWireInstructions, formatEmailBody, type WireInstructionDetails } from "@/lib/wire-instructions";
import { useCreateWireRecord } from "@/hooks/useWireRecords";
import { useCustomWireInstructions, type CustomWireInstruction } from "@/hooks/useCustomWireInstructions";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import { useAuth } from "@/hooks/useAuth";

export default function NewWire() {
  const navigate = useNavigate();
  const createRecord = useCreateWireRecord();
  const { user } = useAuth();
  const { data: customInstructions } = useCustomWireInstructions();
  const [department, setDepartment] = useState<Department | "">("");
  const [tid, setTid] = useState("");
  const [tidData, setTidData] = useState<TIDData | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCustomId, setSelectedCustomId] = useState("");
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
    // Simulate API delay
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

  const wfAccount = department ? getWFAccount(department as Department) : null;
  const isCustom = wfAccount === "custom";

  const selectedCustom = isCustom
    ? customInstructions?.find((c) => c.id === selectedCustomId) ?? null
    : null;

  let wireDetails: WireInstructionDetails | null = null;
  let pdfFileName = "";

  if (wfAccount && wfAccount !== "custom") {
    wireDetails = getWireInstructions(wfAccount as "8022" | "3694");
    pdfFileName = wfAccount === "8022" ? "8022_wire_instructions.pdf" : "3694_wire_instructions.pdf";
  } else if (selectedCustom) {
    wireDetails = {
      accountNumber: selectedCustom.account_number,
      accountLabel: selectedCustom.name,
      bankName: selectedCustom.bank_name,
      bankAddress: selectedCustom.bank_address,
      accountName: selectedCustom.account_name,
      accountHolderAddress: selectedCustom.account_holder_address,
      routingNumber: selectedCustom.routing_number,
      confirmationPhone: selectedCustom.confirmation_phone ?? "",
      pdfPath: selectedCustom.pdf_path ?? "",
    };
    pdfFileName = selectedCustom.pdf_path
      ? selectedCustom.pdf_path.split("/").pop() ?? "custom_wire_instructions.pdf"
      : "No PDF attached";
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
      toast.error("Please select a department and look up a TID first");
      return;
    }
    if (isCustom && !selectedCustom) {
      toast.error("Please select a custom wire instruction");
      return;
    }
    if (!emailRecipient.trim()) {
      toast.error("Please enter an email recipient");
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSend = async () => {
    if (!department || !tidData) return;

    const effectiveWfAccount = isCustom ? (selectedCustom?.account_number ?? "custom") : (wfAccount as string);

    try {
      const result: any = await createRecord.mutateAsync({
        tid: tid.toUpperCase().trim(),
        department,
        wf_account: effectiveWfAccount,
        invoice_number: tidData.invoiceNumber,
        invoice_date: tidData.invoiceDate,
        original_amount: tidData.originalAmount,
        balance_due: tidData.balanceDue,
        customer_name: tidData.customerName,
        entity: tidData.entity,
        customer_id_prefix: tidData.customerIdPrefix,
        customer_id_suffix: tidData.customerIdSuffix,
        property_address: tidData.propertyAddress,
        transaction_state: tidData.transactionState,
        agent_name: tidData.agentName,
        assigned_analyst: tidData.assignedAnalyst,
        deal_notes: tidData.dealNotes,
        email_sent: !testMode,
        email_sent_at: testMode ? null : new Date().toISOString(),
        email_recipient: emailRecipient,
        status: "Sent",
        created_by: user?.id ?? null,
      });

      setShowPreview(false);

      // Show success modal
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
    navigate("/dashboard", { state: { highlightWireId: lastSentData?.wireId } });
  };

  const canDispatch = tidData && department && (!isCustom || selectedCustom) && wireDetails;

  // Department-based border color
  const getDeptBorderColor = (dept: string) => {
    switch (dept) {
      case "Transactions": return "border-blue-500";
      case "Solutions Hub": return "border-blue-400";
      case "ASC": return "border-slate-400";
      case "Other": return "border-amber-400";
      default: return "border-primary/20";
    }
  };

  const deptBorder = department ? getDeptBorderColor(department) : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Send Wire Instructions</h1>
          <p className="text-sm text-muted-foreground">
            Select department, look up the TID, and dispatch wire instructions.
          </p>
        </div>

        {/* Test Mode Toggle */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          <Label htmlFor="test-mode" className="text-sm font-medium text-amber-800 cursor-pointer">
            Test Mode
          </Label>
          <Switch
            id="test-mode"
            checked={testMode}
            onCheckedChange={setTestMode}
          />
        </div>
      </div>

      {testMode && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>🧪 Test Mode Active</strong> — Records will be saved to the dashboard but no emails will actually be sent. You'll see a full preview of the email before saving.
        </div>
      )}

      {/* Step 1: Department + TID — Floating Card */}
      <Card className={`bg-white rounded-xl shadow-lg transition-all duration-300 ${department ? `border-2 ${deptBorder}` : ""}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Department & TID Lookup
          </CardTitle>
          <CardDescription>Choose the department to determine the correct wire instructions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={(v) => {
                setDepartment(v as Department);
                setSelectedCustomId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPARTMENTS).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {department && !isCustom && (
                <Badge variant="secondary" className="font-mono text-xs">
                  → {DEPARTMENTS[department as Department].accountLabel}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label>Transaction ID (TID)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="e.g. TID-10001"
                    value={tid}
                    onChange={(e) => setTid(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    className="focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 pr-20"
                  />
                  {/* Bank Badge next to TID input */}
                  {department && wfAccount && wfAccount !== "custom" && (
                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold font-mono ${
                      wfAccount === "8022"
                        ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
                        : "bg-blue-100 text-blue-800 ring-1 ring-blue-300"
                    }`}>
                      {wfAccount}
                    </span>
                  )}
                </div>
                <Button variant="secondary" onClick={handleLookup} className="shrink-0" disabled={isLookingUp}>
                  <Search className="mr-1 h-4 w-4" />
                  {isLookingUp ? "Looking up..." : "Lookup"}
                </Button>
              </div>
              {lookupError && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-3 w-3" /> {lookupError}
                </p>
              )}
            </div>
          </div>

          {/* Custom instruction selector */}
          {isCustom && (
            <div className="space-y-2 rounded-md border border-primary/20 bg-accent p-4">
              <Label className="text-sm font-semibold">Select Custom Wire Instructions</Label>
              {!customInstructions?.length ? (
                <p className="text-sm text-muted-foreground">
                  No custom instructions available. An admin must first add them via the Wire Instructions page.
                </p>
              ) : (
                <Select value={selectedCustomId} onValueChange={setSelectedCustomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose custom wire instructions..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customInstructions.map((ci) => (
                      <SelectItem key={ci.id} value={ci.id}>
                        {ci.name} — {ci.bank_name} (••{ci.account_number.slice(-4)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedCustom && (
                <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                  <p className="font-semibold text-foreground">{selectedCustom.name}</p>
                  <p className="text-muted-foreground">
                    Routing: {selectedCustom.routing_number} · Account: {selectedCustom.account_number}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedCustom.bank_name}, {selectedCustom.bank_address}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skeleton Loading State */}
      {isLookingUp && (
        <Card className="bg-white rounded-xl shadow-lg animate-fade-in">
          <CardHeader className="pb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <div className="grid gap-3 sm:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <div className="grid gap-3 sm:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Deal Data — Animated reveal */}
      <div className={`transition-all duration-500 ease-out ${tidData ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden"}`}>
        {tidData && (
          <Card className={`bg-white rounded-xl shadow-lg border-2 ${deptBorder} animate-fade-in`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Deal Data
              </CardTitle>
              <CardDescription>Auto-populated from Task Center. Review before sending.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <User className="h-4 w-4 text-blue-600" /> Identity
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
                <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm text-foreground">{tidData.dealNotes}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Step 3: Send — Animated reveal */}
      <div className={`transition-all duration-500 ease-out delay-150 ${canDispatch ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden"}`}>
        {canDispatch && (
          <Card className={`bg-white rounded-xl shadow-lg border-2 ${deptBorder} animate-fade-in`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-primary" />
                Dispatch Wire Instructions
              </CardTitle>
              <CardDescription>
                Email will include TID, property address, agent name, fee disclosure, and the{" "}
                <span className="font-semibold text-foreground">
                  {wireDetails?.accountLabel}
                </span>{" "}
                {wireDetails?.pdfPath ? "PDF attachment" : "details"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Email</Label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                />
              </div>

              {wireDetails && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                  <p className="font-semibold text-foreground">{wireDetails.accountLabel}</p>
                  <p className="text-muted-foreground">
                    Routing: {wireDetails.routingNumber} · Account: {wireDetails.accountNumber}
                  </p>
                  <p className="text-muted-foreground">
                    {wireDetails.bankName}, {wireDetails.bankAddress}
                  </p>
                </div>
              )}

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <strong>Fee Disclosure:</strong> All bank fees (wire transfer fees) are to be paid by the
                Originator (remitter). This will be included in the email body.
              </div>

              <Button
                size="lg"
                onClick={handlePreviewOrSend}
                disabled={createRecord.isPending}
                className="w-full"
                variant={testMode ? "secondary" : "default"}
              >
                {testMode ? (
                  <>
                    <FlaskConical className="mr-2 h-4 w-4" />
                    Preview & Test
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Preview & Send
                  </>
                )}
              </Button>
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
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
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
                  <span className="font-bold font-mono" style={{ color: '#1e3a5f' }}>{lastSentData.tid}</span>
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
              <Button className="w-full" onClick={handleSuccessClose}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
      <p className={`mt-0.5 text-sm font-medium ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
