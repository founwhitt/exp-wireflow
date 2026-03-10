import { useAuditLog } from "@/hooks/useAuditLog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export function WireHistoryTab({ wireId }: { wireId: string }) {
  const { data: logs, isLoading } = useAuditLog(wireId);

  if (isLoading) return <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;

  if (!logs?.length) return <p className="py-6 text-center text-sm text-muted-foreground">No changes recorded yet.</p>;

  return (
    <div className="divide-y">
      {logs.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">{entry.display_name ?? "System"}</span>
              {" changed "}
              <span className="font-mono text-xs font-semibold text-primary">{entry.field_name}</span>
              {" from "}
              <span className="text-muted-foreground">{entry.old_value ?? "—"}</span>
              {" → "}
              <span className="font-medium">{entry.new_value ?? "—"}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
