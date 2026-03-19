
-- Update the notify_on_received trigger function to also fire on Reconciled
CREATE OR REPLACE FUNCTION public.notify_on_received()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.status IN ('Received', 'Reconciled'))
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, wire_id, message)
    VALUES (
      NEW.created_by,
      NEW.id,
      'Wire ' || NEW.tid || ' has been marked as ' || NEW.status || '.'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Add a notification_type column to notifications for feature announcements
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_type text NOT NULL DEFAULT 'wire_update';

-- RPC to push a feature announcement to all users
CREATE OR REPLACE FUNCTION public.push_feature_announcement(p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, message, notification_type)
  SELECT p.id, p_message, 'feature_announcement'
  FROM public.profiles p;
END;
$function$;
