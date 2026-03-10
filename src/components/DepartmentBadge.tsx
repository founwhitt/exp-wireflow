import { Badge } from "@/components/ui/badge";

export function DepartmentBadge({ department, wfAccount }: { department: string; wfAccount: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-foreground">{department}</span>
      <Badge variant="outline" className="rounded-full bg-muted px-2 py-0 text-[10px] font-mono font-semibold text-primary border-border">
        {wfAccount}
      </Badge>
    </div>
  );
}
