-- Add phase tracking fields to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS current_phase INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS phases_completed INTEGER[] NOT NULL DEFAULT '{}';

-- Add constraint for phase range
ALTER TABLE public.brands 
ADD CONSTRAINT valid_phase_range CHECK (current_phase >= 1 AND current_phase <= 11);