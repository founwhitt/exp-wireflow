
-- Independent table for Outstanding Wires (decoupled from wire_records)
CREATE TABLE public.outstanding_wires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'Needs TRX ID',
  wf_account text NOT NULL DEFAULT 'WF-8022',
  wiring_date date,
  amount numeric,
  receipt_number text,
  invoice_number text,
  description text,
  accounting_notes text,
  trx_notes text,
  category text NOT NULL DEFAULT 'realty',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outstanding_wires ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can view outstanding wires"
  ON public.outstanding_wires FOR SELECT TO authenticated
  USING (true);

-- Accounting and admin can insert
CREATE POLICY "Accounting and admin can insert outstanding wires"
  ON public.outstanding_wires FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'accounting') OR public.has_role(auth.uid(), 'admin')
  );

-- Accounting and admin can update all columns; regular users handled at app level
CREATE POLICY "Authenticated users can update outstanding wires"
  ON public.outstanding_wires FOR UPDATE TO authenticated
  USING (true);

-- Accounting and admin can delete
CREATE POLICY "Accounting and admin can delete outstanding wires"
  ON public.outstanding_wires FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'accounting') OR public.has_role(auth.uid(), 'admin')
  );

-- Auto-update updated_at
CREATE TRIGGER update_outstanding_wires_updated_at
  BEFORE UPDATE ON public.outstanding_wires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.outstanding_wires;
