import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WireStatus = "Pending" | "Sent" | "Received" | "Reconciled" | "Other - See Notes";

const statusStyles: Record<WireStatus, string> = {
  Pending: "bg-status-pending/15 text-warning-foreground border-status-pending/30",
  Sent: "bg-status-sent/10 text-secondary border-status-sent/25",
  Received: "bg-status-received/10 text-success border-status-received/25",
  Reconciled: "bg-status-reconciled/10 text-success border-status-reconciled/25",
  "Other - See Notes": "bg-destructive/10 text-destructive border-destructive/25",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as WireStatus;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", statusStyles[s] ?? "")}>
      {status}
    </Badge>
  );
}
