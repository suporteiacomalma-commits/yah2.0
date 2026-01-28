-- Create a SECURITY DEFINER function to allow admins to update user auth info (email/password)
-- This is necessary because the client-side SDK cannot update another user's password/email directly.

CREATE OR REPLACE FUNCTION public.admin_update_user_auth(
  target_user_id UUID,
  new_email TEXT DEFAULT NULL,
  new_password TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Check if the caller is an admin
  -- We assume public.has_role is already defined from previous migrations
  IF NOT (SELECT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem realizar esta ação.';
  END IF;

  -- 2. Update email if provided
  IF new_email IS NOT NULL AND new_email <> '' THEN
    UPDATE auth.users
    SET email = new_email,
        email_confirmed_at = NOW() -- Admin-set emails are treated as confirmed
    WHERE id = target_user_id;

    -- Update linked profile email for consistency
    UPDATE public.profiles
    SET email = new_email
    WHERE user_id = target_user_id;
  END IF;

  -- 3. Update password if provided
  IF new_password IS NOT NULL AND new_password <> '' THEN
    -- auth.users passwords are encrypted using crypt() with blowfish (bf) salt
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION public.admin_update_user_auth(UUID, TEXT, TEXT) TO authenticated;
