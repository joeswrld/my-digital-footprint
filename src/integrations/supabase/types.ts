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
      account_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["action_type"]
          completed_at: string | null
          created_at: string
          discovered_account_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["action_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["action_type"]
          completed_at?: string | null
          created_at?: string
          discovered_account_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["action_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["action_type"]
          completed_at?: string | null
          created_at?: string
          discovered_account_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["action_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_actions_discovered_account_id_fkey"
            columns: ["discovered_account_id"]
            isOneToOne: false
            referencedRelation: "discovered_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_accounts: {
        Row: {
          category: Database["public"]["Enums"]["account_category"] | null
          created_at: string
          domain: string
          first_seen: string
          id: string
          last_activity: string | null
          metadata: Json | null
          risk_score: Database["public"]["Enums"]["risk_level"] | null
          service_name: string
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["account_category"] | null
          created_at?: string
          domain: string
          first_seen: string
          id?: string
          last_activity?: string | null
          metadata?: Json | null
          risk_score?: Database["public"]["Enums"]["risk_level"] | null
          service_name: string
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["account_category"] | null
          created_at?: string
          domain?: string
          first_seen?: string
          id?: string
          last_activity?: string | null
          metadata?: Json | null
          risk_score?: Database["public"]["Enums"]["risk_level"] | null
          service_name?: string
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_tokens: {
        Row: {
          created_at: string
          encrypted_access_token: string
          encrypted_refresh_token: string | null
          id: string
          provider: string
          scopes: string[] | null
          token_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_access_token: string
          encrypted_refresh_token?: string | null
          id?: string
          provider?: string
          scopes?: string[] | null
          token_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_access_token?: string
          encrypted_refresh_token?: string | null
          id?: string
          provider?: string
          scopes?: string[] | null
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email_verified: boolean | null
          id: string
          onboarding_completed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email_verified?: boolean | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email_verified?: boolean | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_metrics: {
        Row: {
          accounts_discovered_count: number | null
          actions_taken_count: number | null
          created_at: string
          extension_installed: boolean | null
          first_action_at: string | null
          gmail_connected: boolean | null
          id: string
          last_active_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accounts_discovered_count?: number | null
          actions_taken_count?: number | null
          created_at?: string
          extension_installed?: boolean | null
          first_action_at?: string | null
          gmail_connected?: boolean | null
          id?: string
          last_active_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accounts_discovered_count?: number | null
          actions_taken_count?: number | null
          created_at?: string
          extension_installed?: boolean | null
          first_action_at?: string | null
          gmail_connected?: boolean | null
          id?: string
          last_active_at?: string | null
          updated_at?: string
          user_id?: string
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
      account_category: "social" | "finance" | "shopping" | "saas" | "other"
      action_status: "pending" | "in_progress" | "completed" | "failed"
      action_type: "deletion" | "revoke"
      risk_level: "low" | "medium" | "high"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
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
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_category: ["social", "finance", "shopping", "saas", "other"],
      action_status: ["pending", "in_progress", "completed", "failed"],
      action_type: ["deletion", "revoke"],
      risk_level: ["low", "medium", "high"],
    },
  },
} as const
