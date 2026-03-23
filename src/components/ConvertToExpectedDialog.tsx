import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateWireRecord } from "@/hooks/useWireRecords";
import { useDeleteOutstandingWire, type OutstandingWire } from "@/hooks/useOutstandingWires";
import { useAuth } from "@/hooks/useAuth";

interface ConvertToExpectedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wire: OutstandingWire | null;
}

function inferDepartment(wire: OutstandingWire): string {
  if (wire.wf_account?.includes("3694")) return "ASC";
  if (wire.category === "payload") return "Payload";
  return "Transactions";
}

export function ConvertToExpectedDialog({ open, onOpenChange, wire }: ConvertToExpectedDialogProps) {
  const createRecord = useCreateWireRecord();
  const deleteOW = useDeleteOutstandingWire();
  const { user } = useAuth();

  const [tid, setTid] = useState("");
  const [dealNotes, setDealNotes] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && wire) {
      setTid(wire.invoice_number || "");
      setDealNotes(wire.accounting_notes || "");
    }
    onOpenChange(isOpen);
  };

  const handleConvert = async () => {
    if (!wire) return;

    setIsConverting(true);
    try {
      await createRecord.mutateAsync({
        tid: tid.trim().toUpperCase() || `OW-${wire.id.slice(0, 8).toUpperCase()}`,
        department: inferDepartment(wire),
        wf_account: wire.wf_account || "WF-8022",
        status: "Pending",
        balance_due: wire.amount,
        wiring_date: wire.wiring_date || null,
        customer_name: wire.description || null,
        agent_name: wire.agent_name || null,
        property_address: wire.property_address || null,
        invoice_number: wire.invoice_number || null,
        transaction_notes: wire.trx_notes || null,
        deal_notes: dealNotes || null,
        created_by: user?.id || null,
      });

      await deleteOW.mutateAsync(wire.id);

      toast.success(`Converted to Expected Wire${tid.trim() ? `: ${tid.trim().toUpperCase()}` : ""}`);
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
            Promote this outstanding wire to the Expected Wires dashboard. All matching data will be carried over automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Auto-matched data summary */}
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <p className="font-medium text-foreground">Auto-Matched Data</p>
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
              <span>Department:</span>
              <span className="text-foreground">{inferDepartment(wire)}</span>
              <span>Customer:</span>
              <span className="text-foreground">{wire.description || "—"}</span>
              {wire.agent_name && (<><span>Agent:</span><span className="text-foreground">{wire.agent_name}</span></>)}
              {wire.property_address && (<><span>Address:</span><span className="text-foreground">{wire.property_address}</span></>)}
            </div>
          </div>

          {/* Optional fields only */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="convert-tid" className="text-sm font-medium">TID <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="convert-tid"
                placeholder="e.g. TID-10001 — leave blank to auto-generate"
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="convert-notes" className="text-sm font-medium">Deal Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="convert-notes"
                value={dealNotes}
                onChange={(e) => setDealNotes(e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Any additional notes..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConverting}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isConverting}>
            {isConverting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
            Convert to Expected Wire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
