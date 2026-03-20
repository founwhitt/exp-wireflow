import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 border-amber-300 border-l-4 border-l-amber-500",
  Sent: "bg-blue-100 text-blue-800 border-blue-200",
  Received: "bg-emerald-100 text-emerald-900 border-emerald-300",
  Reconciled: "bg-emerald-900 text-emerald-50 border-emerald-950",
  "Other - See Notes": "bg-rose-100 text-rose-800 border-rose-200",
  "Needs TRX ID": "bg-orange-100 text-orange-800 border-orange-300 border-l-4 border-l-orange-500",
  "Waiting on Settlement": "bg-violet-100 text-violet-800 border-violet-300 border-l-4 border-l-violet-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium whitespace-nowrap", statusStyles[status] ?? "")}>
      {status}
    </Badge>
  );
}
