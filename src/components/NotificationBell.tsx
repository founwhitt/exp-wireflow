import { Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { data: notifications, markRead, markAllRead } = useNotifications();
  const count = notifications?.length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-72 overflow-auto">
          {count === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No unread notifications</p>
          ) : (
            notifications?.map((n) => {
              const isFeature = n.notification_type === "feature_announcement";
              return (
                <button
                  key={n.id}
                  className={`flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 last:border-b-0 ${isFeature ? "bg-primary/5" : ""}`}
                  onClick={() => markRead.mutate(n.id)}
                >
                  <span className="flex items-center gap-1.5 text-sm">
                    {isFeature && <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    {n.message}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isFeature && <span className="font-medium text-primary mr-1">New Feature</span>}
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
