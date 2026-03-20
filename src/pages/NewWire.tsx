import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, Search, Building2, FileText, MapPin, User, DollarSign, AlertCircle, FlaskConical, CheckCircle2, Layers, Hash, PenLine, MailX } from "lucide-react";
import { toast } from "sonner";
import { lookupTID, type TIDData } from "@/lib/mock-data";
import { type Department, DEPARTMENTS, getWFAccount } from "@/lib/department-config";
import { getWireInstructions, formatEmailBody, type WireInstructionDetails } from "@/lib/wire-instructions";
import { useCreateWireRecord } from "@/hooks/useWireRecords";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import { useAuth } from "@/hooks/useAuth";

type EntryMode = "lookup" | "manual";

export default function NewWire() {
  const navigate = useNavigate();
  const createRecord = useCreateWireRecord();
  const { user } = useAuth();
  const [department, setDepartment] = useState<Department | "">("");
  const [entryMode, setEntryMode] = useState<EntryMode>("lookup");
  const [tid, setTid] = useState("");
  const [tidData, setTidData] = useState<TIDData | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [skipEmail, setSkipEmail] = useState(false);
  const [lastSentData, setLastSentData] = useState<{ email: string; pdf: string; tid: string; address: string; agent: string; wireId: string } | null>(null);

  // Manual entry fields
  const [manualData, setManualData] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    originalAmount: "",
    balanceDue: "",
    customerName: "",
    entity: "",
    customerIdPrefix: "",
    customerIdSuffix: "",
    propertyAddress: "",
    transactionState: "",
    agentName: "",
    assignedAnalyst: "",
    dealNotes: "",
  });

  const updateManual = (field: string, value: string) => {
    setManualData((prev) => ({ ...prev, [field]: value }));
  };

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

  // Resolved data from either lookup or manual entry
  const resolvedData: TIDData | null = entryMode === "lookup"
    ? tidData
    : (tid.trim() && manualData.customerName.trim())
      ? {
          invoiceNumber: manualData.invoiceNumber,
          invoiceDate: manualData.invoiceDate,
          originalAmount: parseFloat(manualData.originalAmount) || 0,
          balanceDue: parseFloat(manualData.balanceDue) || 0,
          customerName: manualData.customerName,
          entity: manualData.entity,
          customerIdPrefix: manualData.customerIdPrefix,
          customerIdSuffix: manualData.customerIdSuffix,
          propertyAddress: manualData.propertyAddress,
          transactionState: manualData.transactionState,
          agentName: manualData.agentName,
          assignedAnalyst: manualData.assignedAnalyst,
          dealNotes: manualData.dealNotes,
        }
      : null;

  const wfAccount = department ? getWFAccount(department as Department) : null;

  let wireDetails: WireInstructionDetails | null = null;
  let pdfFileName = "";

  if (wfAccount) {
    wireDetails = getWireInstructions(wfAccount);
    pdfFileName = wfAccount === "8022" ? "8022_wire_instructions.pdf" : "3694_wire_instructions.pdf";
  }

  const emailBody = resolvedData && wireDetails
    ? formatEmailBody({
        tid: tid.toUpperCase().trim(),
        propertyAddress: resolvedData.propertyAddress,
        agentName: resolvedData.agentName,
        balanceDue: resolvedData.balanceDue,
        customerName: resolvedData.customerName,
        wire: wireDetails,
      })
    : "";

  const handlePreviewOrSend = () => {
    if (!department || !resolvedData) {
      toast.error("Please select a department and enter deal data first");
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

  const buildRecordPayload = (isSaveOnly: boolean) => {
    return {
      tid: tid.toUpperCase().trim(),
      department: department as string,
      wf_account: wfAccount as string,
      invoice_number: resolvedData!.invoiceNumber,
      invoice_date: resolvedData!.invoiceDate || null,
      original_amount: resolvedData!.originalAmount || null,
      balance_due: resolvedData!.balanceDue || null,
      customer_name: resolvedData!.customerName,
      entity: resolvedData!.entity || null,
      customer_id_prefix: resolvedData!.customerIdPrefix || null,
      customer_id_suffix: resolvedData!.customerIdSuffix || null,
      property_address: resolvedData!.propertyAddress || null,
      transaction_state: resolvedData!.transactionState || null,
      agent_name: resolvedData!.agentName || null,
      assigned_analyst: resolvedData!.assignedAnalyst || null,
      deal_notes: resolvedData!.dealNotes || null,
      email_sent: isSaveOnly ? false : !testMode,
      email_sent_at: isSaveOnly || testMode ? null : new Date().toISOString(),
      email_recipient: isSaveOnly ? null : emailRecipient,
      status: isSaveOnly ? "Pending" : "Sent",
      created_by: user?.id ?? null,
    };
  };

  const handleSaveOnly = async () => {
    if (!department || !resolvedData || !tid.trim()) {
      toast.error("Please fill in department, TID, and deal data");
      return;
    }
    try {
      const result: any = await createRecord.mutateAsync(buildRecordPayload(true));
      toast.success(`Record ${tid.toUpperCase().trim()} saved to dashboard`);
      navigate("/dashboard", { state: { highlightWireId: result.id } });
    } catch (err: any) {
      toast.error("Failed to save record", { description: err.message });
    }
  };

  const handleConfirmSend = async () => {
    if (!department || !resolvedData) return;
    try {
      const result: any = await createRecord.mutateAsync(buildRecordPayload(false));
      setShowPreview(false);
      setLastSentData({
        email: emailRecipient,
        pdf: pdfFileName,
        tid: tid.toUpperCase().trim(),
        address: resolvedData.propertyAddress,
        agent: resolvedData.agentName,
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

  const canDispatch = resolvedData && department && wireDetails && tid.trim();

  const getDeptBorderColor = (dept: string) => {
    switch (dept) {
      case "Transactions": return "ring-[#0056D2]/30";
      case "ASC": return "ring-slate-300";
      default: return "ring-primary/20";
    }
  };

  const deptRing = department ? getDeptBorderColor(department) : "";

  // Determine if we have data to show below the first card
  const hasDataBelow = isLookingUp || (entryMode === "lookup" && tidData) || (entryMode === "manual" && tid.trim()) || canDispatch;

  return (
    <div className="relative min-h-full p-4 sm:p-8 overflow-hidden bg-background">
      {/* eXp watermark */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        aria-hidden="true"
      >
        <span
          className="text-[12rem] sm:text-[18rem] font-black tracking-tighter text-foreground/[0.03]"
        >
          eXp
        </span>
      </div>

      <div className={`relative z-10 mx-auto max-w-3xl transition-all duration-500 ${!hasDataBelow ? "flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center" : "space-y-8"}`}>
        {/* Header — always visible */}
        <div className={`w-full ${!hasDataBelow ? "mb-6" : "mb-0"}`}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#00245D' }}>Send Wire Instructions</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select department, {entryMode === "lookup" ? "look up the TID" : "enter deal data manually"}, and dispatch wire instructions.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <FlaskConical className="h-4 w-4 text-amber-600" />
              <Label htmlFor="test-mode" className="text-sm font-medium text-amber-800 cursor-pointer">
                Test Mode
              </Label>
              <Switch id="test-mode" checked={testMode} onCheckedChange={setTestMode} />
            </div>
          </div>

          {testMode && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6">
              <strong>🧪 Test Mode Active</strong> — Records will be saved to the dashboard but no emails will actually be sent.
            </div>
          )}
        </div>

        {/* Step 1: Department + Entry Mode + TID */}
        <Card className={`w-full border-0 bg-card rounded-2xl shadow-xl transition-all duration-300 p-2 ${department ? `ring-2 ${deptRing}` : ""}`}>
          <CardHeader className="pb-4 px-6 pt-6">
            <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#00245D' }}>
              <Building2 className="h-5 w-5" style={{ color: '#0056D2' }} />
              Department & Deal Entry
            </CardTitle>
            <CardDescription>Choose department and how you want to enter deal data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            {/* Entry Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1">
              <button
                onClick={() => { setEntryMode("lookup"); setTidData(null); setLookupError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  entryMode === "lookup"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                TID Lookup
              </button>
              <button
                onClick={() => { setEntryMode("manual"); setTidData(null); setLookupError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  entryMode === "manual"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PenLine className="h-3.5 w-3.5" />
                Manual Entry
              </button>
            </div>

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
                      {Object.entries(DEPARTMENTS).map(([key, cfg]) => (
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
                      onKeyDown={(e) => e.key === "Enter" && entryMode === "lookup" && handleLookup()}
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
                  {entryMode === "lookup" && (
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
                  )}
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

        {/* Manual Entry Form */}
        <div className={`transition-all duration-500 ease-out mt-8 ${entryMode === "manual" && tid.trim() ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none h-0 overflow-hidden"}`}>
          {entryMode === "manual" && (
             <Card className="border-0 bg-card rounded-2xl shadow-xl animate-fade-in">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#00245D' }}>
                  <PenLine className="h-5 w-5" style={{ color: '#0056D2' }} />
                  Manual Deal Entry
                </CardTitle>
                <CardDescription>Enter the deal data manually. Fields marked with * are required.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <DollarSign className="h-4 w-4 text-emerald-600" /> Financials
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <ManualField label="Invoice #" value={manualData.invoiceNumber} onChange={(v) => updateManual("invoiceNumber", v)} placeholder="INV-2026-..." />
                    <ManualField label="Invoice Date" value={manualData.invoiceDate} onChange={(v) => updateManual("invoiceDate", v)} type="date" />
                    <ManualField label="Original Amount" value={manualData.originalAmount} onChange={(v) => updateManual("originalAmount", v)} type="number" placeholder="0.00" />
                    <ManualField label="Balance Due *" value={manualData.balanceDue} onChange={(v) => updateManual("balanceDue", v)} type="number" placeholder="0.00" highlight />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <User className="h-4 w-4" style={{ color: '#0056D2' }} /> Identity
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <ManualField label="Customer Name *" value={manualData.customerName} onChange={(v) => updateManual("customerName", v)} placeholder="Company LLC" />
                    <ManualField label="Entity" value={manualData.entity} onChange={(v) => updateManual("entity", v)} placeholder="Parent entity" />
                    <ManualField label="ID Prefix" value={manualData.customerIdPrefix} onChange={(v) => updateManual("customerIdPrefix", v)} placeholder="ABC" />
                    <ManualField label="ID Suffix" value={manualData.customerIdSuffix} onChange={(v) => updateManual("customerIdSuffix", v)} placeholder="1234" />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <MapPin className="h-4 w-4 text-rose-500" /> Logistics
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ManualField label="Property Address" value={manualData.propertyAddress} onChange={(v) => updateManual("propertyAddress", v)} placeholder="123 Main St, City, ST 00000" />
                    <ManualField label="Transaction State" value={manualData.transactionState} onChange={(v) => updateManual("transactionState", v)} placeholder="State" />
                    <ManualField label="Agent Name" value={manualData.agentName} onChange={(v) => updateManual("agentName", v)} placeholder="Agent name" />
                    <ManualField label="Assigned Analyst" value={manualData.assignedAnalyst} onChange={(v) => updateManual("assignedAnalyst", v)} placeholder="Analyst name" />
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea
                    value={manualData.dealNotes}
                    onChange={(e) => updateManual("dealNotes", e.target.value)}
                    placeholder="Any additional deal notes..."
                    className="rounded-[10px] border-0 bg-[#F1F5F9] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#0056D2] focus-visible:ring-offset-0 transition-all"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lookup Result — Deal Data (read-only display) */}
        <div className={`transition-all duration-500 ease-out mt-8 ${entryMode === "lookup" && tidData ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none h-0 overflow-hidden"}`}>
          {tidData && entryMode === "lookup" && (
            <Card className="border-0 bg-white rounded-2xl shadow-xl animate-fade-in">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#00245D' }}>
                  <FileText className="h-5 w-5" style={{ color: '#0056D2' }} />
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
                    <Field icon={<DollarSign className="h-3.5 w-3.5" style={{ color: '#0056D2' }} />} label="Balance Due" value={`$${tidData.balanceDue.toLocaleString()}`} highlight />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <User className="h-4 w-4" style={{ color: '#0056D2' }} /> Identity
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
                  <p className="mt-1 rounded-lg bg-[#F1F5F9] p-3 text-sm text-foreground">{tidData.dealNotes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Step 3: Dispatch — Animated reveal */}
        <div className={`transition-all duration-500 ease-out delay-150 mt-8 ${canDispatch ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none h-0 overflow-hidden"}`}>
          {canDispatch && (
            <Card className="border-0 bg-white rounded-2xl shadow-xl animate-fade-in">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#00245D' }}>
                  <Send className="h-5 w-5" style={{ color: '#0056D2' }} />
                  Dispatch Wire Instructions
                </CardTitle>
                <CardDescription>
                  Email will include TID, property address, agent name, fee disclosure, and the{" "}
                  <span className="font-semibold text-foreground">{wireDetails?.accountLabel}</span>{" "}
                  PDF attachment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                {/* Skip Email Checkbox */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[#F1F5F9] p-3">
                  <Checkbox
                    id="skip-email"
                    checked={skipEmail}
                    onCheckedChange={(v) => setSkipEmail(v === true)}
                  />
                  <div className="flex items-center gap-2">
                    <MailX className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="skip-email" className="text-sm font-medium cursor-pointer">
                      Skip Email Dispatch
                    </Label>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">Save record only, no email sent</span>
                </div>

                {!skipEmail && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipient Email</Label>
                      <Input
                        type="email"
                        placeholder="recipient@example.com"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        className="h-11 rounded-[10px] border-0 bg-[#F1F5F9] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#0056D2] focus-visible:ring-offset-0 transition-all"
                      />
                    </div>

                    {wireDetails && (
                      <div className="rounded-xl border bg-[#F1F5F9] p-4 text-sm space-y-1">
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
                  </>
                )}

                {skipEmail ? (
                  <button
                    onClick={handleSaveOnly}
                    disabled={createRecord.isPending}
                    className="w-full h-12 rounded-[10px] text-sm font-semibold text-white transition-all disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, #00245D 0%, #0056D2 100%)',
                      boxShadow: '0 2px 8px rgba(0, 86, 210, 0.25)',
                    }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4" />
                      Save to Dashboard
                    </span>
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveOnly}
                      disabled={createRecord.isPending}
                      className="flex-1 h-12 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-60 border-2"
                      style={{
                        borderColor: '#0056D2',
                        color: '#0056D2',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4" />
                        Save to Dashboard
                      </span>
                    </button>
                    <button
                      onClick={handlePreviewOrSend}
                      disabled={createRecord.isPending}
                      className="flex-1 h-12 rounded-[10px] text-sm font-semibold text-white transition-all disabled:opacity-60"
                      style={{
                        background: testMode ? '#475569' : 'linear-gradient(135deg, #00245D 0%, #0056D2 100%)',
                        boxShadow: testMode ? 'none' : '0 2px 8px rgba(0, 86, 210, 0.25)',
                      }}
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
                  </div>
                )}
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
                <div className="rounded-lg border bg-[#F1F5F9] p-4 space-y-2 text-sm">
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
                    <span className="font-bold font-mono" style={{ color: '#00245D' }}>{lastSentData.tid}</span>
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
                  className="w-full h-11 rounded-[10px] text-sm font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #00245D 0%, #0056D2 100%)' }}
                  onClick={handleSuccessClose}
                >
                  Go to Dashboard
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
      <p className={`mt-0.5 text-sm font-medium ${highlight ? "text-foreground font-bold" : "text-foreground"}`} style={highlight ? { color: '#0056D2' } : undefined}>
        {value}
      </p>
    </div>
  );
}

function ManualField({ label, value, onChange, placeholder = "", type = "text", highlight }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className={`text-xs ${highlight ? "font-semibold" : ""} text-muted-foreground`}>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-9 rounded-[10px] border-0 bg-[#F1F5F9] text-sm focus:bg-white focus-visible:ring-2 focus-visible:ring-[#0056D2] focus-visible:ring-offset-0 transition-all ${highlight ? "ring-1 ring-[#0056D2]/30" : ""}`}
      />
    </div>
  );
}
