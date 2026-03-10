
ALTER TABLE public.wire_records DROP CONSTRAINT IF EXISTS wire_records_status_check;
ALTER TABLE public.wire_records ADD CONSTRAINT wire_records_status_check CHECK (status IN ('Pending', 'Sent', 'Received', 'Reconciled', 'Other - See Notes'));
