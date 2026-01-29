-- Add extra_infos column to brands table to store dynamic user content
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS extra_infos JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.brands.extra_infos IS 'Array of additional information cards added by the user in the Personality Notebook';
