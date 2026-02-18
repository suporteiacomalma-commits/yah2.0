import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SocialOptimizerData {
    id: string;
    user_id: string;
    profile_image_url: string | null;
    name: string | null;
    handle: string | null;
    website: string | null;
    bio: string | null;
    extra_bios: string[] | null;
    stats: {
        posts: number;
        followers: number;
        following: number;
    };
    highlights: {
        title: string;
        description: string;
        cover_url: string;
        type: "transformation" | "journey" | "faq" | "custom";
    }[];
    pinned_posts: {
        theme: string;
        content: string;
        thumbnail_url: string;
        logic: string;
        link: string;
        type: "pain" | "process" | "transformation";
    }[];
    diagnosis: string | null;
    print_url: string | null;
    created_at: string;
    updated_at: string;
}

export function useSocialOptimizer() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: socialData, isLoading } = useQuery({
        queryKey: ["social_optimizer", user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await (supabase
                .from("social_optimizer" as any) as any)
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) throw error;
            return data as SocialOptimizerData | null;
        },
        enabled: !!user,
    });

    const updateSocialData = useMutation({
        mutationFn: async ({ updates, silent }: { updates: Partial<SocialOptimizerData>; silent?: boolean }) => {
            if (!user) throw new Error("User not authenticated");

            const { data, error } = await (supabase
                .from("social_optimizer" as any) as any)
                .upsert({
                    user_id: user.id,
                    ...updates,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;
            return { data, silent };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["social_optimizer", user?.id] });
            if (!data.silent) {
                toast.success("Perfil otimizado salvo com sucesso!");
            }
        },
        onError: (error) => {
            toast.error("Erro ao salvar otimização: " + error.message);
        },
    });

    return {
        socialData,
        isLoading,
        updateSocialData,
    };
}
