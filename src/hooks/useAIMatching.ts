import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AIMatch {
  outstanding_wire_id: string;
  expected_wire_id: string;
  expected_wire_tid: string;
  confidence: number;
  reason: string;
}

export function useAIMatching() {
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const findMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-match-wires");
      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const found = data?.matches ?? [];
      setMatches(found);
      if (found.length === 0) {
        toast.info("No potential matches found");
      } else {
        toast.success(`Found ${found.length} potential match${found.length > 1 ? "es" : ""}`);
      }
    } catch (err: any) {
      toast.error("AI matching failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMatches = useCallback(() => setMatches([]), []);

  const getMatchForWire = useCallback(
    (owId: string) => matches.find((m) => m.outstanding_wire_id === owId) ?? null,
    [matches]
  );

  return { matches, isLoading, findMatches, clearMatches, getMatchForWire };
}
