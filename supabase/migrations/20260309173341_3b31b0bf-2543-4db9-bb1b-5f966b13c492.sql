
-- Create wire_records table
CREATE TABLE public.wire_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Deal identification
  tid TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('Transactions', 'Solutions Hub', 'ASC')),
  wf_account TEXT NOT NULL CHECK (wf_account IN ('8022', '3694')),
  
  -- Financials
  invoice_number TEXT,
  invoice_date DATE,
  original_amount NUMERIC(12,2),
  balance_due NUMERIC(12,2),
  
  -- Identity
  customer_name TEXT,
  entity TEXT,
  customer_id_prefix TEXT,
  customer_id_suffix TEXT,
  
  -- Logistics
  property_address TEXT,
  transaction_state TEXT,
  agent_name TEXT,
  assigned_analyst TEXT,
  
  -- Notes from Task Center
  deal_notes TEXT,
  
  -- Post-send analyst fields
  wiring_institution TEXT,
  wiring_date DATE,
  adjustments NUMERIC(12,2) DEFAULT 0,
  adjustment_type TEXT CHECK (adjustment_type IS NULL OR adjustment_type IN ('Wire Fee', 'Stop Pay Fee', 'Other')),
  
  -- Accounting fields (Krystle's team)
  wire_receipt BOOLEAN DEFAULT FALSE,
  amount_wired NUMERIC(12,2),
  ar_date_received DATE,
  reconciliation_notes TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Wired', 'Received', 'Reconciled')),
  
  -- Email tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_recipient TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (permissive for now since no auth yet)
ALTER TABLE public.wire_records ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (no auth requirement yet)
CREATE POLICY "Allow all select" ON public.wire_records FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.wire_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.wire_records FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.wire_records FOR DELETE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wire_records_updated_at
  BEFORE UPDATE ON public.wire_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_wire_records_tid ON public.wire_records(tid);
CREATE INDEX idx_wire_records_status ON public.wire_records(status);
CREATE INDEX idx_wire_records_department ON public.wire_records(department);
CREATE INDEX idx_wire_records_created_at ON public.wire_records(created_at DESC);
