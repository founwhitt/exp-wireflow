import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WireStatus = "Pending" | "Sent" | "Received" | "Reconciled" | "Other - See Notes";

const statusStyles: Record<WireStatus, string> = {
  Pending: "bg-status-pending/15 text-warning-foreground border-status-pending/30",
  Sent: "bg-status-sent/10 text-secondary border-status-sent/25",
  Received: "bg-[hsl(160_60%_45%)] text-white border-[hsl(160_60%_40%)]",
  Reconciled: "bg-[hsl(166_72%_15%)] text-white border-[hsl(166_72%_12%)]",
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
