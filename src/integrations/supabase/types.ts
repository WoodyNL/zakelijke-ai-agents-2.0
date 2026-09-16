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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_stats: {
        Row: {
          agent_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          output_count: number
          performance_score: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          output_count?: number
          performance_score?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          output_count?: number
          performance_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_usage: {
        Row: {
          agent_id: string
          hour: string
          requests: number
        }
        Insert: {
          agent_id: string
          hour: string
          requests?: number
        }
        Update: {
          agent_id?: string
          hour?: string
          requests?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          allowed_domains: string[]
          capture_leads: boolean
          client_id: string
          created_at: string
          description: string
          extra_instructions: string | null
          id: string
          kind: Database["public"]["Enums"]["agent_kind"]
          metric_label: string
          minutes_saved_basis: string | null
          minutes_saved_per_action: number | null
          model: string
          name: string
          notify_email: string | null
          rate_limit_per_hour: number
          score_label: string
          slug: string | null
          status: Database["public"]["Enums"]["agent_status"]
          tone: string | null
          welcome_text: string | null
        }
        Insert: {
          allowed_domains?: string[]
          capture_leads?: boolean
          client_id: string
          created_at?: string
          description?: string
          extra_instructions?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["agent_kind"]
          metric_label?: string
          minutes_saved_basis?: string | null
          minutes_saved_per_action?: number | null
          model?: string
          name: string
          notify_email?: string | null
          rate_limit_per_hour?: number
          score_label?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          tone?: string | null
          welcome_text?: string | null
        }
        Update: {
          allowed_domains?: string[]
          capture_leads?: boolean
          client_id?: string
          created_at?: string
          description?: string
          extra_instructions?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["agent_kind"]
          metric_label?: string
          minutes_saved_basis?: string | null
          minutes_saved_per_action?: number | null
          model?: string
          name?: string
          notify_email?: string | null
          rate_limit_per_hour?: number
          score_label?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          tone?: string | null
          welcome_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_items: {
        Row: {
          agent_id: string
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          question: string | null
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string | null
          sort_order?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string | null
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_items_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_requests: {
        Row: {
          agent_id: string | null
          company: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          stage: string
        }
        Insert: {
          agent_id?: string | null
          company: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          stage?: string
        }
        Update: {
          agent_id?: string | null
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          name?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agent_knowledge: {
        Args: { _slug: string }
        Returns: {
          category: string
          content: string
          id: string
          question: string
          sort_order: number
          tags: string[]
          title: string
        }[]
      }
      agent_public_config: {
        Args: { _slug: string }
        Returns: {
          allowed_domains: string[]
          capture_leads: boolean
          id: string
          model: string
          name: string
          rate_limit_per_hour: number
          tone: string
          welcome_text: string
        }[]
      }
      agent_usage_daily: {
        Args: { _agent_id: string; _days?: number }
        Returns: {
          dag: string
          requests: number
        }[]
      }
      claim_agent_request: { Args: { _agent_id: string }; Returns: boolean }
      my_agent_settings: {
        Args: { _agent_id: string }
        Returns: {
          capture_leads: boolean
          id: string
          kind: string
          metric_label: string
          minutes_saved_basis: string
          minutes_saved_per_action: number
          name: string
          score_label: string
          slug: string
          status: string
          tone: string
          welcome_text: string
        }[]
      }
      resolve_live_agent: { Args: { _slug: string }; Returns: string }
      update_my_agent: {
        Args: { _agent_id: string; _tone: string; _welcome_text: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_kind:
        | "chat_assistent"
        | "sales_assistent"
        | "inbox_draft"
        | "whatsapp_followup"
        | "overig"
      agent_status: "live" | "paused" | "setup"
      app_role: "admin" | "client"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      agent_kind: [
        "chat_assistent",
        "sales_assistent",
        "inbox_draft",
        "whatsapp_followup",
        "overig",
      ],
      agent_status: ["live", "paused", "setup"],
      app_role: ["admin", "client"],
    },
  },
} as const
