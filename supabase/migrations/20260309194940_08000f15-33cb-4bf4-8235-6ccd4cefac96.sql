
-- Create custom wire instructions table
CREATE TABLE public.custom_wire_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_name text NOT NULL,
  bank_address text NOT NULL,
  account_name text NOT NULL,
  account_holder_address text NOT NULL,
  routing_number text NOT NULL,
  account_number text NOT NULL,
  confirmation_phone text,
  pdf_path text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_wire_instructions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (needed for NewWire page)
CREATE POLICY "Authenticated users can view custom wire instructions"
  ON public.custom_wire_instructions FOR SELECT TO authenticated
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert custom wire instructions"
  ON public.custom_wire_instructions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update custom wire instructions"
  ON public.custom_wire_instructions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete custom wire instructions"
  ON public.custom_wire_instructions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_custom_wire_instructions_updated_at
  BEFORE UPDATE ON public.custom_wire_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for wire instruction PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('wire-instructions', 'wire-instructions', true);

-- Storage policies
CREATE POLICY "Anyone can read wire instruction files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wire-instructions');

CREATE POLICY "Admins can upload wire instruction files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wire-instructions' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete wire instruction files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'wire-instructions' AND public.has_role(auth.uid(), 'admin'));
