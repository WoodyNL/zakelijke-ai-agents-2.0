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
          billable_requests: number
          cache_read_tokens: number
          hour: string
          input_tokens: number
          output_tokens: number
          requests: number
        }
        Insert: {
          agent_id: string
          billable_requests?: number
          cache_read_tokens?: number
          hour: string
          input_tokens?: number
          output_tokens?: number
          requests?: number
        }
        Update: {
          agent_id?: string
          billable_requests?: number
          cache_read_tokens?: number
          hour?: string
          input_tokens?: number
          output_tokens?: number
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
          fair_use_per_month: number | null
          hourly_rate: number | null
          hourly_rate_basis: string | null
          id: string
          inbound_local: string | null
          kind: Database["public"]["Enums"]["agent_kind"]
          metric_label: string
          minutes_saved_basis: string | null
          minutes_saved_per_action: number | null
          model: string
          name: string
          notify_email: string | null
          overage_price: number
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
          fair_use_per_month?: number | null
          hourly_rate?: number | null
          hourly_rate_basis?: string | null
          id?: string
          inbound_local?: string | null
          kind?: Database["public"]["Enums"]["agent_kind"]
          metric_label?: string
          minutes_saved_basis?: string | null
          minutes_saved_per_action?: number | null
          model?: string
          name: string
          notify_email?: string | null
          overage_price?: number
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
          fair_use_per_month?: number | null
          hourly_rate?: number | null
          hourly_rate_basis?: string | null
          id?: string
          inbound_local?: string | null
          kind?: Database["public"]["Enums"]["agent_kind"]
          metric_label?: string
          minutes_saved_basis?: string | null
          minutes_saved_per_action?: number | null
          model?: string
          name?: string
          notify_email?: string | null
          overage_price?: number
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
      outbound_campaigns: {
        Row: {
          aanbod: string | null
          aangemaakt_op: string
          actief: boolean
          afzender_email: string | null
          afzender_naam: string | null
          agent_id: string
          antwoord_naar: string | null
          dagmaximum: number
          herkomst: Database["public"]["Enums"]["contact_herkomst"]
          id: string
          naam: string
          ondertekening: string | null
          opvolg_na_dagen: number
          verzendwijze: Database["public"]["Enums"]["verzendwijze"]
        }
        Insert: {
          aanbod?: string | null
          aangemaakt_op?: string
          actief?: boolean
          afzender_email?: string | null
          afzender_naam?: string | null
          agent_id: string
          antwoord_naar?: string | null
          dagmaximum?: number
          herkomst?: Database["public"]["Enums"]["contact_herkomst"]
          id?: string
          naam: string
          ondertekening?: string | null
          opvolg_na_dagen?: number
          verzendwijze?: Database["public"]["Enums"]["verzendwijze"]
        }
        Update: {
          aanbod?: string | null
          aangemaakt_op?: string
          actief?: boolean
          afzender_email?: string | null
          afzender_naam?: string | null
          agent_id?: string
          antwoord_naar?: string | null
          dagmaximum?: number
          herkomst?: Database["public"]["Enums"]["contact_herkomst"]
          id?: string
          naam?: string
          ondertekening?: string | null
          opvolg_na_dagen?: number
          verzendwijze?: Database["public"]["Enums"]["verzendwijze"]
        }
        Relationships: [
          {
            foreignKeyName: "outbound_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_contacts: {
        Row: {
          aangemaakt_op: string
          afgemeld_op: string | null
          afmeldsleutel: string
          agent_id: string
          bedrijf: string | null
          bounce_op: string | null
          email: string
          herkomst: Database["public"]["Enums"]["contact_herkomst"]
          id: string
          laatst_besteld_op: string | null
          naam: string | null
          notitie: string | null
          plaats: string | null
          telefoon: string | null
        }
        Insert: {
          aangemaakt_op?: string
          afgemeld_op?: string | null
          afmeldsleutel?: string
          agent_id: string
          bedrijf?: string | null
          bounce_op?: string | null
          email: string
          herkomst?: Database["public"]["Enums"]["contact_herkomst"]
          id?: string
          laatst_besteld_op?: string | null
          naam?: string | null
          notitie?: string | null
          plaats?: string | null
          telefoon?: string | null
        }
        Update: {
          aangemaakt_op?: string
          afgemeld_op?: string | null
          afmeldsleutel?: string
          agent_id?: string
          bedrijf?: string | null
          bounce_op?: string | null
          email?: string
          herkomst?: Database["public"]["Enums"]["contact_herkomst"]
          id?: string
          laatst_besteld_op?: string | null
          naam?: string | null
          notitie?: string | null
          plaats?: string | null
          telefoon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_contacts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_deliveries: {
        Row: {
          aangemaakt_op: string
          adres: string | null
          agent_id: string
          bezorgdag: string
          contact_id: string
          id: string
          notitie: string | null
          status: string
        }
        Insert: {
          aangemaakt_op?: string
          adres?: string | null
          agent_id: string
          bezorgdag: string
          contact_id: string
          id?: string
          notitie?: string | null
          status?: string
        }
        Update: {
          aangemaakt_op?: string
          adres?: string | null
          agent_id?: string
          bezorgdag?: string
          contact_id?: string
          id?: string
          notitie?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_deliveries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_deliveries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outbound_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_messages: {
        Row: {
          aangemaakt_op: string
          agent_id: string
          campaign_id: string | null
          contact_id: string
          fout: string | null
          gepland_voor: string | null
          id: string
          onderwerp: string
          provider_id: string | null
          stap: number
          status: Database["public"]["Enums"]["bericht_status"]
          tekst: string
          verzonden_op: string | null
        }
        Insert: {
          aangemaakt_op?: string
          agent_id: string
          campaign_id?: string | null
          contact_id: string
          fout?: string | null
          gepland_voor?: string | null
          id?: string
          onderwerp: string
          provider_id?: string | null
          stap?: number
          status?: Database["public"]["Enums"]["bericht_status"]
          tekst: string
          verzonden_op?: string | null
        }
        Update: {
          aangemaakt_op?: string
          agent_id?: string
          campaign_id?: string | null
          contact_id?: string
          fout?: string | null
          gepland_voor?: string | null
          id?: string
          onderwerp?: string
          provider_id?: string | null
          stap?: number
          status?: Database["public"]["Enums"]["bericht_status"]
          tekst?: string
          verzonden_op?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outbound_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outbound_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_replies: {
        Row: {
          afgehandeld_op: string | null
          agent_id: string
          contact_id: string | null
          id: string
          message_id: string | null
          onderwerp: string | null
          ontvangen_op: string
          provider_id: string
          tekst: string
          van_email: string
          van_naam: string | null
        }
        Insert: {
          afgehandeld_op?: string | null
          agent_id: string
          contact_id?: string | null
          id?: string
          message_id?: string | null
          onderwerp?: string | null
          ontvangen_op?: string
          provider_id: string
          tekst?: string
          van_email: string
          van_naam?: string | null
        }
        Update: {
          afgehandeld_op?: string | null
          agent_id?: string
          contact_id?: string | null
          id?: string
          message_id?: string | null
          onderwerp?: string | null
          ontvangen_op?: string
          provider_id?: string
          tekst?: string
          van_email?: string
          van_naam?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_replies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_replies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outbound_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "outbound_messages"
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
      agent_month_summary: {
        Args: { _agent_id: string; _month_offset?: number }
        Returns: {
          boven_grens: number
          cache_read_tokens: number
          fair_use_per_month: number
          hourly_rate: number
          hourly_rate_basis: string
          input_tokens: number
          maand: string
          minutes_saved_basis: string
          minutes_saved_per_action: number
          output_tokens: number
          overage_bedrag: number
          overage_price: number
          requests: number
          ruwe_requests: number
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
      outbound_afmelden: { Args: { _sleutel: string }; Returns: undefined }
      outbound_meld_bounce: {
        Args: { _provider_id: string; _reden: string }
        Returns: undefined
      }
      outbound_vrijdagen: {
        Args: { _agent_id: string; _weken?: number }
        Returns: {
          afgesproken: number
          bezorgdag: string
        }[]
      }
      record_agent_tokens: {
        Args: {
          _agent_id: string
          _cache_read: number
          _input: number
          _output: number
        }
        Returns: undefined
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
        | "uitgaande_email"
      agent_status: "live" | "paused" | "setup"
      app_role: "admin" | "client"
      bericht_status:
        | "concept"
        | "gepland"
        | "verzonden"
        | "mislukt"
        | "beantwoord"
      contact_herkomst: "oud_klant" | "koud"
      verzendwijze: "concept" | "direct"
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
        "uitgaande_email",
      ],
      agent_status: ["live", "paused", "setup"],
      app_role: ["admin", "client"],
      bericht_status: [
        "concept",
        "gepland",
        "verzonden",
        "mislukt",
        "beantwoord",
      ],
      contact_herkomst: ["oud_klant", "koud"],
      verzendwijze: ["concept", "direct"],
    },
  },
} as const
