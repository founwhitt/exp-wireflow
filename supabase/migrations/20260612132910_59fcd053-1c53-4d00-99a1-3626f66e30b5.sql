
-- Helper: current user's department from profiles
CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_user_department() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_department() TO authenticated;

-- ===== wire_records =====
DROP POLICY IF EXISTS "Authenticated users can view wire records" ON public.wire_records;
CREATE POLICY "Users view wire records in their department"
ON public.wire_records
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'accounting'::app_role)
  OR department = public.current_user_department()
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can update own or admins can update any wire record" ON public.wire_records;
CREATE POLICY "Users update wire records in their department"
ON public.wire_records
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'accounting'::app_role)
  OR created_by = auth.uid()
  OR department = public.current_user_department()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'accounting'::app_role)
  OR created_by = auth.uid()
  OR department = public.current_user_department()
);

-- ===== wire_audit_log =====
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.wire_audit_log;
CREATE POLICY "Users view audit logs for their department wires"
ON public.wire_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'accounting'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.wire_records w
    WHERE w.id = wire_audit_log.wire_id
      AND (
        w.department = public.current_user_department()
        OR w.created_by = auth.uid()
      )
  )
);

-- ===== outstanding_wires =====
-- Uses `category` as the department tab.
DROP POLICY IF EXISTS "Authenticated users can view outstanding wires" ON public.outstanding_wires;
CREATE POLICY "Users view outstanding wires in their department"
ON public.outstanding_wires
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'accounting'::app_role)
  OR category = public.current_user_department()
);

DROP POLICY IF EXISTS "Accounting and admin can update outstanding wires" ON public.outstanding_wires;
CREATE POLICY "Users update outstanding wires in their department"
ON public.outstanding_wires
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'accounting'::app_role)
  OR category = public.current_user_department()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'accounting'::app_role)
  OR category = public.current_user_department()
);

-- INSERT and DELETE policies for outstanding_wires already restrict to accounting/admin; leave intact.
