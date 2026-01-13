import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemSetting {
    id: string;
    key: string;
    value: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export function useSystemSettings() {
    const queryClient = useQueryClient();

    const { data: settings = [], isLoading } = useQuery({
        queryKey: ["system-settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("system_settings")
                .select("*");

            if (error) {
                console.error("Error fetching system settings:", error);
                throw error;
            }
            return data as SystemSetting[];
        },
    });

    const updateSetting = useMutation({
        mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
            const { data, error } = await supabase
                .from("system_settings")
                .upsert(
                    { key, value, description, updated_at: new Date().toISOString() },
                    { onConflict: "key" }
                )
                .select()
                .single();

            if (error) {
                console.error("Error updating system setting:", error);
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["system-settings"] });
            toast.success("Configuração atualizada com sucesso");
        },
        onError: (error: any) => {
            toast.error(`Erro ao atualizar configuração: ${error.message}`);
        },
    });

    const getSetting = (key: string) => settings.find((s) => s.key === key);

    return {
        settings,
        isLoading,
        updateSetting,
        getSetting,
    };
}
