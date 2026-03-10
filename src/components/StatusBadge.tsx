import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WireStatus = "Pending" | "Sent" | "Received" | "Reconciled" | "Other - See Notes";

const statusStyles: Record<WireStatus, string> = {
  Pending: "bg-amber-100 text-amber-800 border-amber-300 border-l-4 border-l-amber-500",
  Sent: "bg-blue-100 text-blue-800 border-blue-200",
  Received: "bg-emerald-100 text-emerald-900 border-emerald-300",
  Reconciled: "bg-emerald-900 text-emerald-50 border-emerald-950",
  "Other - See Notes": "bg-rose-100 text-rose-800 border-rose-200",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as WireStatus;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", statusStyles[s] ?? "")}>
      {status}
    </Badge>
  );
}
