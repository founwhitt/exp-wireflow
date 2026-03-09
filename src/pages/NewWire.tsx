import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Search, Building2, FileText, MapPin, User, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { lookupTID, type TIDData } from "@/lib/mock-data";
import { type Department, DEPARTMENTS, getWFAccount } from "@/lib/department-config";
import { useCreateWireRecord } from "@/hooks/useWireRecords";

export default function NewWire() {
  const navigate = useNavigate();
  const createRecord = useCreateWireRecord();
  const [department, setDepartment] = useState<Department | "">("");
  const [tid, setTid] = useState("");
  const [tidData, setTidData] = useState<TIDData | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [lookupError, setLookupError] = useState("");

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

  const handleSend = async () => {
    if (!department || !tidData) {
      toast.error("Please select a department and look up a TID first");
      return;
    }
    if (!emailRecipient.trim()) {
      toast.error("Please enter an email recipient");
      return;
    }

    const wfAccount = getWFAccount(department as Department);

    try {
      await createRecord.mutateAsync({
        tid: tid.toUpperCase().trim(),
        department,
        wf_account: wfAccount,
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
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        email_recipient: emailRecipient,
        status: "Pending",
      });

      toast.success("Wire instructions sent and record created!", {
        description: `Sent to ${emailRecipient} with WF Account ${wfAccount} instructions.`,
      });
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Failed to create wire record", { description: err.message });
    }
  };

  const wfAccount = department ? getWFAccount(department as Department) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">New Wire Instructions</h1>
        <p className="text-sm text-muted-foreground">
          Select department, look up the TID, and dispatch wire instructions.
        </p>
      </div>

      {/* Step 1: Department + TID */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Department & TID Lookup
          </CardTitle>
          <CardDescription>Choose the department to determine the correct Wells Fargo account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
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
              {department && (
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
        </CardContent>
      </Card>

      {/* Step 2: Deal Data (populated from TID lookup) */}
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
            {/* Financials */}
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

            {/* Identity */}
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

            {/* Logistics */}
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

            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm text-foreground">{tidData.dealNotes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Send */}
      {tidData && department && (
        <Card className="border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-primary" />
              Dispatch Wire Instructions
            </CardTitle>
            <CardDescription>
              Email will include TID, property address, agent name, fee disclosure, and the{" "}
              <span className="font-semibold text-foreground">
                {DEPARTMENTS[department as Department].accountLabel}
              </span>{" "}
              PDF attachment.
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

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <strong>Fee Disclosure:</strong> All bank fees (wire transfer fees) are to be paid by the
              Originator (remitter). This will be included in the email body.
            </div>

            <Button
              size="lg"
              onClick={handleSend}
              disabled={createRecord.isPending}
              className="w-full"
            >
              {createRecord.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Wire Instructions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
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
