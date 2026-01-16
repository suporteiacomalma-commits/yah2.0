import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { phases } from "@/lib/phases";

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
  current_phase: number;
  phases_completed: number[];
  created_at: string;
  updated_at: string;
}

export function useBrand() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("brands")
        .select("*")
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["brand", user?.id] });
      if (!data.silent) {
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
    onSuccess: () => {
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
