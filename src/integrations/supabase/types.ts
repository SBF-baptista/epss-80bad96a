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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accessories: {
        Row: {
          categories: string | null
          company_name: string | null
          created_at: string
          id: string
          incoming_vehicle_group_id: string | null
          name: string
          pedido_id: string | null
          quantity: number
          received_at: string
          usage_type: string | null
          vehicle_id: string | null
        }
        Insert: {
          categories?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          incoming_vehicle_group_id?: string | null
          name: string
          pedido_id?: string | null
          quantity?: number
          received_at?: string
          usage_type?: string | null
          vehicle_id?: string | null
        }
        Update: {
          categories?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          incoming_vehicle_group_id?: string | null
          name?: string
          pedido_id?: string | null
          quantity?: number
          received_at?: string
          usage_type?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accessories_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessories_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "accessories_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "incoming_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessories_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["incoming_vehicle_id"]
          },
          {
            foreignKeyName: "fk_accessories_vehicle"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "incoming_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_accessories_vehicle"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["incoming_vehicle_id"]
          },
        ]
      }
      app_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          module: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          module: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          module?: string
          user_id?: string | null
        }
        Relationships: []
      }
      automation_rule_photos: {
        Row: {
          automation_rule_id: number
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          automation_rule_id: number
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          automation_rule_id?: number
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_automation_rule_photos_rule_id"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules_extended"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules_extended: {
        Row: {
          brand: string
          category: string
          configuration: string
          created_at: string | null
          id: number
          model: string
          model_year: string | null
          notes: string | null
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
          notes?: string | null
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
          notes?: string | null
          tracker_model?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          accessories: string[] | null
          address_city: string
          address_complement: string | null
          address_neighborhood: string
          address_number: string
          address_postal_code: string
          address_state: string
          address_street: string
          company_name: string | null
          contacts: Json | null
          contract_number: string | null
          created_at: string
          created_by: string | null
          decision_maker_email: string | null
          decision_maker_name: string | null
          decision_maker_phone: string | null
          decision_maker_role: string | null
          document_number: string
          document_type: string
          email: string
          has_installation_particularity: boolean | null
          id: string
          influencer_email: string | null
          influencer_name: string | null
          influencer_phone: string | null
          influencer_role: string | null
          installation_locations: Json | null
          installation_particularity_details: string | null
          kickoff_notes: string | null
          modules: string[] | null
          name: string
          needs_accelerator_blocking: boolean | null
          needs_blocking: boolean | null
          needs_engine_blocking: boolean | null
          needs_fuel_blocking: boolean | null
          operations_contact_email: string | null
          operations_contact_name: string | null
          operations_contact_phone: string | null
          operations_contact_role: string | null
          package_name: string | null
          phone: string
          sale_summary_id: number | null
          sales_representative: string | null
          show_in_planning: boolean
          total_value: number | null
          updated_at: string
          vehicles: Json | null
        }
        Insert: {
          accessories?: string[] | null
          address_city: string
          address_complement?: string | null
          address_neighborhood: string
          address_number: string
          address_postal_code: string
          address_state: string
          address_street: string
          company_name?: string | null
          contacts?: Json | null
          contract_number?: string | null
          created_at?: string
          created_by?: string | null
          decision_maker_email?: string | null
          decision_maker_name?: string | null
          decision_maker_phone?: string | null
          decision_maker_role?: string | null
          document_number: string
          document_type: string
          email: string
          has_installation_particularity?: boolean | null
          id?: string
          influencer_email?: string | null
          influencer_name?: string | null
          influencer_phone?: string | null
          influencer_role?: string | null
          installation_locations?: Json | null
          installation_particularity_details?: string | null
          kickoff_notes?: string | null
          modules?: string[] | null
          name: string
          needs_accelerator_blocking?: boolean | null
          needs_blocking?: boolean | null
          needs_engine_blocking?: boolean | null
          needs_fuel_blocking?: boolean | null
          operations_contact_email?: string | null
          operations_contact_name?: string | null
          operations_contact_phone?: string | null
          operations_contact_role?: string | null
          package_name?: string | null
          phone: string
          sale_summary_id?: number | null
          sales_representative?: string | null
          show_in_planning?: boolean
          total_value?: number | null
          updated_at?: string
          vehicles?: Json | null
        }
        Update: {
          accessories?: string[] | null
          address_city?: string
          address_complement?: string | null
          address_neighborhood?: string
          address_number?: string
          address_postal_code?: string
          address_state?: string
          address_street?: string
          company_name?: string | null
          contacts?: Json | null
          contract_number?: string | null
          created_at?: string
          created_by?: string | null
          decision_maker_email?: string | null
          decision_maker_name?: string | null
          decision_maker_phone?: string | null
          decision_maker_role?: string | null
          document_number?: string
          document_type?: string
          email?: string
          has_installation_particularity?: boolean | null
          id?: string
          influencer_email?: string | null
          influencer_name?: string | null
          influencer_phone?: string | null
          influencer_role?: string | null
          installation_locations?: Json | null
          installation_particularity_details?: string | null
          kickoff_notes?: string | null
          modules?: string[] | null
          name?: string
          needs_accelerator_blocking?: boolean | null
          needs_blocking?: boolean | null
          needs_engine_blocking?: boolean | null
          needs_fuel_blocking?: boolean | null
          operations_contact_email?: string | null
          operations_contact_name?: string | null
          operations_contact_phone?: string | null
          operations_contact_role?: string | null
          package_name?: string | null
          phone?: string
          sale_summary_id?: number | null
          sales_representative?: string | null
          show_in_planning?: boolean
          total_value?: number | null
          updated_at?: string
          vehicles?: Json | null
        }
        Relationships: []
      }
      homologation_cards: {
        Row: {
          brand: string
          chassis_info: string | null
          configuration: string | null
          created_at: string
          created_order_id: string | null
          deleted_at: string | null
          electrical_connection_type: string | null
          id: string
          incoming_vehicle_id: string | null
          installation_photos: string[] | null
          manufacture_year: number | null
          model: string
          notes: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["homologation_status"]
          technical_observations: string | null
          test_checklist: Json | null
          test_location: string | null
          test_scheduled_date: string | null
          test_technician: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          brand: string
          chassis_info?: string | null
          configuration?: string | null
          created_at?: string
          created_order_id?: string | null
          deleted_at?: string | null
          electrical_connection_type?: string | null
          id?: string
          incoming_vehicle_id?: string | null
          installation_photos?: string[] | null
          manufacture_year?: number | null
          model: string
          notes?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["homologation_status"]
          technical_observations?: string | null
          test_checklist?: Json | null
          test_location?: string | null
          test_scheduled_date?: string | null
          test_technician?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          brand?: string
          chassis_info?: string | null
          configuration?: string | null
          created_at?: string
          created_order_id?: string | null
          deleted_at?: string | null
          electrical_connection_type?: string | null
          id?: string
          incoming_vehicle_id?: string | null
          installation_photos?: string[] | null
          manufacture_year?: number | null
          model?: string
          notes?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["homologation_status"]
          technical_observations?: string | null
          test_checklist?: Json | null
          test_location?: string | null
          test_scheduled_date?: string | null
          test_technician?: string | null
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
      homologation_kit_accessories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          item_name: string
          item_type: string
          kit_id: string
          notes: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          item_type?: string
          kit_id: string
          notes?: string | null
          quantity?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          item_type?: string
          kit_id?: string
          notes?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_kit_accessories_kit"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "homologation_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      homologation_kits: {
        Row: {
          created_at: string
          description: string | null
          homologation_card_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          homologation_card_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          homologation_card_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_homologation_kits_card"
            columns: ["homologation_card_id"]
            isOneToOne: false
            referencedRelation: "homologation_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_homologation_kits_card"
            columns: ["homologation_card_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["homologation_id"]
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
          photo_type: string | null
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
          photo_type?: string | null
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
          photo_type?: string | null
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
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_street: string | null
          address_zip_code: string | null
          brand: string
          company_name: string | null
          cpf: string | null
          created_at: string
          created_homologation_id: string | null
          created_order_id: string | null
          homologation_status:
            | Database["public"]["Enums"]["homologation_status"]
            | null
          id: string
          kickoff_completed: boolean | null
          pending_contract_id: number | null
          phone: string | null
          plate: string | null
          processed: boolean
          processing_notes: string | null
          quantity: number | null
          received_at: string
          sale_summary_id: number | null
          usage_type: Database["public"]["Enums"]["vehicle_usage_type"]
          vehicle: string
          year: number | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          brand: string
          company_name?: string | null
          cpf?: string | null
          created_at?: string
          created_homologation_id?: string | null
          created_order_id?: string | null
          homologation_status?:
            | Database["public"]["Enums"]["homologation_status"]
            | null
          id?: string
          kickoff_completed?: boolean | null
          pending_contract_id?: number | null
          phone?: string | null
          plate?: string | null
          processed?: boolean
          processing_notes?: string | null
          quantity?: number | null
          received_at?: string
          sale_summary_id?: number | null
          usage_type: Database["public"]["Enums"]["vehicle_usage_type"]
          vehicle: string
          year?: number | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          brand?: string
          company_name?: string | null
          cpf?: string | null
          created_at?: string
          created_homologation_id?: string | null
          created_order_id?: string | null
          homologation_status?:
            | Database["public"]["Enums"]["homologation_status"]
            | null
          id?: string
          kickoff_completed?: boolean | null
          pending_contract_id?: number | null
          phone?: string | null
          plate?: string | null
          processed?: boolean
          processing_notes?: string | null
          quantity?: number | null
          received_at?: string
          sale_summary_id?: number | null
          usage_type?: Database["public"]["Enums"]["vehicle_usage_type"]
          vehicle?: string
          year?: number | null
        }
        Relationships: []
      }
      integration_state: {
        Row: {
          created_at: string | null
          error_count: number | null
          id: string
          integration_name: string
          last_error: string | null
          last_poll_at: string | null
          last_processed_id: number | null
          metadata: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          integration_name: string
          last_error?: string | null
          last_poll_at?: string | null
          last_processed_id?: number | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          integration_name?: string
          last_error?: string | null
          last_poll_at?: string | null
          last_processed_id?: number | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kickoff_history: {
        Row: {
          approved_at: string
          approved_by: string | null
          company_name: string
          contacts: Json | null
          created_at: string
          has_installation_particularity: boolean | null
          id: string
          installation_locations: Json | null
          installation_particularity_details: string | null
          kickoff_notes: string | null
          sale_summary_id: number
          total_vehicles: number
          updated_at: string
          vehicles_data: Json
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          company_name: string
          contacts?: Json | null
          created_at?: string
          has_installation_particularity?: boolean | null
          id?: string
          installation_locations?: Json | null
          installation_particularity_details?: string | null
          kickoff_notes?: string | null
          sale_summary_id: number
          total_vehicles?: number
          updated_at?: string
          vehicles_data?: Json
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          company_name?: string
          contacts?: Json | null
          created_at?: string
          has_installation_particularity?: boolean | null
          id?: string
          installation_locations?: Json | null
          installation_particularity_details?: string | null
          kickoff_notes?: string | null
          sale_summary_id?: number
          total_vehicles?: number
          updated_at?: string
          vehicles_data?: Json
        }
        Relationships: []
      }
      kit_item_options: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          item_name: string
          item_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_name: string
          item_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_name?: string
          item_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      kit_schedule_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          kit_schedule_id: string
          new_status: string
          notes: string | null
          previous_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          kit_schedule_id: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          kit_schedule_id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_schedule_status_history_kit_schedule_id_fkey"
            columns: ["kit_schedule_id"]
            isOneToOne: false
            referencedRelation: "kit_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_schedules: {
        Row: {
          accessories: string[] | null
          configuration: string | null
          created_at: string
          created_by: string | null
          customer_document_number: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          incoming_vehicle_id: string | null
          installation_address_city: string | null
          installation_address_complement: string | null
          installation_address_neighborhood: string | null
          installation_address_number: string | null
          installation_address_postal_code: string | null
          installation_address_state: string | null
          installation_address_street: string | null
          installation_time: string | null
          kit_id: string | null
          notes: string | null
          scheduled_date: string
          selected_kit_ids: string[] | null
          status: string
          supplies: string[] | null
          technician_id: string
          updated_at: string
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_year: number | null
        }
        Insert: {
          accessories?: string[] | null
          configuration?: string | null
          created_at?: string
          created_by?: string | null
          customer_document_number?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          incoming_vehicle_id?: string | null
          installation_address_city?: string | null
          installation_address_complement?: string | null
          installation_address_neighborhood?: string | null
          installation_address_number?: string | null
          installation_address_postal_code?: string | null
          installation_address_state?: string | null
          installation_address_street?: string | null
          installation_time?: string | null
          kit_id?: string | null
          notes?: string | null
          scheduled_date: string
          selected_kit_ids?: string[] | null
          status?: string
          supplies?: string[] | null
          technician_id: string
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
        }
        Update: {
          accessories?: string[] | null
          configuration?: string | null
          created_at?: string
          created_by?: string | null
          customer_document_number?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          incoming_vehicle_id?: string | null
          installation_address_city?: string | null
          installation_address_complement?: string | null
          installation_address_neighborhood?: string | null
          installation_address_number?: string | null
          installation_address_postal_code?: string | null
          installation_address_state?: string | null
          installation_address_street?: string | null
          installation_time?: string | null
          kit_id?: string | null
          notes?: string | null
          scheduled_date?: string
          selected_kit_ids?: string[] | null
          status?: string
          supplies?: string[] | null
          technician_id?: string
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_schedules_incoming_vehicle_id_fkey"
            columns: ["incoming_vehicle_id"]
            isOneToOne: false
            referencedRelation: "incoming_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_schedules_incoming_vehicle_id_fkey"
            columns: ["incoming_vehicle_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["incoming_vehicle_id"]
          },
          {
            foreignKeyName: "kit_schedules_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "homologation_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_schedules_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          company_name: string | null
          configuracao: string
          correios_tracking_code: string | null
          created_at: string
          data: string
          id: string
          numero_pedido: string
          production_completed_at: string | null
          production_notes: string | null
          production_started_at: string | null
          shipment_address_city: string | null
          shipment_address_complement: string | null
          shipment_address_neighborhood: string | null
          shipment_address_number: string | null
          shipment_address_postal_code: string | null
          shipment_address_state: string | null
          shipment_address_street: string | null
          shipment_prepared_at: string | null
          shipment_recipient_id: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          usuario_id: string | null
        }
        Insert: {
          company_name?: string | null
          configuracao: string
          correios_tracking_code?: string | null
          created_at?: string
          data?: string
          id?: string
          numero_pedido: string
          production_completed_at?: string | null
          production_notes?: string | null
          production_started_at?: string | null
          shipment_address_city?: string | null
          shipment_address_complement?: string | null
          shipment_address_neighborhood?: string | null
          shipment_address_number?: string | null
          shipment_address_postal_code?: string | null
          shipment_address_state?: string | null
          shipment_address_street?: string | null
          shipment_prepared_at?: string | null
          shipment_recipient_id?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          usuario_id?: string | null
        }
        Update: {
          company_name?: string | null
          configuracao?: string
          correios_tracking_code?: string | null
          created_at?: string
          data?: string
          id?: string
          numero_pedido?: string
          production_completed_at?: string | null
          production_notes?: string | null
          production_started_at?: string | null
          shipment_address_city?: string | null
          shipment_address_complement?: string | null
          shipment_address_neighborhood?: string | null
          shipment_address_number?: string | null
          shipment_address_postal_code?: string | null
          shipment_address_state?: string | null
          shipment_address_street?: string | null
          shipment_prepared_at?: string | null
          shipment_recipient_id?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_shipment_recipient_id_fkey"
            columns: ["shipment_recipient_id"]
            isOneToOne: false
            referencedRelation: "shipment_recipients"
            referencedColumns: ["id"]
          },
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
      shipment_recipients: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          id: string
          name: string
          neighborhood: string
          number: string
          phone: string | null
          postal_code: string
          state: string
          street: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          name: string
          neighborhood: string
          number: string
          phone?: string | null
          postal_code: string
          state: string
          street: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          name?: string
          neighborhood?: string
          number?: string
          phone?: string | null
          postal_code?: string
          state?: string
          street?: string
        }
        Relationships: []
      }
      technicians: {
        Row: {
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          postal_code: string
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          postal_code: string
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          postal_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      backfill_planning_customers: {
        Args: never
        Returns: {
          customer_created: boolean
          customer_id: string
          incoming_vehicle_id: string
          sale_summary_id: number
        }[]
      }
      backfill_schedules_from_homologations: {
        Args: never
        Returns: {
          card_id: string
          created_customer: boolean
          created_schedule: boolean
        }[]
      }
      create_automatic_order_atomic: {
        Args: {
          p_company_name?: string
          p_quantity?: number
          p_user_id?: string
          p_vehicle_brand: string
          p_vehicle_model: string
          p_vehicle_year?: number
        }
        Returns: {
          configuration: string
          order_id: string
          order_number: string
          tracker_model: string
        }[]
      }
      generate_auto_order_number: { Args: never; Returns: string }
      get_app_logs_admin: {
        Args: {
          p_action?: string
          p_end_date?: string
          p_module?: string
          p_start_date?: string
        }
        Returns: {
          action: string
          created_at: string
          details: string
          id: string
          ip_address: string
          module: string
          user_email: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_action: {
        Args: {
          p_action: string
          p_details?: string
          p_ip_address?: string
          p_module: string
        }
        Returns: undefined
      }
      relink_homologations_to_segsale_incoming: { Args: never; Returns: number }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "operador_kickoff"
        | "operador_homologacao"
        | "operador_agendamento"
        | "operador_suprimentos"
      homologation_status:
        | "homologar"
        | "em_homologacao"
        | "em_testes_finais"
        | "homologado"
        | "agendamento_teste"
        | "execucao_teste"
        | "armazenamento_plataforma"
      status_pedido: "novos" | "producao" | "aguardando" | "enviado" | "standby"
      vehicle_usage_type:
        | "particular"
        | "comercial"
        | "frota"
        | "telemetria_gps"
        | "telemetria_can"
        | "copiloto_2_cameras"
        | "copiloto_4_cameras"
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
      app_role: [
        "admin",
        "gestor",
        "operador_kickoff",
        "operador_homologacao",
        "operador_agendamento",
        "operador_suprimentos",
      ],
      homologation_status: [
        "homologar",
        "em_homologacao",
        "em_testes_finais",
        "homologado",
        "agendamento_teste",
        "execucao_teste",
        "armazenamento_plataforma",
      ],
      status_pedido: ["novos", "producao", "aguardando", "enviado", "standby"],
      vehicle_usage_type: [
        "particular",
        "comercial",
        "frota",
        "telemetria_gps",
        "telemetria_can",
        "copiloto_2_cameras",
        "copiloto_4_cameras",
      ],
    },
  },
} as const
