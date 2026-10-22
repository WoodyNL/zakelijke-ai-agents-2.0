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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      afspraak_wachtlijst: {
        Row: {
          aangeboden_op: string | null
          aangemaakt_op: string
          agent_id: string
          email: string
          id: string
          naam: string | null
          status: string
          telefoon: string | null
          voorkeur: string | null
        }
        Insert: {
          aangeboden_op?: string | null
          aangemaakt_op?: string
          agent_id: string
          email: string
          id?: string
          naam?: string | null
          status?: string
          telefoon?: string | null
          voorkeur?: string | null
        }
        Update: {
          aangeboden_op?: string | null
          aangemaakt_op?: string
          agent_id?: string
          email?: string
          id?: string
          naam?: string | null
          status?: string
          telefoon?: string | null
          voorkeur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afspraak_wachtlijst_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      afspraken: {
        Row: {
          aangemaakt_op: string
          agent_id: string
          begint_op: string
          bevestigd_op: string | null
          bijgewerkt_op: string
          bron: string
          eindigt_op: string | null
          extern_id: string
          herinnerd: Json
          id: string
          klant_email: string
          klant_naam: string | null
          laatste_reactie: string | null
          locatie: string | null
          no_show_opgevolgd_op: string | null
          omschrijving: string | null
          reactie_op: string | null
          status: string
          telefoon: string | null
        }
        Insert: {
          aangemaakt_op?: string
          agent_id: string
          begint_op: string
          bevestigd_op?: string | null
          bijgewerkt_op?: string
          bron?: string
          eindigt_op?: string | null
          extern_id?: string
          herinnerd?: Json
          id?: string
          klant_email: string
          klant_naam?: string | null
          laatste_reactie?: string | null
          locatie?: string | null
          no_show_opgevolgd_op?: string | null
          omschrijving?: string | null
          reactie_op?: string | null
          status?: string
          telefoon?: string | null
        }
        Update: {
          aangemaakt_op?: string
          agent_id?: string
          begint_op?: string
          bevestigd_op?: string | null
          bijgewerkt_op?: string
          bron?: string
          eindigt_op?: string | null
          extern_id?: string
          herinnerd?: Json
          id?: string
          klant_email?: string
          klant_naam?: string | null
          laatste_reactie?: string | null
          locatie?: string | null
          no_show_opgevolgd_op?: string | null
          omschrijving?: string | null
          reactie_op?: string | null
          status?: string
          telefoon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afspraken_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_gebeurtenissen: {
        Row: {
          agent_id: string
          door: string | null
          id: number
          naar: string | null
          op: string
          soort: string
          van: string | null
        }
        Insert: {
          agent_id: string
          door?: string | null
          id?: never
          naar?: string | null
          op?: string
          soort: string
          van?: string | null
        }
        Update: {
          agent_id?: string
          door?: string | null
          id?: never
          naar?: string | null
          op?: string
          soort?: string
          van?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_gebeurtenissen_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_gebeurtenissen_door_fkey"
            columns: ["door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          modules: string[] | null
          name: string
          notify_email: string | null
          opties: Json
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
          modules?: string[] | null
          name: string
          notify_email?: string | null
          opties?: Json
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
          modules?: string[] | null
          name?: string
          notify_email?: string | null
          opties?: Json
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
      beheerlog: {
        Row: {
          actie: string
          agent_id: string | null
          client_id: string | null
          details: Json
          door: string | null
          door_naam: string
          door_rol: string
          id: number
          moment: string
          omschrijving: string
        }
        Insert: {
          actie: string
          agent_id?: string | null
          client_id?: string | null
          details?: Json
          door?: string | null
          door_naam?: string
          door_rol?: string
          id?: never
          moment?: string
          omschrijving?: string
        }
        Update: {
          actie?: string
          agent_id?: string | null
          client_id?: string | null
          details?: Json
          door?: string | null
          door_naam?: string
          door_rol?: string
          id?: never
          moment?: string
          omschrijving?: string
        }
        Relationships: [
          {
            foreignKeyName: "beheerlog_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beheerlog_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beheerlog_door_fkey"
            columns: ["door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chatberichten: {
        Row: {
          gesprek_id: string
          id: number
          kennis_gemaakt_op: string | null
          onbeantwoord: boolean
          op: string
          rol: string
          tekst: string
        }
        Insert: {
          gesprek_id: string
          id?: never
          kennis_gemaakt_op?: string | null
          onbeantwoord?: boolean
          op?: string
          rol: string
          tekst: string
        }
        Update: {
          gesprek_id?: string
          id?: never
          kennis_gemaakt_op?: string | null
          onbeantwoord?: boolean
          op?: string
          rol?: string
          tekst?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatberichten_gesprek_id_fkey"
            columns: ["gesprek_id"]
            isOneToOne: false
            referencedRelation: "chatgesprekken"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgesprekken: {
        Row: {
          agent_id: string
          begonnen_op: string
          beurten: number
          id: string
          laatste_op: string
          lead_vastgelegd: boolean
          pagina: string | null
        }
        Insert: {
          agent_id: string
          begonnen_op?: string
          beurten?: number
          id?: string
          laatste_op?: string
          lead_vastgelegd?: boolean
          pagina?: string | null
        }
        Update: {
          agent_id?: string
          begonnen_op?: string
          beurten?: number
          id?: string
          laatste_op?: string
          lead_vastgelegd?: boolean
          pagina?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgesprekken_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      dagrapporten: {
        Row: {
          agent_id: string
          datum: string
          verstuurd_op: string
        }
        Insert: {
          agent_id: string
          datum: string
          verstuurd_op?: string
        }
        Update: {
          agent_id?: string
          datum?: string
          verstuurd_op?: string
        }
        Relationships: [
          {
            foreignKeyName: "dagrapporten_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      facturen: {
        Row: {
          aangemaakt_op: string
          agent_id: string
          bedrag: number
          betaald_op: string | null
          bijgewerkt_op: string
          bron: string
          factuurdatum: string
          id: string
          klant_email: string
          klant_naam: string | null
          laatste_herinnering_op: string | null
          laatste_reactie: string | null
          laatste_stap: number
          notitie: string | null
          nummer: string
          pauze_tot: string | null
          reactie_op: string | null
          status: string
          vervaldatum: string
        }
        Insert: {
          aangemaakt_op?: string
          agent_id: string
          bedrag: number
          betaald_op?: string | null
          bijgewerkt_op?: string
          bron?: string
          factuurdatum: string
          id?: string
          klant_email: string
          klant_naam?: string | null
          laatste_herinnering_op?: string | null
          laatste_reactie?: string | null
          laatste_stap?: number
          notitie?: string | null
          nummer: string
          pauze_tot?: string | null
          reactie_op?: string | null
          status?: string
          vervaldatum: string
        }
        Update: {
          aangemaakt_op?: string
          agent_id?: string
          bedrag?: number
          betaald_op?: string | null
          bijgewerkt_op?: string
          bron?: string
          factuurdatum?: string
          id?: string
          klant_email?: string
          klant_naam?: string | null
          laatste_herinnering_op?: string | null
          laatste_reactie?: string | null
          laatste_stap?: number
          notitie?: string | null
          nummer?: string
          pauze_tot?: string | null
          reactie_op?: string | null
          status?: string
          vervaldatum?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturen_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      factuur_herinneringen: {
        Row: {
          agent_id: string
          factuur_id: string
          id: number
          moment: number
          onderwerp: string | null
          provider_id: string | null
          stap: number
          tekst: string | null
          verstuurd_op: string
        }
        Insert: {
          agent_id: string
          factuur_id: string
          id?: never
          moment: number
          onderwerp?: string | null
          provider_id?: string | null
          stap: number
          tekst?: string | null
          verstuurd_op?: string
        }
        Update: {
          agent_id?: string
          factuur_id?: string
          id?: never
          moment?: number
          onderwerp?: string | null
          provider_id?: string | null
          stap?: number
          tekst?: string | null
          verstuurd_op?: string
        }
        Relationships: [
          {
            foreignKeyName: "factuur_herinneringen_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factuur_herinneringen_factuur_id_fkey"
            columns: ["factuur_id"]
            isOneToOne: false
            referencedRelation: "facturen"
            referencedColumns: ["id"]
          },
        ]
      }
      fair_use_meldingen: {
        Row: {
          agent_id: string
          drempel: number
          gebruikt: number
          gemeld_op: string
          grens: number
          maand: string
        }
        Insert: {
          agent_id: string
          drempel: number
          gebruikt: number
          gemeld_op?: string
          grens: number
          maand: string
        }
        Update: {
          agent_id?: string
          drempel?: number
          gebruikt?: number
          gemeld_op?: string
          grens?: number
          maand?: string
        }
        Relationships: [
          {
            foreignKeyName: "fair_use_meldingen_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      klantleden: {
        Row: {
          client_id: string
          toegevoegd_door: string | null
          toegevoegd_op: string
          user_id: string
        }
        Insert: {
          client_id: string
          toegevoegd_door?: string | null
          toegevoegd_op?: string
          user_id: string
        }
        Update: {
          client_id?: string
          toegevoegd_door?: string | null
          toegevoegd_op?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "klantleden_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klantleden_toegevoegd_door_fkey"
            columns: ["toegevoegd_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klantleden_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      meekijkpaginas: {
        Row: {
          bekeken_op: string
          id: number
          pad: string
          sessie_id: string
        }
        Insert: {
          bekeken_op?: string
          id?: never
          pad: string
          sessie_id: string
        }
        Update: {
          bekeken_op?: string
          id?: never
          pad?: string
          sessie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meekijkpaginas_sessie_id_fkey"
            columns: ["sessie_id"]
            isOneToOne: false
            referencedRelation: "meekijksessies"
            referencedColumns: ["id"]
          },
        ]
      }
      meekijksessies: {
        Row: {
          beheerder_id: string
          client_id: string
          gestart_op: string
          gestopt_op: string | null
          id: string
          reden: string
          verloopt_op: string
        }
        Insert: {
          beheerder_id: string
          client_id: string
          gestart_op?: string
          gestopt_op?: string | null
          id?: string
          reden: string
          verloopt_op?: string
        }
        Update: {
          beheerder_id?: string
          client_id?: string
          gestart_op?: string
          gestopt_op?: string | null
          id?: string
          reden?: string
          verloopt_op?: string
        }
        Relationships: [
          {
            foreignKeyName: "meekijksessies_beheerder_id_fkey"
            columns: ["beheerder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meekijksessies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offerte_aanvragen: {
        Row: {
          agent_id: string
          bedrijf: string | null
          besloten_op: string | null
          bijgewerkt_op: string
          concept_onderwerp: string | null
          concept_op: string | null
          concept_tekst: string | null
          fout: string | null
          geldig_tot: string | null
          id: string
          message_id: string | null
          onderwerp: string | null
          ontbreekt: Json
          ontvangen_op: string
          opvolging_provider_id: string | null
          provider_id: string
          regels: Json
          status: string
          toelichting: string | null
          totaal: number | null
          van_email: string
          van_naam: string | null
          verzonden_door: string | null
          verzonden_onderwerp: string | null
          verzonden_op: string | null
          verzonden_tekst: string | null
          vraag: string
        }
        Insert: {
          agent_id: string
          bedrijf?: string | null
          besloten_op?: string | null
          bijgewerkt_op?: string
          concept_onderwerp?: string | null
          concept_op?: string | null
          concept_tekst?: string | null
          fout?: string | null
          geldig_tot?: string | null
          id?: string
          message_id?: string | null
          onderwerp?: string | null
          ontbreekt?: Json
          ontvangen_op?: string
          opvolging_provider_id?: string | null
          provider_id: string
          regels?: Json
          status?: string
          toelichting?: string | null
          totaal?: number | null
          van_email: string
          van_naam?: string | null
          verzonden_door?: string | null
          verzonden_onderwerp?: string | null
          verzonden_op?: string | null
          verzonden_tekst?: string | null
          vraag?: string
        }
        Update: {
          agent_id?: string
          bedrijf?: string | null
          besloten_op?: string | null
          bijgewerkt_op?: string
          concept_onderwerp?: string | null
          concept_op?: string | null
          concept_tekst?: string | null
          fout?: string | null
          geldig_tot?: string | null
          id?: string
          message_id?: string | null
          onderwerp?: string | null
          ontbreekt?: Json
          ontvangen_op?: string
          opvolging_provider_id?: string | null
          provider_id?: string
          regels?: Json
          status?: string
          toelichting?: string | null
          totaal?: number | null
          van_email?: string
          van_naam?: string | null
          verzonden_door?: string | null
          verzonden_onderwerp?: string | null
          verzonden_op?: string | null
          verzonden_tekst?: string | null
          vraag?: string
        }
        Relationships: [
          {
            foreignKeyName: "offerte_aanvragen_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_aanvragen_verzonden_door_fkey"
            columns: ["verzonden_door"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          doelgroep: Database["public"]["Enums"]["campagne_doelgroep"]
          herkomst: Database["public"]["Enums"]["contact_herkomst"]
          id: string
          naam: string
          navraag_na_dagen: number
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
          doelgroep?: Database["public"]["Enums"]["campagne_doelgroep"]
          herkomst?: Database["public"]["Enums"]["contact_herkomst"]
          id?: string
          naam: string
          navraag_na_dagen?: number
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
          doelgroep?: Database["public"]["Enums"]["campagne_doelgroep"]
          herkomst?: Database["public"]["Enums"]["contact_herkomst"]
          id?: string
          naam?: string
          navraag_na_dagen?: number
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
          adres: string | null
          afgemeld_op: string | null
          afmeldsleutel: string
          agent_id: string
          bedrijf: string | null
          bounce_op: string | null
          email: string
          herkomst: Database["public"]["Enums"]["contact_herkomst"]
          id: string
          in_bezorggebied: boolean | null
          laatst_besteld_op: string | null
          naam: string | null
          notitie: string | null
          plaats: string | null
          postcode: string | null
          prioriteit: number | null
          telefoon: string | null
          teruggekomen_op: string | null
        }
        Insert: {
          aangemaakt_op?: string
          adres?: string | null
          afgemeld_op?: string | null
          afmeldsleutel?: string
          agent_id: string
          bedrijf?: string | null
          bounce_op?: string | null
          email: string
          herkomst?: Database["public"]["Enums"]["contact_herkomst"]
          id?: string
          in_bezorggebied?: boolean | null
          laatst_besteld_op?: string | null
          naam?: string | null
          notitie?: string | null
          plaats?: string | null
          postcode?: string | null
          prioriteit?: number | null
          telefoon?: string | null
          teruggekomen_op?: string | null
        }
        Update: {
          aangemaakt_op?: string
          adres?: string | null
          afgemeld_op?: string | null
          afmeldsleutel?: string
          agent_id?: string
          bedrijf?: string | null
          bounce_op?: string | null
          email?: string
          herkomst?: Database["public"]["Enums"]["contact_herkomst"]
          id?: string
          in_bezorggebied?: boolean | null
          laatst_besteld_op?: string | null
          naam?: string | null
          notitie?: string | null
          plaats?: string | null
          postcode?: string | null
          prioriteit?: number | null
          telefoon?: string | null
          teruggekomen_op?: string | null
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
          adres_bron: string | null
          adres_eerder: string | null
          agent_id: string
          bevestiging: Database["public"]["Enums"]["bevestiging_stand"]
          bevestiging_op: string | null
          bezorgdag: string
          contact_id: string
          id: string
          notitie: string | null
          opvolging: Database["public"]["Enums"]["opvolging_stand"]
          opvolging_notitie: string | null
          opvolging_op: string | null
          status: string
        }
        Insert: {
          aangemaakt_op?: string
          adres?: string | null
          adres_bron?: string | null
          adres_eerder?: string | null
          agent_id: string
          bevestiging?: Database["public"]["Enums"]["bevestiging_stand"]
          bevestiging_op?: string | null
          bezorgdag: string
          contact_id: string
          id?: string
          notitie?: string | null
          opvolging?: Database["public"]["Enums"]["opvolging_stand"]
          opvolging_notitie?: string | null
          opvolging_op?: string | null
          status?: string
        }
        Update: {
          aangemaakt_op?: string
          adres?: string | null
          adres_bron?: string | null
          adres_eerder?: string | null
          agent_id?: string
          bevestiging?: Database["public"]["Enums"]["bevestiging_stand"]
          bevestiging_op?: string | null
          bezorgdag?: string
          contact_id?: string
          id?: string
          notitie?: string | null
          opvolging?: Database["public"]["Enums"]["opvolging_stand"]
          opvolging_notitie?: string | null
          opvolging_op?: string | null
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
          in_antwoord_op: string | null
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
          in_antwoord_op?: string | null
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
          in_antwoord_op?: string | null
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
          {
            foreignKeyName: "outbound_messages_in_antwoord_op_fkey"
            columns: ["in_antwoord_op"]
            isOneToOne: false
            referencedRelation: "outbound_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_replies: {
        Row: {
          beoordeeld_op: string | null
          beoordeling: string | null
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
          beoordeeld_op?: string | null
          beoordeling?: string | null
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
          beoordeeld_op?: string | null
          beoordeling?: string | null
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
      postvak_koppelingen: {
        Row: {
          agent_id: string
          cursor: string | null
          email: string
          gekoppeld_door: string | null
          gekoppeld_op: string
          id: string
          laatste_fout: string | null
          laatste_keer: string | null
          map: string
          naam: string | null
          provider: string
          status: string
        }
        Insert: {
          agent_id: string
          cursor?: string | null
          email: string
          gekoppeld_door?: string | null
          gekoppeld_op?: string
          id?: string
          laatste_fout?: string | null
          laatste_keer?: string | null
          map?: string
          naam?: string | null
          provider: string
          status?: string
        }
        Update: {
          agent_id?: string
          cursor?: string | null
          email?: string
          gekoppeld_door?: string | null
          gekoppeld_op?: string
          id?: string
          laatste_fout?: string | null
          laatste_keer?: string | null
          map?: string
          naam?: string | null
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "postvak_koppelingen_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postvak_koppelingen_gekoppeld_door_fkey"
            columns: ["gekoppeld_door"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      review_verzoeken: {
        Row: {
          aangemaakt_op: string
          agent_id: string
          email: string
          id: string
          klaar_op: string
          klacht: boolean
          naam: string | null
          notitie: string | null
          provider_id: string | null
          status: string
          verstuurd_op: string | null
        }
        Insert: {
          aangemaakt_op?: string
          agent_id: string
          email: string
          id?: string
          klaar_op?: string
          klacht?: boolean
          naam?: string | null
          notitie?: string | null
          provider_id?: string | null
          status?: string
          verstuurd_op?: string | null
        }
        Update: {
          aangemaakt_op?: string
          agent_id?: string
          email?: string
          id?: string
          klaar_op?: string
          klacht?: boolean
          naam?: string | null
          notitie?: string | null
          provider_id?: string | null
          status?: string
          verstuurd_op?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_verzoeken_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          aangemaakt_op: string
          agent_id: string
          antwoord: string | null
          beantwoord_op: string | null
          bron: string
          concept_antwoord: string | null
          concept_op: string | null
          extern_id: string | null
          geplaatst_op: string
          id: string
          naam: string | null
          sterren: number
          tekst: string
        }
        Insert: {
          aangemaakt_op?: string
          agent_id: string
          antwoord?: string | null
          beantwoord_op?: string | null
          bron?: string
          concept_antwoord?: string | null
          concept_op?: string | null
          extern_id?: string | null
          geplaatst_op?: string
          id?: string
          naam?: string | null
          sterren: number
          tekst?: string
        }
        Update: {
          aangemaakt_op?: string
          agent_id?: string
          antwoord?: string | null
          beantwoord_op?: string | null
          bron?: string
          concept_antwoord?: string | null
          concept_op?: string | null
          extern_id?: string | null
          geplaatst_op?: string
          id?: string
          naam?: string | null
          sterren?: number
          tekst?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          agent_id: string
          bedrijf: string | null
          bericht: string
          bijgewerkt_op: string
          bron: string
          concept_onderwerp: string | null
          concept_op: string | null
          concept_tekst: string | null
          email: string
          fout: string | null
          id: string
          message_id: string | null
          naam: string | null
          notitie: string | null
          ontvangen_op: string
          oordeel: string | null
          provider_id: string
          reden: string | null
          status: string
          telefoon: string | null
          verzonden_door: string | null
          verzonden_op: string | null
          verzonden_tekst: string | null
          vragen: Json
        }
        Insert: {
          agent_id: string
          bedrijf?: string | null
          bericht?: string
          bijgewerkt_op?: string
          bron?: string
          concept_onderwerp?: string | null
          concept_op?: string | null
          concept_tekst?: string | null
          email: string
          fout?: string | null
          id?: string
          message_id?: string | null
          naam?: string | null
          notitie?: string | null
          ontvangen_op?: string
          oordeel?: string | null
          provider_id: string
          reden?: string | null
          status?: string
          telefoon?: string | null
          verzonden_door?: string | null
          verzonden_op?: string | null
          verzonden_tekst?: string | null
          vragen?: Json
        }
        Update: {
          agent_id?: string
          bedrijf?: string | null
          bericht?: string
          bijgewerkt_op?: string
          bron?: string
          concept_onderwerp?: string | null
          concept_op?: string | null
          concept_tekst?: string | null
          email?: string
          fout?: string | null
          id?: string
          message_id?: string | null
          naam?: string | null
          notitie?: string | null
          ontvangen_op?: string
          oordeel?: string | null
          provider_id?: string
          reden?: string | null
          status?: string
          telefoon?: string | null
          verzonden_door?: string | null
          verzonden_op?: string | null
          verzonden_tekst?: string | null
          vragen?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sales_leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_leads_verzonden_door_fkey"
            columns: ["verzonden_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_instellingen: {
        Row: {
          afzender_email: string | null
          afzender_naam: string | null
          agent_id: string
          bijgewerkt_op: string
          kanaal: string
          modus: string
          ondertekening: string | null
        }
        Insert: {
          afzender_email?: string | null
          afzender_naam?: string | null
          agent_id: string
          bijgewerkt_op?: string
          kanaal?: string
          modus?: string
          ondertekening?: string | null
        }
        Update: {
          afzender_email?: string | null
          afzender_naam?: string | null
          agent_id?: string
          bijgewerkt_op?: string
          kanaal?: string
          modus?: string
          ondertekening?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_instellingen_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      support_mails: {
        Row: {
          agent_id: string
          bijgewerkt_op: string
          bronnen: string[]
          categorie: string | null
          concept_onderwerp: string | null
          concept_tekst: string | null
          fout: string | null
          gesprek_id: string | null
          id: string
          message_id: string | null
          onderwerp: string | null
          ontvangen_op: string
          provider_id: string
          status: string
          toelichting: string | null
          van_email: string
          van_naam: string | null
          verzonden_door: string | null
          verzonden_onderwerp: string | null
          verzonden_op: string | null
          verzonden_tekst: string | null
          vraag: string
          zekerheid: string | null
        }
        Insert: {
          agent_id: string
          bijgewerkt_op?: string
          bronnen?: string[]
          categorie?: string | null
          concept_onderwerp?: string | null
          concept_tekst?: string | null
          fout?: string | null
          gesprek_id?: string | null
          id?: string
          message_id?: string | null
          onderwerp?: string | null
          ontvangen_op?: string
          provider_id: string
          status?: string
          toelichting?: string | null
          van_email: string
          van_naam?: string | null
          verzonden_door?: string | null
          verzonden_onderwerp?: string | null
          verzonden_op?: string | null
          verzonden_tekst?: string | null
          vraag?: string
          zekerheid?: string | null
        }
        Update: {
          agent_id?: string
          bijgewerkt_op?: string
          bronnen?: string[]
          categorie?: string | null
          concept_onderwerp?: string | null
          concept_tekst?: string | null
          fout?: string | null
          gesprek_id?: string | null
          id?: string
          message_id?: string | null
          onderwerp?: string | null
          ontvangen_op?: string
          provider_id?: string
          status?: string
          toelichting?: string | null
          van_email?: string
          van_naam?: string | null
          verzonden_door?: string | null
          verzonden_onderwerp?: string | null
          verzonden_op?: string | null
          verzonden_tekst?: string | null
          vraag?: string
          zekerheid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_mails_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_mails_verzonden_door_fkey"
            columns: ["verzonden_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      systeemtaken: {
        Row: {
          laatste_run: string
          naam: string
          uitkomst: Json
        }
        Insert: {
          laatste_run?: string
          naam: string
          uitkomst?: Json
        }
        Update: {
          laatste_run?: string
          naam?: string
          uitkomst?: Json
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
      whatsapp_berichten: {
        Row: {
          agent_id: string
          door: string
          fout: string | null
          gesprek_id: string
          id: number
          op: string
          richting: string
          status: string
          tekst: string
          wa_id: string | null
        }
        Insert: {
          agent_id: string
          door?: string
          fout?: string | null
          gesprek_id: string
          id?: never
          op?: string
          richting: string
          status?: string
          tekst?: string
          wa_id?: string | null
        }
        Update: {
          agent_id?: string
          door?: string
          fout?: string | null
          gesprek_id?: string
          id?: never
          op?: string
          richting?: string
          status?: string
          tekst?: string
          wa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_berichten_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_berichten_gesprek_id_fkey"
            columns: ["gesprek_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_gesprekken"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_gesprekken: {
        Row: {
          aangemaakt_op: string
          agent_id: string
          gestart_op: string | null
          id: string
          laatste_bericht: string | null
          laatste_inkomend_op: string | null
          laatste_op: string
          lead_id: string | null
          naam: string | null
          overdracht_reden: string | null
          overgedragen_op: string | null
          status: string
          telefoon: string
        }
        Insert: {
          aangemaakt_op?: string
          agent_id: string
          gestart_op?: string | null
          id?: string
          laatste_bericht?: string | null
          laatste_inkomend_op?: string | null
          laatste_op?: string
          lead_id?: string | null
          naam?: string | null
          overdracht_reden?: string | null
          overgedragen_op?: string | null
          status?: string
          telefoon: string
        }
        Update: {
          aangemaakt_op?: string
          agent_id?: string
          gestart_op?: string | null
          id?: string
          laatste_bericht?: string | null
          laatste_inkomend_op?: string | null
          laatste_op?: string
          lead_id?: string | null
          naam?: string | null
          overdracht_reden?: string | null
          overgedragen_op?: string | null
          status?: string
          telefoon?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_gesprekken_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_gesprekken_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      afspraken_kerncijfers: {
        Args: { _agent_id: string; _dagen?: number }
        Returns: {
          afgerond: number
          afspraken: number
          bevestigd: number
          komende_week: number
          no_show_percentage: number
          no_shows: number
          verzet: number
          wachtlijst: number
        }[]
      }
      agent_gebeurtenissen_van: {
        Args: { _agent_id: string }
        Returns: {
          door: string
          id: number
          naar: string
          op: string
          soort: string
          van: string
        }[]
      }
      agent_kerncijfers: {
        Args: { _agent_id: string; _dagen?: number }
        Returns: {
          gesprekken: number
          laatste_activiteit: string
          leads: number
        }[]
      }
      agent_knowledge: {
        Args: { _slug: string }
        Returns: {
          category: string
          content: string
          question: string
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
      ben_eigenaar: { Args: never; Returns: boolean }
      claim_agent_request: { Args: { _agent_id: string }; Returns: boolean }
      facturen_kerncijfers: {
        Args: { _agent_id: string; _dagen?: number }
        Returns: {
          betaald: number
          betaald_na_herinnering: number
          betaaltermijn_dagen: number
          herinnerd: number
          open_aantal: number
          open_bedrag: number
          over_termijn_aantal: number
          over_termijn_bedrag: number
        }[]
      }
      fair_use_melding: {
        Args: { _agent_id: string }
        Returns: {
          agent: string
          drempel: number
          gebruikt: number
          grens: number
          klant: string
          klant_email: string
          meld_email: string
        }[]
      }
      heeft_tweestaps: { Args: never; Returns: boolean }
      heractivatie_kerncijfers: {
        Args: { _agent_id: string; _dagen?: number }
        Returns: {
          aangeschreven: number
          afgemeld: number
          gereageerd: number
          in_lijst: number
          teruggekomen: number
        }[]
      }
      leg_vast: {
        Args: {
          _actie: string
          _agent_id?: string
          _client_id?: string
          _details?: Json
          _omschrijving?: string
        }
        Returns: undefined
      }
      log_meekijkpagina: { Args: { _pad: string }; Returns: undefined }
      markeer_teruggekomen: {
        Args: { _contact_id: string; _terug: boolean }
        Returns: string
      }
      markeer_vraag_afgehandeld: {
        Args: { _bericht_id: number }
        Returns: boolean
      }
      mijn_klant: { Args: never; Returns: string }
      mijn_logboek: {
        Args: { _aantal?: number }
        Returns: {
          actie: string
          door: string
          door_rol: string
          id: number
          moment: string
          omschrijving: string
        }[]
      }
      mijn_meekijksessie: {
        Args: never
        Returns: {
          client_id: string
          id: string
          klant: string
          reden: string
          verloopt_op: string
        }[]
      }
      mijn_team: {
        Args: never
        Returns: {
          eigenaar: boolean
          email: string
          naam: string
          sinds: string
          user_id: string
        }[]
      }
      mijn_toegangslog: {
        Args: never
        Returns: {
          beheerder: string
          geeindigd_op: string
          gestart_op: string
          id: string
          paginas: string[]
          reden: string
        }[]
      }
      mijn_toegangsniveau: { Args: never; Returns: string }
      mijn_tweestaps: {
        Args: never
        Returns: {
          ingesteld: boolean
          niveau: string
        }[]
      }
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
      noteer_chatbeurt: {
        Args: {
          _agent_id: string
          _antwoord: string
          _gesprek: string
          _lead?: boolean
          _onbeantwoord?: boolean
          _pagina?: string
          _vraag: string
        }
        Returns: string
      }
      offerte_kerncijfers: {
        Args: { _agent_id: string; _dagen?: number }
        Returns: {
          aanvragen: number
          afgewezen: number
          concepten: number
          geaccepteerd: number
          mens_nodig: number
          omzet: number
          open: number
          reactie_minuten: number
          verstuurd: number
        }[]
      }
      onbeantwoorde_vragen: {
        Args: { _agent_id: string; _limiet?: number }
        Returns: {
          antwoord: string
          bericht_id: number
          gesprek_id: string
          op: string
          vraag: string
        }[]
      }
      outbound_afmelden: { Args: { _sleutel: string }; Returns: undefined }
      outbound_meld_bounce: {
        Args: { _provider_id: string; _reden: string }
        Returns: {
          agent: string
          agent_gepauzeerd: boolean
          agent_id: string
          campagne: string
          campagne_gestopt: boolean
          campagne_id: string
          drempel: number
          klant: string
          klant_email: string
          meld_email: string
          onbezorgbaar: number
          percentage: number
          soort: string
          verzonden: number
        }[]
      }
      outbound_trechter: {
        Args: { _agent_id: string }
        Returns: {
          aangeschreven: number
          afgemeld: number
          afspraak: number
          bereikbaar: number
          bezorgd: number
          contacten: number
          gebouncet: number
          gesproken: number
          in_gesprek: number
          klant: number
          opgevolgd: number
        }[]
      }
      outbound_vrijdagen: {
        Args: { _agent_id: string; _weken?: number }
        Returns: {
          afgesproken: number
          bezorgdag: string
        }[]
      }
      postvak_koppel: {
        Args: {
          _agent_id: string
          _door?: string
          _email: string
          _map: string
          _naam: string
          _provider: string
          _toegang: string
          _verloopt_op: string
          _vernieuwen: string
        }
        Returns: string
      }
      postvak_ontkoppel: { Args: { _agent_id: string }; Returns: boolean }
      postvak_sleutels: {
        Args: { _agent_id: string }
        Returns: {
          cursor: string
          email: string
          koppeling_id: string
          map: string
          provider: string
          toegang: string
          verloopt_op: string
          vernieuwen: string
        }[]
      }
      postvak_stand: {
        Args: { _agent_id: string; _cursor: string; _fout?: string }
        Returns: undefined
      }
      postvak_vernieuwd: {
        Args: { _agent_id: string; _toegang: string; _verloopt_op: string }
        Returns: undefined
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
      review_kerncijfers: {
        Args: { _agent_id: string; _dagen?: number }
        Returns: {
          gemiddelde: number
          onbeantwoord: number
          reviews: number
          reviews_per_verzoek: number
          verzoeken: number
        }[]
      }
      ruim_op: {
        Args: never
        Returns: {
          soort: string
          verwijderd: number
        }[]
      }
      ruim_op_indien_nodig: { Args: never; Returns: Json }
      sales_kerncijfers: {
        Args: { _agent_id: string; _dagen?: number }
        Returns: {
          afgewezen: number
          afspraken: number
          gekwalificeerd: number
          gewonnen: number
          leads: number
          open: number
          reactie_minuten: number
          twijfel: number
        }[]
      }
      start_meekijken: {
        Args: { _client_id: string; _reden: string }
        Returns: {
          client_id: string
          id: string
          verloopt_op: string
        }[]
      }
      stop_meekijken: { Args: never; Returns: undefined }
      support_kerncijfers: {
        Args: { _agent_id: string; _dagen?: number }
        Returns: {
          automatisch: number
          binnen: number
          mens_nodig: number
          ongewijzigd: number
          open: number
          reactie_minuten: number
          via_concept: number
        }[]
      }
      update_my_agent: {
        Args: { _agent_id: string; _tone: string; _welcome_text: string }
        Returns: boolean
      }
      werk_klant: { Args: never; Returns: string }
      whatsapp_kerncijfers: {
        Args: { _agent_id: string; _dagen?: number }
        Returns: {
          berichten_in: number
          berichten_uit: number
          door_agent: number
          gesprekken: number
          open_overgedragen: number
          overdrachten: number
          reactie_seconden: number
        }[]
      }
      zet_agent_pauze: {
        Args: { _agent_id: string; _pauze: boolean }
        Returns: string
      }
      zet_mijn_agent_opties: {
        Args: { _agent_id: string; _opties: Json }
        Returns: Json
      }
      zet_mijn_agent_velden: {
        Args: {
          _agent_id: string
          _capture_leads?: boolean
          _notify_email?: string
          _tone?: string
          _welcome_text?: string
        }
        Returns: undefined
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
        | "heractivatie"
        | "offerte"
        | "betaalherinnering"
        | "reviews"
        | "afspraken"
      agent_status: "live" | "paused" | "setup"
      app_role: "admin" | "client" | "support"
      bericht_status:
        | "concept"
        | "gepland"
        | "verzonden"
        | "mislukt"
        | "beantwoord"
      bevestiging_stand:
        | "niet_gevraagd"
        | "gevraagd"
        | "bevestigd"
        | "ander_adres"
        | "verzet"
        | "afgezegd"
      campagne_doelgroep: "alles" | "binnen_gebied" | "buiten_gebied"
      contact_herkomst: "oud_klant" | "koud" | "test"
      opvolging_stand:
        | "open"
        | "navraag_uit"
        | "wil_gesprek"
        | "gebeld"
        | "bezocht"
        | "klant"
        | "geen_interesse"
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
        "heractivatie",
        "offerte",
        "betaalherinnering",
        "reviews",
        "afspraken",
      ],
      agent_status: ["live", "paused", "setup"],
      app_role: ["admin", "client", "support"],
      bericht_status: [
        "concept",
        "gepland",
        "verzonden",
        "mislukt",
        "beantwoord",
      ],
      bevestiging_stand: [
        "niet_gevraagd",
        "gevraagd",
        "bevestigd",
        "ander_adres",
        "verzet",
        "afgezegd",
      ],
      campagne_doelgroep: ["alles", "binnen_gebied", "buiten_gebied"],
      contact_herkomst: ["oud_klant", "koud", "test"],
      opvolging_stand: [
        "open",
        "navraag_uit",
        "wil_gesprek",
        "gebeld",
        "bezocht",
        "klant",
        "geen_interesse",
      ],
      verzendwijze: ["concept", "direct"],
    },
  },
} as const
