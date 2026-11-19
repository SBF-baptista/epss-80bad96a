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
    PostgrestVersion: "12.2.3"
  }
  public: {
    Tables: {
      access_profile_history: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          changes: Json
          created_at: string
          description_after: string | null
          description_before: string | null
          id: string
          name_after: string | null
          name_before: string | null
          profile_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          changes?: Json
          created_at?: string
          description_after?: string | null
          description_before?: string | null
          id?: string
          name_after?: string | null
          name_before?: string | null
          profile_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          changes?: Json
          created_at?: string
          description_after?: string | null
          description_before?: string | null
          id?: string
          name_after?: string | null
          name_before?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_profile_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      access_profile_permissions: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["permission_level"]
          module: Database["public"]["Enums"]["app_module"]
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["permission_level"]
          module: Database["public"]["Enums"]["app_module"]
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["permission_level"]
          module?: Database["public"]["Enums"]["app_module"]
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_profile_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      access_profiles: {
        Row: {
          base_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          base_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
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
      api_endpoints: {
        Row: {
          created_at: string
          created_by: string | null
          default_body: Json | null
          expected_response_time_ms: number | null
          headers: Json | null
          id: string
          is_active: boolean
          method: string
          name: string
          system_origin: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_body?: Json | null
          expected_response_time_ms?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean
          method?: string
          name: string
          system_origin?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_body?: Json | null
          expected_response_time_ms?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean
          method?: string
          name?: string
          system_origin?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      api_execution_logs: {
        Row: {
          endpoint_id: string
          error_message: string | null
          executed_at: string
          executed_by: string | null
          id: string
          request_body: Json | null
          request_headers: Json | null
          response_body: string | null
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          endpoint_id: string
          error_message?: string | null
          executed_at?: string
          executed_by?: string | null
          id?: string
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: string | null
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          endpoint_id?: string
          error_message?: string | null
          executed_at?: string
          executed_by?: string | null
          id?: string
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: string | null
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_execution_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "api_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      app_logs: {
        Row: {
          action: string
          action_type: Database["public"]["Enums"]["log_action_type"] | null
          browser_info: string | null
          changed_fields: string[] | null
          created_at: string
          details: string | null
          device_info: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          environment: string | null
          error_code: string | null
          error_message: string | null
          id: string
          impact_level: Database["public"]["Enums"]["log_impact_level"] | null
          ip_address: string | null
          is_critical: boolean | null
          is_lgpd_sensitive: boolean | null
          is_reversible: boolean | null
          module: string
          new_state: Json | null
          origin: Database["public"]["Enums"]["log_origin"] | null
          previous_state: Json | null
          session_id: string | null
          status: Database["public"]["Enums"]["log_status"] | null
          user_id: string | null
          user_profile: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          action_type?: Database["public"]["Enums"]["log_action_type"] | null
          browser_info?: string | null
          changed_fields?: string[] | null
          created_at?: string
          details?: string | null
          device_info?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          impact_level?: Database["public"]["Enums"]["log_impact_level"] | null
          ip_address?: string | null
          is_critical?: boolean | null
          is_lgpd_sensitive?: boolean | null
          is_reversible?: boolean | null
          module: string
          new_state?: Json | null
          origin?: Database["public"]["Enums"]["log_origin"] | null
          previous_state?: Json | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["log_status"] | null
          user_id?: string | null
          user_profile?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          action_type?: Database["public"]["Enums"]["log_action_type"] | null
          browser_info?: string | null
          changed_fields?: string[] | null
          created_at?: string
          details?: string | null
          device_info?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          impact_level?: Database["public"]["Enums"]["log_impact_level"] | null
          ip_address?: string | null
          is_critical?: boolean | null
          is_lgpd_sensitive?: boolean | null
          is_reversible?: boolean | null
          module?: string
          new_state?: Json | null
          origin?: Database["public"]["Enums"]["log_origin"] | null
          previous_state?: Json | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["log_status"] | null
          user_id?: string | null
          user_profile?: string | null
          user_role?: string | null
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
      custom_vehicle_models: {
        Row: {
          brand_code: string
          brand_name: string
          created_at: string
          created_by: string | null
          id: string
          model_name: string
        }
        Insert: {
          brand_code: string
          brand_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          model_name: string
        }
        Update: {
          brand_code?: string
          brand_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          model_name?: string
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
      equipment_models: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          normalized_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          normalized_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          normalized_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      frota_ticket_companies: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          razao_social: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          razao_social: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          razao_social?: string
        }
        Relationships: []
      }
      frota_tickets: {
        Row: {
          atendente_suporte: string | null
          canal_entrada: string | null
          classificacao: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          data_atendimento: string | null
          data_encerramento: string | null
          data_escalonamento: string | null
          descricao_problema: string | null
          descricao_solucao: string | null
          id: string
          produto: string | null
          razao_social: string | null
          responsavel_escalonado: string | null
          status: string
          tempo_primeiro_atendimento: string | null
          updated_at: string
        }
        Insert: {
          atendente_suporte?: string | null
          canal_entrada?: string | null
          classificacao?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_atendimento?: string | null
          data_encerramento?: string | null
          data_escalonamento?: string | null
          descricao_problema?: string | null
          descricao_solucao?: string | null
          id?: string
          produto?: string | null
          razao_social?: string | null
          responsavel_escalonado?: string | null
          status?: string
          tempo_primeiro_atendimento?: string | null
          updated_at?: string
        }
        Update: {
          atendente_suporte?: string | null
          canal_entrada?: string | null
          classificacao?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_atendimento?: string | null
          data_encerramento?: string | null
          data_escalonamento?: string | null
          descricao_problema?: string | null
          descricao_solucao?: string | null
          id?: string
          produto?: string | null
          razao_social?: string | null
          responsavel_escalonado?: string | null
          status?: string
          tempo_primeiro_atendimento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      frota_unit_activation_audit: {
        Row: {
          action: string
          api_ok: boolean
          api_response: Json | null
          api_status: number | null
          created_at: string
          error_message: string | null
          filial_contrato: string | null
          id: string
          imei: string | null
          notes: string | null
          placa: string | null
          requested_by: string | null
          requested_by_email: string | null
          sistema: string | null
          tipo_contrato: string | null
          wialon_item_id: number | null
          wialon_item_name: string | null
        }
        Insert: {
          action: string
          api_ok?: boolean
          api_response?: Json | null
          api_status?: number | null
          created_at?: string
          error_message?: string | null
          filial_contrato?: string | null
          id?: string
          imei?: string | null
          notes?: string | null
          placa?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
          sistema?: string | null
          tipo_contrato?: string | null
          wialon_item_id?: number | null
          wialon_item_name?: string | null
        }
        Update: {
          action?: string
          api_ok?: boolean
          api_response?: Json | null
          api_status?: number | null
          created_at?: string
          error_message?: string | null
          filial_contrato?: string | null
          id?: string
          imei?: string | null
          notes?: string | null
          placa?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
          sistema?: string | null
          tipo_contrato?: string | null
          wialon_item_id?: number | null
          wialon_item_name?: string | null
        }
        Relationships: []
      }
      frota_units_pending_imei: {
        Row: {
          brand: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          frota_response: Json | null
          hardware: string | null
          id: string
          imei: string | null
          incoming_vehicle_id: string | null
          linked_at: string | null
          linked_by: string | null
          model: string | null
          plate: string | null
          sistema: string | null
          status: string
          updated_at: string
          wialon_item_id: number | null
          wialon_resource_id: number | null
        }
        Insert: {
          brand?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          frota_response?: Json | null
          hardware?: string | null
          id?: string
          imei?: string | null
          incoming_vehicle_id?: string | null
          linked_at?: string | null
          linked_by?: string | null
          model?: string | null
          plate?: string | null
          sistema?: string | null
          status?: string
          updated_at?: string
          wialon_item_id?: number | null
          wialon_resource_id?: number | null
        }
        Update: {
          brand?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          frota_response?: Json | null
          hardware?: string | null
          id?: string
          imei?: string | null
          incoming_vehicle_id?: string | null
          linked_at?: string | null
          linked_by?: string | null
          model?: string | null
          plate?: string | null
          sistema?: string | null
          status?: string
          updated_at?: string
          wialon_item_id?: number | null
          wialon_resource_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "frota_units_pending_imei_incoming_vehicle_id_fkey"
            columns: ["incoming_vehicle_id"]
            isOneToOne: false
            referencedRelation: "incoming_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frota_units_pending_imei_incoming_vehicle_id_fkey"
            columns: ["incoming_vehicle_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["incoming_vehicle_id"]
          },
        ]
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
          equipment_model: string | null
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
          equipment_model?: string | null
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
          equipment_model?: string | null
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
      homologation_files: {
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
            foreignKeyName: "homologation_files_homologation_card_id_fkey"
            columns: ["homologation_card_id"]
            isOneToOne: false
            referencedRelation: "homologation_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homologation_files_homologation_card_id_fkey"
            columns: ["homologation_card_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["homologation_id"]
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
          category: string | null
          configuration_count: number | null
          configurations: string[]
          created_at: string
          description: string | null
          homologation_card_id: string | null
          id: string
          name: string
          segsale_accessory: string[] | null
          segsale_module: string[] | null
          segsale_product: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          configuration_count?: number | null
          configurations?: string[]
          created_at?: string
          description?: string | null
          homologation_card_id?: string | null
          id?: string
          name: string
          segsale_accessory?: string[] | null
          segsale_module?: string[] | null
          segsale_product?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          configuration_count?: number | null
          configurations?: string[]
          created_at?: string
          description?: string | null
          homologation_card_id?: string | null
          id?: string
          name?: string
          segsale_accessory?: string[] | null
          segsale_module?: string[] | null
          segsale_product?: string | null
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
          camera_extra_locations: string | null
          camera_extra_quantity: number | null
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
          tomticket_protocol: string | null
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
          camera_extra_locations?: string | null
          camera_extra_quantity?: number | null
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
          tomticket_protocol?: string | null
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
          camera_extra_locations?: string | null
          camera_extra_quantity?: number | null
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
          tomticket_protocol?: string | null
          usage_type?: Database["public"]["Enums"]["vehicle_usage_type"]
          vehicle?: string
          year?: number | null
        }
        Relationships: []
      }
      instalacoes_recebidas: {
        Row: {
          accessories: Json
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          checklist: Json
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contrato: string | null
          cpf_cnpj: string | null
          created_at: string
          external_reference: string | null
          filial: string | null
          id: string
          imei: string | null
          installation_date: string | null
          installation_type: string | null
          metadata: Json
          observations: string | null
          photos: Json
          placa: string | null
          raw_payload: Json
          request_id: string | null
          service_order: string | null
          sim_iccid: string | null
          sim_operator: string | null
          sim_phone: string | null
          source: string | null
          status: string
          technician_document: string | null
          technician_name: string | null
          technician_phone: string | null
          tecnico_instalador: string | null
          tracker_imei: string | null
          tracker_model: string | null
          tracker_serial: string | null
          updated_at: string
          vehicle_brand: string | null
          vehicle_chassis: string | null
          vehicle_color: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_renavam: string | null
          vehicle_year: number | null
        }
        Insert: {
          accessories?: Json
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          checklist?: Json
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contrato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          external_reference?: string | null
          filial?: string | null
          id?: string
          imei?: string | null
          installation_date?: string | null
          installation_type?: string | null
          metadata?: Json
          observations?: string | null
          photos?: Json
          placa?: string | null
          raw_payload: Json
          request_id?: string | null
          service_order?: string | null
          sim_iccid?: string | null
          sim_operator?: string | null
          sim_phone?: string | null
          source?: string | null
          status?: string
          technician_document?: string | null
          technician_name?: string | null
          technician_phone?: string | null
          tecnico_instalador?: string | null
          tracker_imei?: string | null
          tracker_model?: string | null
          tracker_serial?: string | null
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_chassis?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_renavam?: string | null
          vehicle_year?: number | null
        }
        Update: {
          accessories?: Json
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          checklist?: Json
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contrato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          external_reference?: string | null
          filial?: string | null
          id?: string
          imei?: string | null
          installation_date?: string | null
          installation_type?: string | null
          metadata?: Json
          observations?: string | null
          photos?: Json
          placa?: string | null
          raw_payload?: Json
          request_id?: string | null
          service_order?: string | null
          sim_iccid?: string | null
          sim_operator?: string | null
          sim_phone?: string | null
          source?: string | null
          status?: string
          technician_document?: string | null
          technician_name?: string | null
          technician_phone?: string | null
          tecnico_instalador?: string | null
          tracker_imei?: string | null
          tracker_model?: string | null
          tracker_serial?: string | null
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_chassis?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_renavam?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      installation_confirmations: {
        Row: {
          created_at: string | null
          id: string
          imei: string
          matched_schedule_id: string | null
          plate: string
          raw_payload: Json | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          imei: string
          matched_schedule_id?: string | null
          plate: string
          raw_payload?: Json | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          imei?: string
          matched_schedule_id?: string | null
          plate?: string
          raw_payload?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_confirmations_matched_schedule_id_fkey"
            columns: ["matched_schedule_id"]
            isOneToOne: false
            referencedRelation: "kit_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_schedules: {
        Row: {
          address: string
          created_at: string
          created_by: string | null
          customer: string
          deletion_request_status: string | null
          equipment_model: string | null
          id: string
          kit_schedule_id: string | null
          local_contact: string | null
          observation: string | null
          phone: string | null
          plate: string
          reference_point: string | null
          scheduled_by: string
          scheduled_date: string
          scheduled_time: string
          service: string
          technician_name: string
          technician_whatsapp: string
          tipo_contrato: string | null
          tracker_model: string
          updated_at: string
          vehicle_model: string
          vehicle_year: string | null
        }
        Insert: {
          address: string
          created_at?: string
          created_by?: string | null
          customer: string
          deletion_request_status?: string | null
          equipment_model?: string | null
          id?: string
          kit_schedule_id?: string | null
          local_contact?: string | null
          observation?: string | null
          phone?: string | null
          plate: string
          reference_point?: string | null
          scheduled_by: string
          scheduled_date: string
          scheduled_time: string
          service: string
          technician_name: string
          technician_whatsapp: string
          tipo_contrato?: string | null
          tracker_model: string
          updated_at?: string
          vehicle_model: string
          vehicle_year?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string | null
          customer?: string
          deletion_request_status?: string | null
          equipment_model?: string | null
          id?: string
          kit_schedule_id?: string | null
          local_contact?: string | null
          observation?: string | null
          phone?: string | null
          plate?: string
          reference_point?: string | null
          scheduled_by?: string
          scheduled_date?: string
          scheduled_time?: string
          service?: string
          technician_name?: string
          technician_whatsapp?: string
          tipo_contrato?: string | null
          tracker_model?: string
          updated_at?: string
          vehicle_model?: string
          vehicle_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_schedules_kit_schedule_id_fkey"
            columns: ["kit_schedule_id"]
            isOneToOne: false
            referencedRelation: "kit_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_search_history: {
        Row: {
          created_at: string
          found: boolean
          id: string
          result_data: Json | null
          result_type: string | null
          searched_by: string | null
          searched_plate: string
        }
        Insert: {
          created_at?: string
          found?: boolean
          id?: string
          result_data?: Json | null
          result_type?: string | null
          searched_by?: string | null
          searched_plate: string
        }
        Update: {
          created_at?: string
          found?: boolean
          id?: string
          result_data?: Json | null
          result_type?: string | null
          searched_by?: string | null
          searched_plate?: string
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
      item_edit_requests: {
        Row: {
          created_at: string
          id: string
          item_name: string
          item_type: string
          kit_id: string | null
          original_data: Json
          reason: string | null
          requested_by: string | null
          requested_changes: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          item_type: string
          kit_id?: string | null
          original_data?: Json
          reason?: string | null
          requested_by?: string | null
          requested_changes?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          item_type?: string
          kit_id?: string | null
          original_data?: Json
          reason?: string | null
          requested_by?: string | null
          requested_changes?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_edit_requests_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "homologation_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      item_homologation_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          item_name: string
          item_type: string
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          item_name: string
          item_type: string
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          item_name?: string
          item_type?: string
          status?: string
        }
        Relationships: []
      }
      kickoff_bypass_allowed_users: {
        Row: {
          added_at: string
          email: string
        }
        Insert: {
          added_at?: string
          email: string
        }
        Update: {
          added_at?: string
          email?: string
        }
        Relationships: []
      }
      kickoff_bypass_log: {
        Row: {
          brand: string | null
          company_name: string | null
          created_at: string
          id: string
          incoming_vehicle_id: string | null
          justification: string
          model: string | null
          performed_by: string | null
          performed_by_email: string | null
          plate: string | null
          resulting_customer_id: string | null
          resulting_kit_schedule_id: string | null
        }
        Insert: {
          brand?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          incoming_vehicle_id?: string | null
          justification: string
          model?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          plate?: string | null
          resulting_customer_id?: string | null
          resulting_kit_schedule_id?: string | null
        }
        Update: {
          brand?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          incoming_vehicle_id?: string | null
          justification?: string
          model?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          plate?: string | null
          resulting_customer_id?: string | null
          resulting_kit_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kickoff_bypass_log_incoming_vehicle_id_fkey"
            columns: ["incoming_vehicle_id"]
            isOneToOne: false
            referencedRelation: "incoming_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kickoff_bypass_log_incoming_vehicle_id_fkey"
            columns: ["incoming_vehicle_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["incoming_vehicle_id"]
          },
          {
            foreignKeyName: "kickoff_bypass_log_resulting_customer_id_fkey"
            columns: ["resulting_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kickoff_bypass_log_resulting_kit_schedule_id_fkey"
            columns: ["resulting_kit_schedule_id"]
            isOneToOne: false
            referencedRelation: "kit_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      kickoff_history: {
        Row: {
          accessories_sale: Json | null
          approved_at: string
          approved_by: string | null
          approved_by_email: string | null
          camera_extra_sale: Json | null
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
          accessories_sale?: Json | null
          approved_at?: string
          approved_by?: string | null
          approved_by_email?: string | null
          camera_extra_sale?: Json | null
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
          accessories_sale?: Json | null
          approved_at?: string
          approved_by?: string | null
          approved_by_email?: string | null
          camera_extra_sale?: Json | null
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
      kit_configuration_options: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
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
          requires_homologation: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_name: string
          item_type: string
          requires_homologation?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_name?: string
          item_type?: string
          requires_homologation?: boolean
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
          counting_completed_at: string | null
          counting_completed_by: string | null
          counting_completed_by_email: string | null
          counting_in_progress_at: string | null
          counting_in_progress_by_email: string | null
          counting_notes: string | null
          created_at: string
          created_by: string | null
          customer_document_number: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          equipment_model: string | null
          frota_unit_attempts: number
          frota_unit_created_at: string | null
          frota_unit_error: string | null
          frota_unit_last_attempt_at: string | null
          frota_unit_status: Database["public"]["Enums"]["frota_unit_status_type"]
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
          shipped_at: string | null
          shipped_by_email: string | null
          status: string
          supplies: string[] | null
          technician_id: string | null
          tracking_code: string | null
          tracking_code_azul: string | null
          tracking_code_correios: string | null
          tracking_code_golog: string | null
          updated_at: string
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_year: number | null
        }
        Insert: {
          accessories?: string[] | null
          configuration?: string | null
          counting_completed_at?: string | null
          counting_completed_by?: string | null
          counting_completed_by_email?: string | null
          counting_in_progress_at?: string | null
          counting_in_progress_by_email?: string | null
          counting_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_document_number?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          equipment_model?: string | null
          frota_unit_attempts?: number
          frota_unit_created_at?: string | null
          frota_unit_error?: string | null
          frota_unit_last_attempt_at?: string | null
          frota_unit_status?: Database["public"]["Enums"]["frota_unit_status_type"]
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
          shipped_at?: string | null
          shipped_by_email?: string | null
          status?: string
          supplies?: string[] | null
          technician_id?: string | null
          tracking_code?: string | null
          tracking_code_azul?: string | null
          tracking_code_correios?: string | null
          tracking_code_golog?: string | null
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
        }
        Update: {
          accessories?: string[] | null
          configuration?: string | null
          counting_completed_at?: string | null
          counting_completed_by?: string | null
          counting_completed_by_email?: string | null
          counting_in_progress_at?: string | null
          counting_in_progress_by_email?: string | null
          counting_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_document_number?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          equipment_model?: string | null
          frota_unit_attempts?: number
          frota_unit_created_at?: string | null
          frota_unit_error?: string | null
          frota_unit_last_attempt_at?: string | null
          frota_unit_status?: Database["public"]["Enums"]["frota_unit_status_type"]
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
          shipped_at?: string | null
          shipped_by_email?: string | null
          status?: string
          supplies?: string[] | null
          technician_id?: string | null
          tracking_code?: string | null
          tracking_code_azul?: string | null
          tracking_code_correios?: string | null
          tracking_code_golog?: string | null
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
      pending_sales_recovery_log: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          justification: string | null
          performed_by: string | null
          performed_by_email: string | null
          plate: string
          request_payload: Json | null
          response_payload: Json | null
          sale_summary_id: number
          status: string
          system: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          justification?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          plate: string
          request_payload?: Json | null
          response_payload?: Json | null
          sale_summary_id: number
          status: string
          system?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          justification?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          plate?: string
          request_payload?: Json | null
          response_payload?: Json | null
          sale_summary_id?: number
          status?: string
          system?: string | null
        }
        Relationships: []
      }
      production_check_items: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          counted_quantity: number
          created_at: string
          created_by: string
          expected_quantity: number
          id: string
          is_checked: boolean
          item_category: string
          item_key: string
          item_name: string
          kit_schedule_id: string
          stage: string
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          counted_quantity?: number
          created_at?: string
          created_by: string
          expected_quantity?: number
          id?: string
          is_checked?: boolean
          item_category: string
          item_key: string
          item_name: string
          kit_schedule_id: string
          stage: string
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          counted_quantity?: number
          created_at?: string
          created_by?: string
          expected_quantity?: number
          id?: string
          is_checked?: boolean
          item_category?: string
          item_key?: string
          item_name?: string
          kit_schedule_id?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_check_items_kit_schedule_id_fkey"
            columns: ["kit_schedule_id"]
            isOneToOne: false
            referencedRelation: "kit_schedules"
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
          kit_schedule_id: string | null
          pedido_id: string | null
          production_line_code: string
          scanned_at: string
          serial_number: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          imei: string
          kit_schedule_id?: string | null
          pedido_id?: string | null
          production_line_code: string
          scanned_at?: string
          serial_number?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          imei?: string
          kit_schedule_id?: string | null
          pedido_id?: string | null
          production_line_code?: string
          scanned_at?: string
          serial_number?: string | null
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
            foreignKeyName: "production_items_kit_schedule_id_fkey"
            columns: ["kit_schedule_id"]
            isOneToOne: false
            referencedRelation: "kit_schedules"
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
      retiradas_recebidas: {
        Row: {
          contrato: string | null
          created_at: string
          filial: string | null
          id: string
          imei: string | null
          motivo: string | null
          observacoes: string | null
          placa: string | null
          raw_payload: Json | null
          request_id: string | null
          source: string | null
          status: string
          tecnico_retirada: string | null
          updated_at: string
        }
        Insert: {
          contrato?: string | null
          created_at?: string
          filial?: string | null
          id?: string
          imei?: string | null
          motivo?: string | null
          observacoes?: string | null
          placa?: string | null
          raw_payload?: Json | null
          request_id?: string | null
          source?: string | null
          status?: string
          tecnico_retirada?: string | null
          updated_at?: string
        }
        Update: {
          contrato?: string | null
          created_at?: string
          filial?: string | null
          id?: string
          imei?: string | null
          motivo?: string | null
          observacoes?: string | null
          placa?: string | null
          raw_payload?: Json | null
          request_id?: string | null
          source?: string | null
          status?: string
          tecnico_retirada?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ruptela_vehicles_cache: {
        Row: {
          cache_key: string
          created_at: string
          fetched_at: string
          id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          fetched_at?: string
          id?: string
          payload: Json
          updated_at?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          fetched_at?: string
          id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      scheduling_service_options: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          service_name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          service_name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          service_name?: string
        }
        Relationships: []
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
      simulator_simulations: {
        Row: {
          created_at: string
          file_name: string
          id: string
          payload: Json
          supported_count: number
          total_rows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          payload: Json
          supported_count?: number
          total_rows?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          payload?: Json
          supported_count?: number
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      solicitacoes_exclusao_agendamento: {
        Row: {
          agendamento_id: string | null
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          filial_contrato: string | null
          id: string
          motivo: string | null
          resultado_api: Json | null
          snapshot: Json | null
          solicitado_em: string
          solicitado_por: string
          status: string
          tipo_contrato: string | null
          updated_at: string
          veiculo: string | null
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          filial_contrato?: string | null
          id?: string
          motivo?: string | null
          resultado_api?: Json | null
          snapshot?: Json | null
          solicitado_em?: string
          solicitado_por: string
          status?: string
          tipo_contrato?: string | null
          updated_at?: string
          veiculo?: string | null
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          filial_contrato?: string | null
          id?: string
          motivo?: string | null
          resultado_api?: Json | null
          snapshot?: Json | null
          solicitado_em?: string
          solicitado_por?: string
          status?: string
          tipo_contrato?: string | null
          updated_at?: string
          veiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_exclusao_agendamento_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "installation_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string
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
          phone: string | null
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
          phone?: string | null
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
          phone?: string | null
          postal_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      unit_activation_allowed_users: {
        Row: {
          added_at: string
          email: string
        }
        Insert: {
          added_at?: string
          email: string
        }
        Update: {
          added_at?: string
          email?: string
        }
        Relationships: []
      }
      user_last_seen: {
        Row: {
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          created_at: string
          id: string
          module: Database["public"]["Enums"]["app_module"]
          permission: Database["public"]["Enums"]["permission_level"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          permission?: Database["public"]["Enums"]["permission_level"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          permission?: Database["public"]["Enums"]["permission_level"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          justification: string | null
          level: Database["public"]["Enums"]["permission_level"]
          module: Database["public"]["Enums"]["app_module"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          justification?: string | null
          level: Database["public"]["Enums"]["permission_level"]
          module: Database["public"]["Enums"]["app_module"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          justification?: string | null
          level?: Database["public"]["Enums"]["permission_level"]
          module?: Database["public"]["Enums"]["app_module"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          access_profile_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string | null
          user_id: string
        }
        Insert: {
          access_profile_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          user_id: string
        }
        Update: {
          access_profile_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_access_profile_id_fkey"
            columns: ["access_profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          {
            foreignKeyName: "veiculos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "workflow_chain"
            referencedColumns: ["order_id"]
          },
        ]
      }
      whatsapp_message_logs: {
        Row: {
          created_at: string
          dispatch_type: string
          error_code: number | null
          error_message: string | null
          final_status: string | null
          friendly_message: string | null
          id: string
          initial_status: string | null
          message_content: string | null
          message_sid: string | null
          recipient_name: string
          recipient_phone: string
          sent_at: string
          template_type: string | null
        }
        Insert: {
          created_at?: string
          dispatch_type?: string
          error_code?: number | null
          error_message?: string | null
          final_status?: string | null
          friendly_message?: string | null
          id?: string
          initial_status?: string | null
          message_content?: string | null
          message_sid?: string | null
          recipient_name: string
          recipient_phone: string
          sent_at?: string
          template_type?: string | null
        }
        Update: {
          created_at?: string
          dispatch_type?: string
          error_code?: number | null
          error_message?: string | null
          final_status?: string | null
          friendly_message?: string | null
          id?: string
          initial_status?: string | null
          message_content?: string | null
          message_sid?: string | null
          recipient_name?: string
          recipient_phone?: string
          sent_at?: string
          template_type?: string | null
        }
        Relationships: []
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
      apply_accessory_homologation_exemption: {
        Args: { p_vehicle_id: string }
        Returns: boolean
      }
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
      can_approve_module: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      can_edit_module: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      can_view_module: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
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
      delete_homologation_kit_admin: {
        Args: { p_kit_id: string }
        Returns: undefined
      }
      delete_pending_kickoff_card_admin: {
        Args: { p_sale_summary_id: number }
        Returns: Json
      }
      ensure_homologation_card: {
        Args: { p_vehicle_id: string }
        Returns: string
      }
      ensure_planning_customer_for_vehicle: {
        Args: { p_vehicle_id: string }
        Returns: string
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
          action_type: Database["public"]["Enums"]["log_action_type"]
          browser_info: string
          changed_fields: string[]
          created_at: string
          details: string
          device_info: string
          duration_ms: number
          entity_id: string
          entity_name: string
          entity_type: string
          environment: string
          error_code: string
          error_message: string
          id: string
          impact_level: Database["public"]["Enums"]["log_impact_level"]
          ip_address: string
          is_critical: boolean
          is_lgpd_sensitive: boolean
          is_reversible: boolean
          module: string
          new_state: Json
          origin: Database["public"]["Enums"]["log_origin"]
          previous_state: Json
          session_id: string
          status: Database["public"]["Enums"]["log_status"]
          user_email: string
          user_id: string
          user_profile: string
          user_role: string
        }[]
      }
      get_module_permission: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: Database["public"]["Enums"]["permission_level"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_valid_homologation_photo_ids: {
        Args: { p_card_ids?: string[] }
        Returns: {
          homologation_card_id: string
          photo_id: string
        }[]
      }
      has_module_access: {
        Args: {
          _min_permission: Database["public"]["Enums"]["permission_level"]
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
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
      log_action_extended: {
        Args: {
          p_action: string
          p_action_type?: Database["public"]["Enums"]["log_action_type"]
          p_browser_info?: string
          p_changed_fields?: string[]
          p_details?: string
          p_device_info?: string
          p_duration_ms?: number
          p_entity_id?: string
          p_entity_name?: string
          p_entity_type?: string
          p_error_code?: string
          p_error_message?: string
          p_impact_level?: Database["public"]["Enums"]["log_impact_level"]
          p_ip_address?: string
          p_is_critical?: boolean
          p_is_lgpd_sensitive?: boolean
          p_is_reversible?: boolean
          p_module: string
          p_new_state?: Json
          p_origin?: Database["public"]["Enums"]["log_origin"]
          p_previous_state?: Json
          p_status?: Database["public"]["Enums"]["log_status"]
        }
        Returns: string
      }
      normalize_item_name: { Args: { p_value: string }; Returns: string }
      relink_homologations_to_segsale_incoming: { Args: never; Returns: number }
      skip_homologation_to_logistics: {
        Args: { p_card_id: string; p_kit_id: string; p_reason: string }
        Returns: string
      }
      sync_user_permissions_from_profile: {
        Args: { _access_profile_id: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_module:
        | "kickoff"
        | "customer_tracking"
        | "homologation"
        | "kits"
        | "accessories_supplies"
        | "planning"
        | "scheduling"
        | "kanban"
        | "orders"
        | "dashboard"
        | "technicians"
        | "users"
        | "schedule_deletion_approval"
        | "history"
        | "edit_requests"
        | "installation"
        | "api_monitoring"
        | "plate_verification"
        | "frota_pendentes"
        | "segsale_sales"
        | "segsale_search"
        | "whatsapp_control"
        | "configuration"
        | "kickoff_simulator"
        | "kickoff_bypass"
        | "pending_sales_recovery"
        | "chamados"
        | "kickoff_bypass_control"
        | "unit_activation"
      app_role:
        | "admin"
        | "gestor"
        | "operador_kickoff"
        | "operador_homologacao"
        | "operador_agendamento"
        | "operador_suprimentos"
        | "visualizador"
        | "operador"
      frota_unit_status_type: "pending" | "created" | "failed"
      homologation_status:
        | "homologar"
        | "em_homologacao"
        | "em_testes_finais"
        | "homologado"
        | "agendamento_teste"
        | "execucao_teste"
        | "armazenamento_plataforma"
      log_action_type:
        | "create"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "approval"
        | "rejection"
        | "cancellation"
        | "integration"
        | "system"
        | "error"
        | "access"
      log_impact_level: "info" | "low" | "medium" | "high" | "critical"
      log_origin:
        | "web"
        | "api"
        | "integration"
        | "system"
        | "mobile"
        | "job"
        | "webhook"
      log_status: "success" | "error" | "partial" | "pending"
      permission_level: "none" | "view" | "edit" | "approve" | "admin"
      status_pedido: "novos" | "producao" | "aguardando" | "enviado" | "standby"
      vehicle_usage_type:
        | "particular"
        | "comercial"
        | "frota"
        | "telemetria_gps"
        | "telemetria_can"
        | "copiloto_2_cameras"
        | "copiloto_4_cameras"
        | "plus_2_gps"
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
      app_module: [
        "kickoff",
        "customer_tracking",
        "homologation",
        "kits",
        "accessories_supplies",
        "planning",
        "scheduling",
        "kanban",
        "orders",
        "dashboard",
        "technicians",
        "users",
        "schedule_deletion_approval",
        "history",
        "edit_requests",
        "installation",
        "api_monitoring",
        "plate_verification",
        "frota_pendentes",
        "segsale_sales",
        "segsale_search",
        "whatsapp_control",
        "configuration",
        "kickoff_simulator",
        "kickoff_bypass",
        "pending_sales_recovery",
        "chamados",
        "kickoff_bypass_control",
        "unit_activation",
      ],
      app_role: [
        "admin",
        "gestor",
        "operador_kickoff",
        "operador_homologacao",
        "operador_agendamento",
        "operador_suprimentos",
        "visualizador",
        "operador",
      ],
      frota_unit_status_type: ["pending", "created", "failed"],
      homologation_status: [
        "homologar",
        "em_homologacao",
        "em_testes_finais",
        "homologado",
        "agendamento_teste",
        "execucao_teste",
        "armazenamento_plataforma",
      ],
      log_action_type: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "approval",
        "rejection",
        "cancellation",
        "integration",
        "system",
        "error",
        "access",
      ],
      log_impact_level: ["info", "low", "medium", "high", "critical"],
      log_origin: [
        "web",
        "api",
        "integration",
        "system",
        "mobile",
        "job",
        "webhook",
      ],
      log_status: ["success", "error", "partial", "pending"],
      permission_level: ["none", "view", "edit", "approve", "admin"],
      status_pedido: ["novos", "producao", "aguardando", "enviado", "standby"],
      vehicle_usage_type: [
        "particular",
        "comercial",
        "frota",
        "telemetria_gps",
        "telemetria_can",
        "copiloto_2_cameras",
        "copiloto_4_cameras",
        "plus_2_gps",
      ],
    },
  },
} as const
