ALTER TABLE public.outstanding_wires 
ADD COLUMN IF NOT EXISTS agent_name text,
ADD COLUMN IF NOT EXISTS property_address text,
ADD COLUMN IF NOT EXISTS office_location text;