import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type WireRecord = Tables<"wire_records">;
export type WireRecordInsert = TablesInsert<"wire_records">;
export type WireRecordUpdate = TablesUpdate<"wire_records">;

export function useWireRecords() {
  return useQuery({
    queryKey: ["wire_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wire_records")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Resolve created_by UUIDs to display names via profiles
      const userIds = [...new Set((data ?? []).map((r) => r.created_by).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]));
      }

      return (data ?? []).map((r) => ({
        ...r,
        created_by_name: r.created_by ? (nameMap[r.created_by] ?? null) : null,
      })) as (WireRecord & { created_by_name: string | null })[];
    },
  });
}

export function useCreateWireRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: WireRecordInsert) => {
      const { data, error } = await supabase
        .from("wire_records")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wire_records"] }),
  });
}

export function useUpdateWireRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: WireRecordUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("wire_records")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wire_records"] }),
  });
}

export function useSoftDeleteWireRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // First insert audit log entry
      const { error: auditError } = await supabase
        .from("wire_audit_log")
        .insert({
          wire_id: id,
          changed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          field_name: "is_deleted",
          old_value: "false",
          new_value: "true",
        });
      if (auditError) throw auditError;

      const { data, error } = await supabase
        .from("wire_records")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wire_records"] }),
  });
}
