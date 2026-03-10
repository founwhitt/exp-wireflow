import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WireHistoryTab } from "@/components/WireHistoryTab";
import type { WireRecord } from "@/hooks/useWireRecords";
import { StatusBadge } from "@/components/StatusBadge";
import { DepartmentBadge } from "@/components/DepartmentBadge";

interface Props {
  record: WireRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WireDetailDialog({ record, open, onOpenChange }: Props) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{record.tid}</span>
            <StatusBadge status={record.status} />
            <DepartmentBadge department={record.department} wfAccount={record.wf_account} />
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <div className="grid grid-cols-2 gap-3 py-3 text-sm">
              <Detail label="Customer" value={record.customer_name} />
              <Detail label="Property" value={record.property_address} />
              <Detail label="Agent" value={record.agent_name} />
              <Detail label="Balance Due" value={record.balance_due != null ? `$${Number(record.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"} />
              <Detail label="Adjustments" value={record.adjustments?.toString() ?? "0"} />
              <Detail label="Status" value={record.status} />
              <Detail label="Wiring Date" value={record.wiring_date ?? "—"} />
              <Detail label="Amount Wired" value={record.amount_wired != null ? `$${Number(record.amount_wired).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"} />
            </div>
            {record.transaction_notes && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <span className="font-medium">Deal Notes: </span>{record.transaction_notes}
              </div>
            )}
          </TabsContent>
          <TabsContent value="history">
            <WireHistoryTab wireId={record.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
