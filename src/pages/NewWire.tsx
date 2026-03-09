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
import { Send, Search, Building2, FileText, MapPin, User, DollarSign, AlertCircle, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { lookupTID, type TIDData } from "@/lib/mock-data";
import { type Department, DEPARTMENTS, getWFAccount } from "@/lib/department-config";
import { getWireInstructions, formatEmailBody, type WireInstructionDetails } from "@/lib/wire-instructions";
import { useCreateWireRecord } from "@/hooks/useWireRecords";
import { useCustomWireInstructions, type CustomWireInstruction } from "@/hooks/useCustomWireInstructions";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";

export default function NewWire() {
  const navigate = useNavigate();
  const createRecord = useCreateWireRecord();
  const { data: customInstructions } = useCustomWireInstructions();
  const [department, setDepartment] = useState<Department | "">("");
  const [tid, setTid] = useState("");
  const [tidData, setTidData] = useState<TIDData | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCustomId, setSelectedCustomId] = useState("");

  const handleLookup = () => {
    setLookupError("");
    if (!tid.trim()) {
      setLookupError("Please enter a TID");
      return;
    }
    const data = lookupTID(tid);
    if (!data) {
      setLookupError(`No record found for "${tid}". Try: TID-10001, TID-10002, or TID-10003`);
      setTidData(null);
      return;
    }
    setTidData(data);
    toast.success("Deal data loaded successfully");
  };

  const wfAccount = department ? getWFAccount(department as Department) : null;
  const isCustom = wfAccount === "custom";

  const selectedCustom = isCustom
    ? customInstructions?.find((c) => c.id === selectedCustomId) ?? null
    : null;

  // Build wireDetails from either built-in or custom
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
      await createRecord.mutateAsync({
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
        status: "Pending",
      });

      setShowPreview(false);

      if (testMode) {
        toast.success("Test record saved successfully!", {
          description: `Mock record created for ${tid.toUpperCase()}. No email was sent.`,
        });
      } else {
        toast.success("Wire instructions sent and record created!", {
          description: `Sent to ${emailRecipient} with ${wireDetails?.accountLabel} instructions.`,
        });
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Failed to create wire record", { description: err.message });
    }
  };

  const canDispatch = tidData && department && (!isCustom || selectedCustom) && wireDetails;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">New Wire Instructions</h1>
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

      {/* Step 1: Department + TID */}
      <Card>
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
                <Input
                  placeholder="e.g. TID-10001"
                  value={tid}
                  onChange={(e) => setTid(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                />
                <Button variant="secondary" onClick={handleLookup} className="shrink-0">
                  <Search className="mr-1 h-4 w-4" />
                  Lookup
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

      {/* Step 2: Deal Data */}
      {tidData && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Deal Data
            </CardTitle>
            <CardDescription>Auto-populated from Task Center. Review before sending.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" /> Financials
              </h4>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Invoice #" value={tidData.invoiceNumber} />
                <Field label="Invoice Date" value={tidData.invoiceDate} />
                <Field label="Original Amount" value={`$${tidData.originalAmount.toLocaleString()}`} />
                <Field label="Balance Due" value={`$${tidData.balanceDue.toLocaleString()}`} highlight />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Identity
              </h4>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Customer Name" value={tidData.customerName} />
                <Field label="Entity" value={tidData.entity} />
                <Field label="ID Prefix" value={tidData.customerIdPrefix} />
                <Field label="ID Suffix" value={tidData.customerIdSuffix} />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Logistics
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Property Address" value={tidData.propertyAddress} />
                <Field label="Transaction State" value={tidData.transactionState} />
                <Field label="Agent Name" value={tidData.agentName} />
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

      {/* Step 3: Send */}
      {canDispatch && (
        <Card className="border-primary/20">
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
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className={`mt-0.5 text-sm font-medium ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
