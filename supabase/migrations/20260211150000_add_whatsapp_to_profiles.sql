-- Add whatsapp column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Update handle_new_user function to include whatsapp from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, whatsapp)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'whatsapp'
  );
  RETURN new;
END;
$$;
