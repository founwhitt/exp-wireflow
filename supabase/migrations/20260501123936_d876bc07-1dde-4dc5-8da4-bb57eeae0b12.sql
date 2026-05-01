-- Enable RLS on realtime.messages and add topic-scoped subscription policies
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies we might have added previously (idempotent)
DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Users can subscribe to own notification topic" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can subscribe to wire audit topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can subscribe to outstanding wires topic" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can subscribe to allowed topics" ON realtime.messages;

-- Single SELECT policy gating channel subscriptions by topic
CREATE POLICY "Authenticated can subscribe to allowed topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Per-user notifications channel: must match the caller's own user id
  (
    realtime.topic() = 'notifications-realtime'
    AND EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = auth.uid()
    )
  )
  -- Per-wire audit log channels: only if the user can see that wire record
  OR (
    realtime.topic() LIKE 'audit-%'
    AND EXISTS (
      SELECT 1 FROM public.wire_records w
      WHERE w.id::text = substring(realtime.topic() from 7)
    )
  )
  -- Outstanding wires channel: any authenticated user (matches table SELECT policy)
  OR (
    realtime.topic() IN ('outstanding-wires', 'outstanding_wires')
  )
);
