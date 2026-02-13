import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { phases } from "@/lib/phases";


// Fields to select when we don't need heavy JSON data (trained_ais_chats, weekly_structure_data, etc.)
export const BRAND_LITE_FIELDS = `
  id, user_id, name, sector, description, mission, vision, values, purpose, personality,
  primary_color, secondary_color, accent_color, typography, logo_description, graphic_elements,
  personas, segments, behaviors, pain_points, desires, writing_style, vocabulary, key_messages,
  communication_examples, user_role, user_motivation, user_change_world, user_tone_selected,
  user_creative_profile, user_energy_times, user_blockers, result_essencia, result_tom_voz,
  result_como_funciona, routine_posts_per_week, routine_planning_days, routine_execution_days,
  routine_posting_days, routine_feed_format_prefs, routine_intentions_prefs, routine_fixed_hours,
  dna_nicho, dna_produto, dna_objetivo, dna_dor_principal, dna_sonho_principal, dna_transformacao,
  dna_diferencial, dna_tese, dna_pilares, dna_objecao_comum, dna_persona_data, dna_competidores,
  dna_comparativo, dna_uvp, extra_infos, trunk_categories, current_phase, phases_completed,
  created_at, updated_at
`;
export interface Brand {
  id: string;
  user_id: string;
  name: string;
  sector: string | null;
  description: string | null;
  mission: string | null;
  vision: string | null;
  values: string | null;
  purpose: string | null;
  personality: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  typography: string | null;
  logo_description: string | null;
  graphic_elements: string | null;
  personas: string | null;
  segments: string | null;
  behaviors: string | null;
  pain_points: string | null;
  desires: string | null;
  writing_style: string | null;
  vocabulary: string | null;
  key_messages: string | null;
  communication_examples: string | null;
  user_role: string | null;
  user_motivation: string | null;
  user_change_world: string | null;
  user_tone_selected: string[] | null;
  user_creative_profile: string[] | null;
  user_energy_times: string[] | null;
  user_blockers: string | null;
  result_essencia: string | null;
  result_tom_voz: string | null;
  result_como_funciona: string | null;
  routine_posts_per_week?: number;
  routine_planning_days?: string[];
  routine_execution_days?: string[];
  routine_posting_days?: string[];
  routine_feed_format_prefs?: any;
  routine_intentions_prefs?: any;
  routine_fixed_hours?: string[];
  weekly_structure_data?: any;
  monthly_structure_data?: any;
  trained_ais_chats?: any;
  dna_nicho: string | null;
  dna_produto: string | null;
  dna_objetivo: string | null;
  dna_dor_principal: string | null;
  dna_sonho_principal: string | null;
  dna_transformacao: string | null;
  dna_diferencial: string | null;
  dna_tese: string | null;
  dna_pilares: any[] | null;
  dna_objecao_comum: string | null;
  dna_persona_data: any | null;
  dna_competidores: any[] | null;
  dna_comparativo: string | null;
  dna_uvp: string | null;
  extra_infos?: { id: string; title: string; content: string }[] | null;
  trunk_categories?: string[] | null;
  current_phase: number;
  phases_completed: number[];
  created_at: string;
  updated_at: string;
}

export function useBrand(options?: { select?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand", user?.id, options?.select],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("brands")
        .select(options?.select || "*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Brand | null;
    },
    enabled: !!user,
  });

  const createBrand = useMutation({
    mutationFn: async (brandData: { name: string; sector?: string; description?: string }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("brands")
        .upsert({
          user_id: user.id,
          name: brandData.name,
          sector: brandData.sector || null,
          description: brandData.description || null,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand", user?.id] });
      toast.success("Marca criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar marca: " + error.message);
    },
  });

  const updateBrand = useMutation({
    mutationFn: async ({ updates, silent }: { updates: Partial<Brand>; silent?: boolean }) => {
      if (!user || !brand) throw new Error("User or brand not found");

      const { data, error } = await supabase
        .from("brands")
        .update(updates)
        .eq("id", brand.id)
        .select()
        .single();

      if (error) throw error;
      return { data, silent };
    },
    onSuccess: ({ data, silent }) => {
      if (data) {
        queryClient.setQueryData(["brand", user?.id], data);
      }

      if (!silent) {
        // Only invalidate if explicitly requested (non-silent), but even then, 
        // we already have the fresh data, so invalidation might be redundant 
        // unless there are side effects. Keeping it for non-silent actions to be safe.
        queryClient.invalidateQueries({ queryKey: ["brand", user?.id] });
        toast.success("Dados salvos com sucesso!");
      }
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const completePhase = useMutation({
    mutationFn: async (phaseNumber: number) => {
      if (!user || !brand) throw new Error("User or brand not found");

      const newPhasesCompleted = [...(brand.phases_completed || [])];
      if (!newPhasesCompleted.includes(phaseNumber)) {
        newPhasesCompleted.push(phaseNumber);
      }

      const nextPhase = Math.min(phaseNumber + 1, phases.length);

      const { data, error } = await supabase
        .from("brands")
        .update({
          phases_completed: newPhasesCompleted,
          current_phase: nextPhase,
        })
        .eq("id", brand.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(["brand", user?.id], data);
      }
      queryClient.invalidateQueries({ queryKey: ["brand", user?.id] });
      toast.success("Fase concluída! 🎉");
    },
    onError: (error) => {
      toast.error("Erro ao completar fase: " + error.message);
    },
  });

  return {
    brand,
    isLoading,
    createBrand,
    updateBrand,
    completePhase,
  };
}
