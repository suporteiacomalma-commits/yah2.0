-- Enable pgcrypto if not already enabled, required for gen_salt and crypt
-- We try to enable it in the extensions schema, but if it exists elsewhere, that's fine too.
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Update the function to include extensions in search_path and fix potentially missing dependencies
CREATE OR REPLACE FUNCTION public.admin_update_user_auth(
  target_user_id UUID,
  new_email TEXT DEFAULT NULL,
  new_password TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- 1. Check if the caller is an admin
  -- Explicitly cast string to app_role enum to avoid ambiguity
  IF NOT (SELECT public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem realizar esta ação.';
  END IF;

  -- 2. Update email if provided
  IF new_email IS NOT NULL AND new_email <> '' THEN
    UPDATE auth.users
    SET email = new_email,
        email_confirmed_at = NOW()
    WHERE id = target_user_id;

    -- Update linked profile email for consistency
    UPDATE public.profiles
    SET email = new_email
    WHERE user_id = target_user_id;
  END IF;

  -- 3. Update password if provided
  IF new_password IS NOT NULL AND new_password <> '' THEN
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION public.admin_update_user_auth(UUID, TEXT, TEXT) TO authenticated;
