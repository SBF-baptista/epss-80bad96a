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
          created_at: string
          id: string
          model: string
          notes: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["homologation_status"]
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          model: string
          notes?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["homologation_status"]
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          model?: string
          notes?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["homologation_status"]
          updated_at?: string
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
          status: Database["public"]["Enums"]["status_pedido"]
          usuario_id: string
        }
        Insert: {
          configuracao: string
          created_at?: string
          data?: string
          id?: string
          numero_pedido: string
          status?: Database["public"]["Enums"]["status_pedido"]
          usuario_id: string
        }
        Update: {
          configuracao?: string
          created_at?: string
          data?: string
          id?: string
          numero_pedido?: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
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
    },
  },
} as const
