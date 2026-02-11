import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
    overview: {
        users: { total: number; active: number; trial: number };
        financials: { mrr: number; arr: number };
        rates: { conversion: number; churn: number; activation: number };
        usage: { avg_minutes: number; avg_days_inactive_churn: number };
    };
    usage_heatmap: Array<{
        date: string;
        screen_views: number;
        minutes: number;
        ideas_inbox: number;
        calendar_events: number;
    }>;
    financials: {
        methods: Array<{ payment_method: string; count: number; total: number }>;
        recent: Array<{
            id: string;
            amount: number;
            status: string;
            payment_method: string;
            created_at: string;
            user_email: string;
        }>;
    };
    journey: Array<{
        user_id: string;
        full_name: string;
        email: string;
        created_at: string;
        sub_status: string;
        plan_id: string;
        risk_level: 'high_risk' | 'churned' | 'healthy' | 'medium_risk';
        weekly_minutes: number;
    }>;
}

export const DashboardService = {
    async getStats(): Promise<DashboardStats> {
        const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

        if (error) {
            console.error('Error fetching admin stats:', error);
            throw error;
        }

        const stats = data as unknown as DashboardStats;

        return {
            ...stats,
            usage_heatmap: stats.usage_heatmap || [],
            financials: {
                ...stats.financials,
                methods: stats.financials?.methods || [],
                recent: stats.financials?.recent || []
            },
            journey: stats.journey || [],
            overview: {
                ...stats.overview,
                financials: {
                    mrr: stats.overview?.financials?.mrr || 0,
                    arr: stats.overview?.financials?.arr || 0
                },
                users: {
                    total: stats.overview?.users?.total || 0,
                    active: stats.overview?.users?.active || 0,
                    trial: stats.overview?.users?.trial || 0
                },
                rates: {
                    churn: stats.overview?.rates?.churn || 0,
                    activation: stats.overview?.rates?.activation || 0,
                    conversion: stats.overview?.rates?.conversion || 0
                },
                usage: {
                    avg_minutes: stats.overview?.usage?.avg_minutes || 0,
                    avg_days_inactive_churn: stats.overview?.usage?.avg_days_inactive_churn || 0
                }
            }
        };
    },

    async logActivity(minutes: number, screenViews: number, feature?: string) {
        const { error } = await supabase.rpc('log_user_activity', {
            p_minutes_add: minutes,
            p_screen_view_add: screenViews,
            p_feature_used: feature
        });

        if (error) {
            console.error('Error logging activity:', error);
        }
    }
};
