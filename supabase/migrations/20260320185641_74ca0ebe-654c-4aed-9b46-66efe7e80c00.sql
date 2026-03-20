
-- Add highlight_color column to outstanding_wires
ALTER TABLE public.outstanding_wires ADD COLUMN highlight_color text DEFAULT NULL;

-- Change default status from 'Needs TRX ID' to empty string
ALTER TABLE public.outstanding_wires ALTER COLUMN status SET DEFAULT '';
