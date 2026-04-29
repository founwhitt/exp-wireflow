
-- 1. Lock down wire_records: drop public policies, add authenticated-only
DROP POLICY IF EXISTS "Allow all select" ON public.wire_records;
DROP POLICY IF EXISTS "Allow all insert" ON public.wire_records;
DROP POLICY IF EXISTS "Allow all update" ON public.wire_records;
DROP POLICY IF EXISTS "Allow all delete" ON public.wire_records;

CREATE POLICY "Authenticated users can view wire records"
  ON public.wire_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert wire records"
  ON public.wire_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update wire records"
  ON public.wire_records FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete wire records"
  ON public.wire_records FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Restrict outstanding_wires UPDATE to accounting/admin
DROP POLICY IF EXISTS "Authenticated users can update outstanding wires" ON public.outstanding_wires;

CREATE POLICY "Accounting and admin can update outstanding wires"
  ON public.outstanding_wires FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'accounting'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Make wire-instructions bucket private and restrict access
UPDATE storage.buckets SET public = false WHERE id = 'wire-instructions';

DROP POLICY IF EXISTS "Public access to wire instructions" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view wire instructions" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view wire instructions" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload wire instructions" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update wire instructions" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete wire instructions" ON storage.objects;

CREATE POLICY "Authenticated can view wire instructions"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'wire-instructions');

CREATE POLICY "Admins can upload wire instructions"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'wire-instructions' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update wire instructions"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'wire-instructions' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete wire instructions"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'wire-instructions' AND public.has_role(auth.uid(), 'admin'::app_role));
