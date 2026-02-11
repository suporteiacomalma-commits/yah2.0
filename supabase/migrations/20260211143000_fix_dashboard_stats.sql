-- Update get_admin_dashboard_stats to use profiles table as source of truth
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_users INT;
    v_active_subs INT;
    v_trial_users INT;
    v_mrr NUMERIC;
    v_arr NUMERIC;
    v_churn_rate NUMERIC;
    v_activation_rate NUMERIC;
    v_avg_daily_minutes NUMERIC;
    v_avg_inactive_days NUMERIC;
    
    v_overview JSONB;
    v_financials JSONB;
    v_usage JSONB;
    v_journey JSONB;
    
    v_start_date DATE := (now() - interval '30 days')::date;
    v_premium_price NUMERIC := 97.00; -- Assumed price for MRR calculation
BEGIN
    -- Check Admin Access
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- 1. Overview Metrics (Source: profiles)
    SELECT count(*) INTO v_total_users FROM public.profiles;
    
    SELECT count(*) INTO v_active_subs 
    FROM public.profiles 
    WHERE subscription_status = 'active';
    
    SELECT count(*) INTO v_trial_users 
    FROM public.profiles 
    WHERE subscription_plan = 'trial';

    -- Financials (MRR/ARR)
    -- Calculate MRR based on active premium users * price
    SELECT COALESCE(COUNT(*) * v_premium_price, 0) INTO v_mrr 
    FROM public.profiles 
    WHERE subscription_status = 'active' 
    AND subscription_plan = 'premium';
    
    v_arr := 0; -- We don't have yearly plans in profiles yet, defaulting to 0

    -- Churn Rate (Cancellations last 30 days / Active at start)
    -- Since we don't have historical data in profiles, we'll use current cancelled status as a proxy for "Churn" or 0 if not tracked
    -- Better approximation: Count profiles with subscription_status = 'cancelled'
    DECLARE
        v_canceled_total INT;
    BEGIN
        SELECT count(*) INTO v_canceled_total FROM public.profiles WHERE subscription_status = 'cancelled';
        
        IF v_total_users > 0 THEN
             -- This is "Total Churn %" not "Monthly Churn", but it's what we have
            v_churn_rate := (v_canceled_total::NUMERIC / v_total_users::NUMERIC) * 100;
        ELSE
            v_churn_rate := 0;
        END IF;
    END;

    -- Activation Rate (Onboarding Completed)
    DECLARE
        v_completed_onboarding INT;
    BEGIN
        SELECT count(*) INTO v_completed_onboarding FROM public.profiles WHERE onboarding_completed = true;
        IF v_total_users > 0 THEN
            v_activation_rate := (v_completed_onboarding::NUMERIC / v_total_users::NUMERIC) * 100;
        ELSE
            v_activation_rate := 0;
        END IF;
    END;

    -- Avg Daily Usage (Minutes)
    SELECT COALESCE(AVG(minutes_active), 0) INTO v_avg_daily_minutes 
    FROM public.user_daily_usage 
    WHERE date > v_start_date;

    -- Avg Days Inactive Before Churn (For churned users)
    v_avg_inactive_days := 0; -- Placeholder until we have better tracking

    v_overview := jsonb_build_object(
        'users', jsonb_build_object('total', v_total_users, 'active', v_active_subs, 'trial', v_trial_users),
        'financials', jsonb_build_object('mrr', v_mrr, 'arr', v_arr),
        'rates', jsonb_build_object('churn', v_churn_rate, 'activation', v_activation_rate, 'conversion', 0),
        'usage', jsonb_build_object('avg_minutes', v_avg_daily_minutes, 'avg_days_inactive_churn', v_avg_inactive_days)
    );

    -- 2. Usage Heatmap & Feature Stats (Last 30 Days)
    SELECT jsonb_agg(t) INTO v_usage FROM (
        SELECT 
            date,
            SUM(screen_views) as screen_views,
            SUM(minutes_active) as minutes,
            SUM((features_used->>'idea_inbox')::int) as ideas_inbox,
            SUM((features_used->>'calendar')::int) as calendar_events
        FROM public.user_daily_usage
        WHERE date > v_start_date
        GROUP BY date
        ORDER BY date ASC
    ) t;

    -- 3. Financials (Transactions) - Keep existing logic if payment_transactions exists, else empty
    DECLARE
        v_payment_methods JSONB;
        v_recent_tx JSONB;
    BEGIN
        -- Check if table exists to avoid error if not run yet
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
            SELECT jsonb_agg(pm) INTO v_payment_methods FROM (
                SELECT payment_method, count(*) as count, sum(amount) as total
                FROM public.payment_transactions
                GROUP BY payment_method
            ) pm;

            SELECT jsonb_agg(rt) INTO v_recent_tx FROM (
                SELECT t.id, t.amount, t.status, t.payment_method, t.created_at, p.email as user_email
                FROM public.payment_transactions t
                JOIN public.profiles p ON t.user_id = p.user_id
                ORDER BY t.created_at DESC
                LIMIT 10
            ) rt;
        ELSE
            v_payment_methods := '[]'::jsonb;
            v_recent_tx := '[]'::jsonb;
        END IF;

        v_financials := jsonb_build_object('methods', COALESCE(v_payment_methods, '[]'::jsonb), 'recent', COALESCE(v_recent_tx, '[]'::jsonb));
    END;

    -- 4. User Journey (Risk Analysis)
    SELECT jsonb_agg(j) INTO v_journey FROM (
        SELECT 
            p.user_id,
            p.full_name,
            p.email,
            p.created_at,
            p.subscription_status as sub_status,
            p.subscription_plan as plan_id,
            (SELECT COALESCE(SUM(minutes_active), 0) FROM public.user_daily_usage WHERE user_id = p.user_id AND date > (now() - interval '7 days')) as weekly_minutes,
            (CASE 
                WHEN p.subscription_plan = 'trial' AND (now() - p.created_at) > interval '5 days' AND (SELECT count(*) FROM public.user_daily_usage WHERE user_id = p.user_id AND date > (now() - interval '2 days')) = 0 THEN 'high_risk'
                WHEN p.subscription_status = 'cancelled' THEN 'churned'
                ELSE 'healthy'
            END) as risk_level
        FROM public.profiles p
        WHERE p.created_at > (now() - interval '30 days') OR p.subscription_status = 'active'
        ORDER BY p.created_at DESC
        LIMIT 50
    ) j;

    RETURN jsonb_build_object(
        'overview', v_overview,
        'usage_heatmap', COALESCE(v_usage, '[]'::jsonb),
        'financials', v_financials,
        'journey', COALESCE(v_journey, '[]'::jsonb)
    );
END;
$$;
