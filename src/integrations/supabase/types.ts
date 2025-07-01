export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      automation_rules_extended: {
        Row: {
          brand: string
          category: string
          configuration: string
          created_at: string | null
          id: number
          model: string
          model_year: string | null
          tracker_model: string
        }
        Insert: {
          brand: string
          category: string
          configuration: string
          created_at?: string | null
          id?: number
          model: string
          model_year?: string | null
          tracker_model: string
        }
        Update: {
          brand?: string
          category?: string
          configuration?: string
          created_at?: string | null
          id?: number
          model?: string
          model_year?: string | null
          tracker_model?: string
        }
        Relationships: []
      }
      homologation_cards: {
        Row: {
          brand: string
          configuration: string | null
          created_at: string
          created_order_id: string | null
          id: string
          incoming_vehicle_id: string | null
          model: string
          notes: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["homologation_status"]
          updated_at: string
          year: number | null
        }
        Insert: {
          brand: string
          configuration?: string | null
          created_at?: string
          created_order_id?: string | null
          id?: string
          incoming_vehicle_id?: string | null
          model: string
          notes?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["homologation_status"]
          updated_at?: string
          year?: number | null
        }
        Update: {
          brand?: string
          configuration?: string | null
          created_at?: string
          created_order_id?: string | null
          id?: string
          incoming_vehicle_id?: string | null
          model?: string
          notes?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["homologation_status"]
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homologation_cards_created_order_id_fkey"
            columns: ["created_order_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homologation_cards_created_order_id_fkey"
            columns: ["created_order_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "homologation_cards_incoming_vehicle_id_fkey"
            columns: ["incoming_vehicle_id"]
            isOneToOne: false
            referencedRelation: "incoming_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homologation_cards_incoming_vehicle_id_fkey"
            columns: ["incoming_vehicle_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["incoming_vehicle_id"]
          },
        ]
      }
      homologation_photos: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          homologation_card_id: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          homologation_card_id: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          homologation_card_id?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homologation_photos_homologation_card_id_fkey"
            columns: ["homologation_card_id"]
            isOneToOne: false
            referencedRelation: "homologation_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homologation_photos_homologation_card_id_fkey"
            columns: ["homologation_card_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["homologation_id"]
          },
        ]
      }
      incoming_vehicles: {
        Row: {
          brand: string
          created_at: string
          created_homologation_id: string | null
          created_order_id: string | null
          id: string
          processed: boolean
          processing_notes: string | null
          quantity: number | null
          received_at: string
          usage_type: Database["public"]["Enums"]["vehicle_usage_type"]
          vehicle: string
          year: number | null
        }
        Insert: {
          brand: string
          created_at?: string
          created_homologation_id?: string | null
          created_order_id?: string | null
          id?: string
          processed?: boolean
          processing_notes?: string | null
          quantity?: number | null
          received_at?: string
          usage_type: Database["public"]["Enums"]["vehicle_usage_type"]
          vehicle: string
          year?: number | null
        }
        Update: {
          brand?: string
          created_at?: string
          created_homologation_id?: string | null
          created_order_id?: string | null
          id?: string
          processed?: boolean
          processing_notes?: string | null
          quantity?: number | null
          received_at?: string
          usage_type?: Database["public"]["Enums"]["vehicle_usage_type"]
          vehicle?: string
          year?: number | null
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          configuracao: string
          created_at: string
          data: string
          id: string
          numero_pedido: string
          production_completed_at: string | null
          production_notes: string | null
          production_started_at: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          usuario_id: string
        }
        Insert: {
          configuracao: string
          created_at?: string
          data?: string
          id?: string
          numero_pedido: string
          production_completed_at?: string | null
          production_notes?: string | null
          production_started_at?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          usuario_id: string
        }
        Update: {
          configuracao?: string
          created_at?: string
          data?: string
          id?: string
          numero_pedido?: string
          production_completed_at?: string | null
          production_notes?: string | null
          production_started_at?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      production_items: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          imei: string
          pedido_id: string
          production_line_code: string
          scanned_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          imei: string
          pedido_id: string
          production_line_code: string
          scanned_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          imei?: string
          pedido_id?: string
          production_line_code?: string
          scanned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["order_id"]
          },
        ]
      }
      rastreadores: {
        Row: {
          created_at: string
          id: string
          modelo: string
          pedido_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          modelo: string
          pedido_id: string
          quantidade?: number
        }
        Update: {
          created_at?: string
          id?: string
          modelo?: string
          pedido_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "rastreadores_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rastreadores_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["order_id"]
          },
        ]
      }
      usuarios: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          created_at: string
          id: string
          marca: string
          modelo: string
          pedido_id: string
          quantidade: number
          tipo: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          marca: string
          modelo: string
          pedido_id: string
          quantidade?: number
          tipo?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          marca?: string
          modelo?: string
          pedido_id?: string
          quantidade?: number
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["order_id"]
          },
        ]
      }
    }
    Views: {
      workflow_chain: {
        Row: {
          brand: string | null
          homologation_created_at: string | null
          homologation_id: string | null
          homologation_status:
            | Database["public"]["Enums"]["homologation_status"]
            | null
          homologation_updated_at: string | null
          incoming_processed: boolean | null
          incoming_vehicle_id: string | null
          order_created_at: string | null
          order_id: string | null
          order_number: string | null
          order_status: Database["public"]["Enums"]["status_pedido"] | null
          processing_notes: string | null
          quantity: number | null
          received_at: string | null
          usage_type: Database["public"]["Enums"]["vehicle_usage_type"] | null
          vehicle: string | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      homologation_status:
        | "homologar"
        | "em_homologacao"
        | "em_testes_finais"
        | "homologado"
      status_pedido: "novos" | "producao" | "aguardando" | "enviado" | "standby"
      vehicle_usage_type: "particular" | "comercial" | "frota"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      homologation_status: [
        "homologar",
        "em_homologacao",
        "em_testes_finais",
        "homologado",
      ],
      status_pedido: ["novos", "producao", "aguardando", "enviado", "standby"],
      vehicle_usage_type: ["particular", "comercial", "frota"],
    },
  },
} as const
