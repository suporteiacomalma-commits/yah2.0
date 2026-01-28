-- Function to process successful AbacatePay payments
-- This should be called by your webhook handler (Edge Function)
CREATE OR REPLACE FUNCTION public.process_abacate_pay_payment(
    p_external_id TEXT,
    p_status TEXT
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_coins INTEGER;
    v_transaction_id UUID;
BEGIN
    -- 1. Find the transaction
    SELECT id, user_id, coins
    INTO v_transaction_id, v_user_id, v_coins
    FROM public.payment_transactions
    WHERE external_id = p_external_id
    LIMIT 1;

    IF v_transaction_id IS NULL THEN
        RAISE EXCEPTION 'Transaction not found for external_id: %', p_external_id;
    END IF;

    -- 2. Update transaction status
    UPDATE public.payment_transactions
    SET status = p_status,
        updated_at = now()
    WHERE id = v_transaction_id;

    -- 3. If completed, add coins to profile
    IF p_status = 'completed' THEN
        UPDATE public.profiles
        SET coins = COALESCE(coins, 0) + v_coins,
            updated_at = now()
        WHERE user_id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
