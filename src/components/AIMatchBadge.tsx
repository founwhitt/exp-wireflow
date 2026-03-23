import { type AIMatch } from "@/hooks/useAIMatching";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

interface AIMatchBadgeProps {
  match: AIMatch;
  onClick?: () => void;
}

export function AIMatchBadge({ match, onClick }: AIMatchBadgeProps) {
  const confidence = match.confidence;
  const colorClass =
    confidence >= 80
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30"
      : confidence >= 50
      ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30"
      : "text-muted-foreground bg-muted";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${colorClass}`}
          onClick={onClick}
        >
          <Sparkles className="h-3 w-3" />
          {match.expected_wire_tid} ({confidence}%)
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm font-medium">AI Suggested Match</p>
        <p className="text-xs text-muted-foreground">{match.reason}</p>
      </TooltipContent>
    </Tooltip>
  );
}
