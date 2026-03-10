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
        .select("*, profiles:created_by(display_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        created_by_name: r.profiles?.display_name ?? null,
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
