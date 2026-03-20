import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OwConfigItem {
  id: string;
  config_type: "account" | "status";
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export function useOwConfig() {
  return useQuery({
    queryKey: ["ow_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ow_config")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as OwConfigItem[];
    },
  });
}

export function useOwAccounts() {
  const { data } = useOwConfig();
  return (data ?? []).filter((d) => d.config_type === "account" && d.is_active);
}

export function useOwStatuses() {
  const { data } = useOwConfig();
  return (data ?? []).filter((d) => d.config_type === "status" && d.is_active);
}

export function useCreateOwConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { config_type: string; value: string; label: string; sort_order: number }) => {
      const { data, error } = await supabase
        .from("ow_config")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ow_config"] }),
  });
}

export function useUpdateOwConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; value?: string; label?: string; sort_order?: number; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from("ow_config")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ow_config"] }),
  });
}

export function useDeleteOwConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ow_config")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ow_config"] }),
  });
}
