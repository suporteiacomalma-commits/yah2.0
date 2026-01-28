import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Plan {
    id: string;
    name: string;
    description: string | null;
    amount: number;
    period: string;
    badge: string | null;
    popular: boolean;
    frequency: "ONE_TIME" | "RECURRING";
    is_active: boolean;
    created_at: string;
}

export function usePlans(onlyActive = true) {
    const queryClient = useQueryClient();

    const { data: plans, isLoading } = useQuery({
        queryKey: ["plans", onlyActive],
        queryFn: async () => {
            let query = (supabase as any).from("plans").select("*");

            if (onlyActive) {
                query = query.eq("is_active", true);
            }

            const { data, error } = await query.order("amount", { ascending: true });

            if (error) throw error;
            return data as Plan[];
        },
    });

    const createPlan = useMutation({
        mutationFn: async (newPlan: Omit<Plan, "created_at">) => {
            const { data, error } = await (supabase as any)
                .from("plans")
                .insert([newPlan])
                .select()
                .single();

            if (error) throw error;
            return data as Plan;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["plans"] });
        },
    });

    const updatePlan = useMutation({
        mutationFn: async (updatedPlan: Partial<Plan> & { id: string }) => {
            const { data, error } = await (supabase as any)
                .from("plans")
                .update(updatedPlan)
                .eq("id", updatedPlan.id)
                .select()
                .single();

            if (error) throw error;
            return data as Plan;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["plans"] });
        },
    });

    const deletePlan = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from("plans")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["plans"] });
        },
    });

    return {
        plans: plans || [],
        isLoading,
        createPlan,
        updatePlan,
        deletePlan,
    };
}
