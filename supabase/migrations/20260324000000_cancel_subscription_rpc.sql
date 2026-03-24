-- RPC to cancel user subscription
CREATE OR REPLACE FUNCTION public.cancel_user_subscription(
    p_user_id UUID
) RETURNS VOID AS $$
BEGIN
    -- 1. Update the profiles table
    UPDATE public.profiles
    SET subscription_status = 'cancelled',
        updated_at = now()
    WHERE user_id = p_user_id;

    -- 2. Update the subscriptions table if it exists
    -- We use a dynamic check or just attempt to update if the table exists
    -- Since we saw it in migrations, it should exist.
    UPDATE public.subscriptions
    SET status = 'canceled',
        cancel_at_period_end = TRUE,
        canceled_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id AND status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
