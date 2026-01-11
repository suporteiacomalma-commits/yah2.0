-- Add onboarding fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_name text,
ADD COLUMN IF NOT EXISTS business_stage text,
ADD COLUMN IF NOT EXISTS main_goal text;