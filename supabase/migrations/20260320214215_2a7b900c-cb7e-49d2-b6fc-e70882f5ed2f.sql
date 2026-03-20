ALTER TABLE public.wire_records DROP CONSTRAINT wire_records_department_check;
ALTER TABLE public.wire_records ADD CONSTRAINT wire_records_department_check
  CHECK (department = ANY (ARRAY['Transactions','Solutions Hub','ASC','Payload']));

ALTER TABLE public.wire_records DROP CONSTRAINT wire_records_wf_account_check;
ALTER TABLE public.wire_records ADD CONSTRAINT wire_records_wf_account_check
  CHECK (wf_account = ANY (ARRAY['8022','3694','N/A']));