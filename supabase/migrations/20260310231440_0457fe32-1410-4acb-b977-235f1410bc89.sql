ALTER TABLE public.wire_records ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.wire_records ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;