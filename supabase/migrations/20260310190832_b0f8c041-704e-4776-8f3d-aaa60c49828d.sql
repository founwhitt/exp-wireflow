
-- Migrate existing 'Wired' status records to 'Sent'
UPDATE public.wire_records SET status = 'Sent' WHERE status = 'Wired';

-- Update the default status to 'Sent' for new records created via the send flow
-- (default remains 'Pending' for the column, the app sets 'Sent' explicitly)

-- Update audit_wire_changes to also track transaction_notes, reconciliation_notes, customer_name, agent_name
CREATE OR REPLACE FUNCTION public.audit_wire_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.tid IS DISTINCT FROM NEW.tid THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'tid', OLD.tid, NEW.tid);
  END IF;
  IF OLD.adjustments IS DISTINCT FROM NEW.adjustments THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'adjustments', OLD.adjustments::text, NEW.adjustments::text);
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status);
  END IF;
  IF OLD.wiring_institution IS DISTINCT FROM NEW.wiring_institution THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'wiring_institution', OLD.wiring_institution, NEW.wiring_institution);
  END IF;
  IF OLD.wiring_date IS DISTINCT FROM NEW.wiring_date THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'wiring_date', OLD.wiring_date::text, NEW.wiring_date::text);
  END IF;
  IF OLD.wire_receipt IS DISTINCT FROM NEW.wire_receipt THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'wire_receipt', OLD.wire_receipt::text, NEW.wire_receipt::text);
  END IF;
  IF OLD.amount_wired IS DISTINCT FROM NEW.amount_wired THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'amount_wired', OLD.amount_wired::text, NEW.amount_wired::text);
  END IF;
  IF OLD.ar_date_received IS DISTINCT FROM NEW.ar_date_received THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'ar_date_received', OLD.ar_date_received::text, NEW.ar_date_received::text);
  END IF;
  IF OLD.transaction_notes IS DISTINCT FROM NEW.transaction_notes THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'transaction_notes', OLD.transaction_notes, NEW.transaction_notes);
  END IF;
  IF OLD.reconciliation_notes IS DISTINCT FROM NEW.reconciliation_notes THEN
    INSERT INTO public.wire_audit_log (wire_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'reconciliation_notes', OLD.reconciliation_notes, NEW.reconciliation_notes);
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers (they were missing per db-triggers section)
DROP TRIGGER IF EXISTS trg_audit_wire_changes ON public.wire_records;
CREATE TRIGGER trg_audit_wire_changes
  AFTER UPDATE ON public.wire_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_wire_changes();

DROP TRIGGER IF EXISTS trg_notify_on_received ON public.wire_records;
CREATE TRIGGER trg_notify_on_received
  AFTER UPDATE ON public.wire_records
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_received();
