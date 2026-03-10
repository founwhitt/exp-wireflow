import { Badge } from "@/components/ui/badge";

export function DepartmentBadge({ department, wfAccount }: { department: string; wfAccount: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground">{department}</span>
      <Badge variant="secondary" className="w-fit text-[10px] font-mono">
        WF {wfAccount}
      </Badge>
    </div>
  );
}
