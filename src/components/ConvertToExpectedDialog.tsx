import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateWireRecord } from "@/hooks/useWireRecords";
import { useDeleteOutstandingWire, type OutstandingWire } from "@/hooks/useOutstandingWires";
import { useAuth } from "@/hooks/useAuth";
import { type Department } from "@/lib/department-config";

interface ConvertToExpectedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wire: OutstandingWire | null;
}

export function ConvertToExpectedDialog({ open, onOpenChange, wire }: ConvertToExpectedDialogProps) {
  const createRecord = useCreateWireRecord();
  const deleteOW = useDeleteOutstandingWire();
  const { user } = useAuth();

  const [tid, setTid] = useState("");
  const [department, setDepartment] = useState<Department>("Transactions");
  const [customerName, setCustomerName] = useState("");
  const [dealNotes, setDealNotes] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && wire) {
      // Pre-fill from OW data
      setTid(wire.invoice_number || "");
      setCustomerName(wire.description || "");
      setDealNotes(wire.accounting_notes || "");
      // Infer department from account
      if (wire.wf_account?.includes("3694")) {
        setDepartment("ASC");
      } else if (wire.category === "payload") {
        setDepartment("Payload");
      } else {
        setDepartment("Transactions");
      }
    }
    onOpenChange(isOpen);
  };

  const handleConvert = async () => {
    if (!wire || !tid.trim()) {
      toast.error("TID is required");
      return;
    }

    setIsConverting(true);
    try {
      await createRecord.mutateAsync({
        tid: tid.trim().toUpperCase(),
        department,
        wf_account: wire.wf_account || "WF-8022",
        status: "Pending",
        balance_due: wire.amount,
        wiring_date: wire.wiring_date || null,
        customer_name: customerName || null,
        agent_name: wire.agent_name || null,
        property_address: wire.property_address || null,
        invoice_number: wire.invoice_number || null,
        transaction_notes: wire.trx_notes || null,
        deal_notes: dealNotes || null,
        created_by: user?.id || null,
      });

      // Delete the OW row since it's now converted
      await deleteOW.mutateAsync(wire.id);

      toast.success(`Converted to Expected Wire: ${tid.trim().toUpperCase()}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to convert", { description: err.message });
    } finally {
      setIsConverting(false);
    }
  };

  if (!wire) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Convert to Expected Wire
          </DialogTitle>
          <DialogDescription>
            Promote this outstanding wire to the Expected Wires dashboard. Bank-verified data will be carried over.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Source data summary */}
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <p className="font-medium text-foreground">Source Data (from Outstanding Wire)</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <span>Amount:</span>
              <span className="font-mono text-foreground">
                {wire.amount != null ? `$${Number(wire.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
              </span>
              <span>Date:</span>
              <span className="text-foreground">{wire.wiring_date || "—"}</span>
              <span>Receipt #:</span>
              <span className="text-foreground">{wire.receipt_number || "—"}</span>
              <span>Account:</span>
              <span className="text-foreground">{wire.wf_account}</span>
              {wire.agent_name && (<><span>Agent:</span><span className="text-foreground">{wire.agent_name}</span></>)}
              {wire.property_address && (<><span>Address:</span><span className="text-foreground">{wire.property_address}</span></>)}
            </div>
          </div>

          {/* Required fields */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="convert-tid" className="text-sm font-medium">TID <span className="text-destructive">*</span></Label>
              <Input
                id="convert-tid"
                placeholder="e.g. TID-10001"
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="convert-dept" className="text-sm font-medium">Department</Label>
              <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transactions">Transactions</SelectItem>
                  <SelectItem value="ASC">ASC</SelectItem>
                  <SelectItem value="Payload">Payload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="convert-customer" className="text-sm font-medium">Customer Name</Label>
              <Input
                id="convert-customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="convert-notes" className="text-sm font-medium">Deal Notes</Label>
              <Textarea
                id="convert-notes"
                value={dealNotes}
                onChange={(e) => setDealNotes(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConverting}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isConverting || !tid.trim()}>
            {isConverting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
            Convert to Expected Wire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
