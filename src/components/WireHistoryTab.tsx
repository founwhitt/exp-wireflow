import { useAuditLog } from "@/hooks/useAuditLog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

export function WireHistoryTab({ wireId }: { wireId: string }) {
  const { data: logs, isLoading } = useAuditLog(wireId);

  if (isLoading) return <div className="space-y-3 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>;

  if (!logs?.length) return <p className="py-6 text-center text-sm text-muted-foreground">No changes recorded yet.</p>;

  return (
    <div className="space-y-2 py-3">
      {logs.map((entry) => (
        <div
          key={entry.id}
          className="rounded-lg border bg-muted/30 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
        >
          <p className="leading-relaxed">
            <span className="font-semibold text-foreground">{entry.display_name ?? "System"}</span>
            {" changed "}
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
              {entry.field_name}
            </span>
            {" from "}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="font-medium">{entry.old_value ?? "—"}</span>
              <ArrowRight className="inline h-3 w-3 shrink-0 text-muted-foreground/60" />
              <span className="font-semibold text-foreground">{entry.new_value ?? "—"}</span>
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {format(new Date(entry.changed_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      ))}
    </div>
  );
}
