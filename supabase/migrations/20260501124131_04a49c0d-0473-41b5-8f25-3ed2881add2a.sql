-- Add admin guard to push_feature_announcement
CREATE OR REPLACE FUNCTION public.push_feature_announcement(p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;
  INSERT INTO public.notifications (user_id, message, notification_type)
  SELECT p.id, p_message, 'feature_announcement'
  FROM public.profiles p;
END;
$function$;

-- Revoke broad EXECUTE on SECURITY DEFINER functions; grant only where needed.
-- Trigger functions don't need any role grants (triggers run as table owner).
REVOKE ALL ON FUNCTION public.notify_on_received() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_wire_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies — keep it callable by authenticated, revoke from anon/public.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- push_feature_announcement: only authenticated can call, and the body enforces admin
REVOKE ALL ON FUNCTION public.push_feature_announcement(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_feature_announcement(text) TO authenticated;
