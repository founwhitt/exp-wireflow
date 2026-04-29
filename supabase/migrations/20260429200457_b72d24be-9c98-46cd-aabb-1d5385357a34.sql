
-- wire_records: restrict insert/update to ownership (or admin for update)
DROP POLICY IF EXISTS "Authenticated users can insert wire records" ON public.wire_records;
DROP POLICY IF EXISTS "Authenticated users can update wire records" ON public.wire_records;

CREATE POLICY "Users can insert their own wire records"
  ON public.wire_records FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own or admins can update any wire record"
  ON public.wire_records FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accounting'::app_role));

-- wire_audit_log: only the acting user can insert their own audit entries
DROP POLICY IF EXISTS "System can insert audit logs" ON public.wire_audit_log;

CREATE POLICY "Users can insert their own audit entries"
  ON public.wire_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());
