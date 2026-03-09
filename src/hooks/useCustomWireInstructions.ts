import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomWireInstruction {
  id: string;
  name: string;
  bank_name: string;
  bank_address: string;
  account_name: string;
  account_holder_address: string;
  routing_number: string;
  account_number: string;
  confirmation_phone: string | null;
  pdf_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomWireInstructions() {
  return useQuery({
    queryKey: ["custom_wire_instructions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_wire_instructions")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CustomWireInstruction[];
    },
  });
}

export function useCreateCustomWireInstruction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<CustomWireInstruction, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("custom_wire_instructions")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_wire_instructions"] }),
  });
}

export function useUpdateCustomWireInstruction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomWireInstruction> & { id: string }) => {
      const { data, error } = await supabase
        .from("custom_wire_instructions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_wire_instructions"] }),
  });
}

export function useDeleteCustomWireInstruction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_wire_instructions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_wire_instructions"] }),
  });
}

export async function uploadWireInstructionPDF(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("wire-instructions")
    .upload(fileName, file, { contentType: file.type });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from("wire-instructions")
    .getPublicUrl(fileName);
  return urlData.publicUrl;
}
