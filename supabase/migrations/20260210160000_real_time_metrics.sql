-- Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'expired')),
    plan_id TEXT NOT NULL, -- 'monthly', 'yearly', 'trial', 'premium'
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Payment Transactions Table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'canceled')),
    payment_method TEXT, -- 'pix', 'credit_card'
    transaction_id TEXT, -- External ID from gateway
    coins INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create User Daily Usage Table (For activity tracking)
CREATE TABLE IF NOT EXISTS public.user_daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    screen_views INTEGER DEFAULT 0,
    features_used JSONB DEFAULT '{}'::jsonb, -- e.g. {"idea_inbox": 5, "calendar": 2}
    minutes_active INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure idempotency
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can view/update own usage" ON public.user_daily_usage;
DROP POLICY IF EXISTS "Admins can view all usage" ON public.user_daily_usage;

-- Create RLS Policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view own transactions" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.payment_transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view/update own usage" ON public.user_daily_usage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all usage" ON public.user_daily_usage FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RPC: Log User Activity (Called from frontend)
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_minutes_add INTEGER DEFAULT 0,
    p_screen_view_add INTEGER DEFAULT 0,
    p_feature_used TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_features JSONB;
BEGIN
    -- Get current features for today
    SELECT features_used INTO v_features 
    FROM public.user_daily_usage 
    WHERE user_id = auth.uid() AND date = CURRENT_DATE;

    IF v_features IS NULL THEN
        v_features := '{}'::jsonb;
    END IF;

    -- Update features count if provided
    IF p_feature_used IS NOT NULL THEN
        v_features := jsonb_set(
            v_features, 
            ARRAY[p_feature_used], 
            to_jsonb(COALESCE((v_features->>p_feature_used)::int, 0) + 1)
        );
    END IF;

    -- Upsert usage record
    INSERT INTO public.user_daily_usage (user_id, date, minutes_active, screen_views, features_used, last_active_at)
    VALUES (
        auth.uid(), 
        CURRENT_DATE, 
        p_minutes_add, 
        p_screen_view_add, 
        v_features, 
        now()
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET 
        minutes_active = user_daily_usage.minutes_active + p_minutes_add,
        screen_views = user_daily_usage.screen_views + p_screen_view_add,
        features_used = v_features,
        last_active_at = now(),
        updated_at = now();
END;
$$;


-- RPC: Get Admin Dashboard Stats
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
BEGIN
    -- Check Admin Access
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- 1. Overview Metrics
    SELECT count(*) INTO v_total_users FROM public.profiles;
    SELECT count(*) INTO v_active_subs FROM public.subscriptions WHERE status = 'active';
    SELECT count(*) INTO v_trial_users FROM public.subscriptions WHERE status = 'trialing';

    -- Financials (MRR/ARR)
    SELECT COALESCE(SUM(amount), 0) INTO v_mrr FROM public.subscriptions WHERE status = 'active' AND plan_id IN ('monthly', 'premium');
    SELECT COALESCE(SUM(amount), 0) INTO v_arr FROM public.subscriptions WHERE status = 'active' AND plan_id = 'yearly';
    v_arr := v_arr / 12; -- Monthly equivalent of yearly plans for MRR calculation might be desired, but let's keep separate or combine
    v_mrr := v_mrr + v_arr;

    -- Churn Rate (Cancellations last 30 days / Active at start)
    DECLARE
        v_canceled_last_30 INT;
        v_active_start_30 INT;
    BEGIN
        SELECT count(*) INTO v_canceled_last_30 FROM public.subscriptions WHERE status = 'canceled' AND canceled_at > (now() - interval '30 days');
        SELECT count(*) INTO v_active_start_30 FROM public.subscriptions WHERE created_at < (now() - interval '30 days');
        
        IF v_active_start_30 > 0 THEN
            v_churn_rate := (v_canceled_last_30::NUMERIC / v_active_start_30::NUMERIC) * 100;
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
    -- Logic: For users who canceled, what was (canceled_at - last_active_at)
    SELECT COALESCE(AVG(EXTRACT(DAY FROM (s.canceled_at - u.last_active_at))), 0) INTO v_avg_inactive_days
    FROM public.subscriptions s
    JOIN public.user_daily_usage u ON s.user_id = u.user_id
    WHERE s.status = 'canceled' 
    AND u.date = (SELECT MAX(date) FROM public.user_daily_usage WHERE user_id = s.user_id);


    v_overview := jsonb_build_object(
        'users', jsonb_build_object('total', v_total_users, 'active', v_active_subs, 'trial', v_trial_users),
        'financials', jsonb_build_object('mrr', v_mrr, 'arr', v_arr * 12),
        'rates', jsonb_build_object('churn', v_churn_rate, 'activation', v_activation_rate),
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

    -- 3. Financials (Transactions)
    DECLARE
        v_payment_methods JSONB;
        v_recent_tx JSONB;
    BEGIN
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

        v_financials := jsonb_build_object('methods', v_payment_methods, 'recent', v_recent_tx);
    END;

    -- 4. User Journey (Risk Analysis)
    SELECT jsonb_agg(j) INTO v_journey FROM (
        SELECT 
            p.user_id,
            p.full_name,
            p.email,
            p.created_at,
            s.status as sub_status,
            s.plan_id,
            (SELECT COALESCE(SUM(minutes_active), 0) FROM public.user_daily_usage WHERE user_id = p.user_id AND date > (now() - interval '7 days')) as weekly_minutes,
            (CASE 
                WHEN s.status = 'trialing' AND (now() - p.created_at) > interval '5 days' AND (SELECT count(*) FROM public.user_daily_usage WHERE user_id = p.user_id AND date > (now() - interval '2 days')) = 0 THEN 'high_risk'
                WHEN s.status = 'cancelled' THEN 'churned'
                ELSE 'healthy'
            END) as risk_level
        FROM public.profiles p
        LEFT JOIN public.subscriptions s ON p.user_id = s.user_id
        WHERE p.created_at > (now() - interval '30 days') OR s.status IN ('trialing', 'active')
        LIMIT 50
    ) j;

    RETURN jsonb_build_object(
        'overview', v_overview,
        'usage_heatmap', v_usage,
        'financials', v_financials,
        'journey', v_journey
    );
END;
$$;
