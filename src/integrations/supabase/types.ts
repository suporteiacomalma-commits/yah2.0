export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brand_documents: {
        Row: {
          brand_id: string | null
          category: string | null
          created_at: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          created_at?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_documents_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_vault_cards: {
        Row: {
          brand_id: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_vault_cards_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
      brand_vault_items: {
        Row: {
          attachments: Json | null
          brand_id: string | null
          card_id: string | null
          created_at: string | null
          id: string
          links: Json | null
          order: number | null
          text: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          brand_id?: string | null
          card_id?: string | null
          created_at?: string | null
          id?: string
          links?: Json | null
          order?: number | null
          text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          brand_id?: string | null
          card_id?: string | null
          created_at?: string | null
          id?: string
          links?: Json | null
          order?: number | null
          text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_vault_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_vault_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "brand_vault_cards"
            referencedColumns: ["id"]
          }
        ]
      }
      brands: {
        Row: {
          accent_color: string | null
          behaviors: string | null
          communication_examples: string | null
          created_at: string
          current_phase: number
          description: string | null
          desires: string | null
          dna_comparativo: string | null
          dna_competidores: Json | null
          dna_diferencial: string | null
          dna_dor_principal: string | null
          dna_nicho: string | null
          dna_objetivo: string | null
          dna_objecao_comum: string | null
          dna_persona_data: Json | null
          dna_pilares: Json | null
          dna_produto: string | null
          dna_sonho_principal: string | null
          dna_tese: string | null
          dna_transformacao: string | null
          dna_uvp: string | null
          graphic_elements: string | null
          id: string
          key_messages: string | null
          logo_description: string | null
          mission: string | null
          monthly_structure_data: Json | null
          name: string
          pain_points: string | null
          personality: string | null
          personas: string | null
          phases_completed: number[] | null
          primary_color: string | null
          purpose: string | null
          result_como_funciona: string | null
          result_essencia: string | null
          result_tom_voz: string | null
          routine_execution_days: string[] | null
          routine_feed_format_prefs: Json | null
          routine_fixed_hours: string[] | null
          routine_intentions_prefs: Json | null
          routine_planning_days: string[] | null
          routine_posts_per_week: number | null
          routine_posting_days: string[] | null
          secondary_color: string | null
          sector: string | null
          segments: string | null
          trained_ais_chats: Json | null
          trunk_categories: string[] | null
          typography: string | null
          updated_at: string
          user_blockers: string | null
          user_change_world: string | null
          user_creative_profile: string[] | null
          user_energy_times: string[] | null
          user_id: string
          user_motivation: string | null
          user_role: string | null
          user_tone_selected: string[] | null
          values: string | null
          vision: string | null
          weekly_structure_data: Json | null
        }
        Insert: {
          accent_color?: string | null
          behaviors?: string | null
          communication_examples?: string | null
          created_at?: string
          current_phase?: number
          description?: string | null
          desires?: string | null
          dna_comparativo?: string | null
          dna_competidores?: Json | null
          dna_diferencial?: string | null
          dna_dor_principal?: string | null
          dna_nicho?: string | null
          dna_objetivo?: string | null
          dna_objecao_comum?: string | null
          dna_persona_data?: Json | null
          dna_pilares?: Json | null
          dna_produto?: string | null
          dna_sonho_principal?: string | null
          dna_tese?: string | null
          dna_transformacao?: string | null
          dna_uvp?: string | null
          graphic_elements?: string | null
          id?: string
          key_messages?: string | null
          logo_description?: string | null
          mission?: string | null
          monthly_structure_data?: Json | null
          name: string
          pain_points?: string | null
          personality?: string | null
          personas?: string | null
          phases_completed?: number[] | null
          primary_color?: string | null
          purpose?: string | null
          result_como_funciona?: string | null
          result_essencia?: string | null
          result_tom_voz?: string | null
          routine_execution_days?: string[] | null
          routine_feed_format_prefs?: Json | null
          routine_fixed_hours?: string[] | null
          routine_intentions_prefs?: Json | null
          routine_planning_days?: string[] | null
          routine_posts_per_week?: number | null
          routine_posting_days?: string[] | null
          secondary_color?: string | null
          sector?: string | null
          segments?: string | null
          trained_ais_chats?: Json | null
          trunk_categories?: string[] | null
          typography?: string | null
          updated_at?: string
          user_blockers?: string | null
          user_change_world?: string | null
          user_creative_profile?: string[] | null
          user_energy_times?: string[] | null
          user_id: string
          user_motivation?: string | null
          user_role?: string | null
          user_tone_selected?: string[] | null
          values?: string | null
          vision?: string | null
          weekly_structure_data?: Json | null
        }
        Update: {
          accent_color?: string | null
          behaviors?: string | null
          communication_examples?: string | null
          created_at?: string
          current_phase?: number
          description?: string | null
          desires?: string | null
          dna_comparativo?: string | null
          dna_competidores?: Json | null
          dna_diferencial?: string | null
          dna_dor_principal?: string | null
          dna_nicho?: string | null
          dna_objetivo?: string | null
          dna_objecao_comum?: string | null
          dna_persona_data?: Json | null
          dna_pilares?: Json | null
          dna_produto?: string | null
          dna_sonho_principal?: string | null
          dna_tese?: string | null
          dna_transformacao?: string | null
          dna_uvp?: string | null
          graphic_elements?: string | null
          id?: string
          key_messages?: string | null
          logo_description?: string | null
          mission?: string | null
          monthly_structure_data?: Json | null
          name?: string
          pain_points?: string | null
          personality?: string | null
          personas?: string | null
          phases_completed?: number[] | null
          primary_color?: string | null
          purpose?: string | null
          result_como_funciona?: string | null
          result_essencia?: string | null
          result_tom_voz?: string | null
          routine_execution_days?: string[] | null
          routine_feed_format_prefs?: Json | null
          routine_fixed_hours?: string[] | null
          routine_intentions_prefs?: Json | null
          routine_planning_days?: string[] | null
          routine_posts_per_week?: number | null
          routine_posting_days?: string[] | null
          secondary_color?: string | null
          sector?: string | null
          segments?: string | null
          trained_ais_chats?: Json | null
          trunk_categories?: string[] | null
          typography?: string | null
          updated_at?: string
          user_blockers?: string | null
          user_change_world?: string | null
          user_creative_profile?: string[] | null
          user_energy_times?: string[] | null
          user_id?: string
          user_motivation?: string | null
          user_role?: string | null
          user_tone_selected?: string[] | null
          values?: string | null
          vision?: string | null
          weekly_structure_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calendar_activities: {
        Row: {
          brand_id: string | null
          completed: boolean | null
          content: string | null
          created_at: string | null
          date: string
          id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          completed?: boolean | null
          content?: string | null
          created_at?: string | null
          date: string
          id?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          completed?: boolean | null
          content?: string | null
          created_at?: string | null
          date?: string
          id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_activities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_inbox: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_stage: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          main_goal: string | null
          onboarding_completed: boolean | null
          updated_at: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          business_stage?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          main_goal?: string | null
          onboarding_completed?: boolean | null
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          business_stage?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          main_goal?: string | null
          onboarding_completed?: boolean | null
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      social_optimizer: {
        Row: {
          bio: string | null
          created_at: string | null
          diagnosis: string | null
          handle: string | null
          highlights: Json | null
          id: string
          name: string | null
          pinned_posts: Json | null
          print_url: string | null
          profile_image_url: string | null
          stats: Json | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          diagnosis?: string | null
          handle?: string | null
          highlights?: Json | null
          id?: string
          name?: string | null
          pinned_posts?: Json | null
          print_url?: string | null
          profile_image_url?: string | null
          stats?: Json | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          diagnosis?: string | null
          handle?: string | null
          highlights?: Json | null
          id?: string
          name?: string | null
          pinned_posts?: Json | null
          print_url?: string | null
          profile_image_url?: string | null
          stats?: Json | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type PublicSchema = DatabaseWithoutInternals["public"]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
    Row: infer R
  }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends PublicEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
