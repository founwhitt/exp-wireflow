import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OutstandingWire {
  id: string;
  status: string;
  wf_account: string;
  wiring_date: string | null;
  amount: number | null;
  receipt_number: string | null;
  invoice_number: string | null;
  description: string | null;
  accounting_notes: string | null;
  trx_notes: string | null;
  agent_name: string | null;
  property_address: string | null;
  office_location: string | null;
  category: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  highlight_color: string | null;
}

export type OutstandingWireInsert = Omit<OutstandingWire, "id" | "created_at" | "updated_at" | "highlight_color" | "agent_name" | "property_address" | "office_location"> & { agent_name?: string | null; property_address?: string | null; office_location?: string | null };

export function useOutstandingWires() {
  return useQuery({
    queryKey: ["outstanding_wires"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outstanding_wires")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OutstandingWire[];
    },
  });
}

export function useCreateOutstandingWires() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: OutstandingWireInsert[]) => {
      const { data, error } = await supabase
        .from("outstanding_wires")
        .insert(records)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outstanding_wires"] }),
  });
}

export function useUpdateOutstandingWire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OutstandingWire> & { id: string }) => {
      const { data, error } = await supabase
        .from("outstanding_wires")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outstanding_wires"] }),
  });
}

export function useDeleteOutstandingWire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("outstanding_wires")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outstanding_wires"] }),
  });
}
