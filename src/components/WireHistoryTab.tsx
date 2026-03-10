import { useAuditLog } from "@/hooks/useAuditLog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function WireHistoryTab({ wireId }: { wireId: string }) {
  const { data: logs, isLoading } = useAuditLog(wireId);

  if (isLoading) return <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;

  if (!logs?.length) return <p className="py-6 text-center text-sm text-muted-foreground">No changes recorded yet.</p>;

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Timestamp</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">User</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Field</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Old Value</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">New Value</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((entry) => (
            <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {format(new Date(entry.changed_at), "MMM d, yyyy h:mm a")}
              </td>
              <td className="px-3 py-2 font-medium">{entry.display_name ?? "System"}</td>
              <td className="px-3 py-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                  {entry.field_name}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{entry.old_value ?? "—"}</td>
              <td className="px-3 py-2 font-medium">{entry.new_value ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
