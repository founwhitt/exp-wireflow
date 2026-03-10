
-- 1. Add created_by to wire_records
ALTER TABLE public.wire_records ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 2. Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wire_id uuid REFERENCES public.wire_records(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 3. Create wire_audit_log table
CREATE TABLE public.wire_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wire_id uuid NOT NULL REFERENCES public.wire_records(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wire_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit logs" ON public.wire_audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert audit logs" ON public.wire_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Trigger: notify created_by when status changes to 'Received'
CREATE OR REPLACE FUNCTION public.notify_on_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Received' AND (OLD.status IS DISTINCT FROM 'Received') AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, wire_id, message)
    VALUES (
      NEW.created_by,
      NEW.id,
      'Wire ' || NEW.tid || ' has been marked as Received.'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_received
  AFTER UPDATE ON public.wire_records
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_received();

-- 5. Trigger: audit log for tid and adjustments changes
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_wire_changes
  BEFORE UPDATE ON public.wire_records
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_wire_changes();

-- 6. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
