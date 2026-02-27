-- Migation para permitir que admins editem dados de social_optimizer de outros usuários

CREATE OR REPLACE FUNCTION admin_update_user_profile(
    target_user_id UUID,
    new_full_name TEXT,
    new_user_name TEXT,
    new_bio TEXT,
    new_website TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the caller is an admin using the correct has_role function
    IF NOT (SELECT public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
        RAISE EXCEPTION 'Not authorized. Admin access required.';
    END IF;

    -- Update profiles
    UPDATE profiles 
    SET 
        full_name = new_full_name,
        user_name = new_user_name
    WHERE user_id = target_user_id;

    -- Update social_optimizer (creates if doesn't exist)
    INSERT INTO social_optimizer (user_id, bio, website, updated_at)
    VALUES (target_user_id, new_bio, new_website, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        bio = EXCLUDED.bio,
        website = EXCLUDED.website,
        updated_at = EXCLUDED.updated_at;

END;
$$;
