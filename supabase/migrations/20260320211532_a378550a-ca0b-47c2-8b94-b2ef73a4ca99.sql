
-- Create ow_config table for dynamic accounts and statuses
CREATE TABLE public.ow_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type text NOT NULL CHECK (config_type IN ('account', 'status')),
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (config_type, value)
);

-- Enable RLS
ALTER TABLE public.ow_config ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can view ow_config"
  ON public.ow_config FOR SELECT TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert ow_config"
  ON public.ow_config FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ow_config"
  ON public.ow_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ow_config"
  ON public.ow_config FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed accounts
INSERT INTO public.ow_config (config_type, value, label, sort_order) VALUES
  ('account', 'WF-8022', 'Wells Fargo — XXXX-8022', 1),
  ('account', 'WF-3694', 'Wells Fargo — XXXX-3694', 2),
  ('account', 'WF-9691', 'Wells Fargo — XXXX-9691', 3);

-- Seed statuses
INSERT INTO public.ow_config (config_type, value, label, sort_order) VALUES
  ('status', 'Needs TRX ID', 'Needs TRX ID', 1),
  ('status', 'Waiting on Settlement', 'Waiting on Settlement', 2);
