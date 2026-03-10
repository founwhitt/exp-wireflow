import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface AuditLogEntry {
  id: string;
  wire_id: string;
  changed_by: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  display_name?: string | null;
}

export function useAuditLog(wireId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!wireId) return;
    const channel = supabase
      .channel(`audit-${wireId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wire_audit_log", filter: `wire_id=eq.${wireId}` },
        () => qc.invalidateQueries({ queryKey: ["audit_log", wireId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wireId, qc]);

  return useQuery({
    queryKey: ["audit_log", wireId],
    enabled: !!wireId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wire_audit_log")
        .select("*")
        .eq("wire_id", wireId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((d: any) => d.changed_by).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.display_name]));
      }

      return (data ?? []).map((entry: any) => ({
        ...entry,
        display_name: profileMap[entry.changed_by] ?? null,
      })) as AuditLogEntry[];
    },
  });
}
