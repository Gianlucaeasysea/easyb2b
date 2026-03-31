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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          body: string | null
          client_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          scheduled_at: string | null
          title: string
          type: string | null
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          scheduled_at?: string | null
          title: string
          type?: string | null
        }
        Update: {
          body?: string | null
          client_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          scheduled_at?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_bank_details: {
        Row: {
          account_holder: string | null
          bank_name: string | null
          client_id: string
          created_at: string
          iban: string | null
          id: string
          swift_bic: string | null
        }
        Insert: {
          account_holder?: string | null
          bank_name?: string | null
          client_id: string
          created_at?: string
          iban?: string | null
          id?: string
          swift_bic?: string | null
        }
        Update: {
          account_holder?: string | null
          bank_name?: string | null
          client_id?: string
          created_at?: string
          iban?: string | null
          id?: string
          swift_bic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_bank_details_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communications: {
        Row: {
          body: string
          client_id: string
          contact_id: string | null
          created_at: string
          direction: string
          error_message: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          recipient_email: string
          scheduled_at: string | null
          sent_by: string
          status: string
          subject: string
          template_type: string
        }
        Insert: {
          body: string
          client_id: string
          contact_id?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient_email: string
          scheduled_at?: string | null
          sent_by: string
          status?: string
          subject: string
          template_type?: string
        }
        Update: {
          body?: string
          client_id?: string
          contact_id?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient_email?: string
          scheduled_at?: string | null
          sent_by?: string
          status?: string
          subject?: string
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          avatar_url: string | null
          client_id: string
          contact_name: string
          contact_type: string | null
          created_at: string
          department: string | null
          email: string | null
          id: string
          is_decision_maker: boolean | null
          is_primary: boolean | null
          job_title: string | null
          last_contacted_at: string | null
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          preferred_channel: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          client_id: string
          contact_name: string
          contact_type?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_decision_maker?: boolean | null
          is_primary?: boolean | null
          job_title?: string | null
          last_contacted_at?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          preferred_channel?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          client_id?: string
          contact_name?: string
          contact_type?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_decision_maker?: boolean | null
          is_primary?: boolean | null
          job_title?: string | null
          last_contacted_at?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          preferred_channel?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          doc_category: string
          file_name: string
          file_path: string
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          doc_category?: string
          file_name: string
          file_path: string
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          doc_category?: string
          file_name?: string
          file_path?: string
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notification_preferences: {
        Row: {
          client_id: string
          created_at: string | null
          enabled: boolean
          id: string
          notification_type: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          notification_type: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          enabled?: boolean
          id?: string
          notification_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notification_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications: {
        Row: {
          body: string | null
          client_id: string
          created_at: string
          id: string
          order_id: string | null
          read: boolean
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          client_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          read?: boolean
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          client_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      client_shipping_addresses: {
        Row: {
          address_line: string | null
          city: string | null
          client_id: string
          country: string | null
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          postal_code: string | null
          province: string | null
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          client_id: string
          country?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          postal_code?: string | null
          province?: string | null
        }
        Update: {
          address_line?: string | null
          city?: string | null
          client_id?: string
          country?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          postal_code?: string | null
          province?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_shipping_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          assigned_sales_id: string | null
          avg_order_frequency_days: number | null
          business_type: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          days_since_last_order: number | null
          discount_class: string | null
          disqualified_reason: string | null
          email: string | null
          id: string
          last_order_date: string | null
          last_order_value: number | null
          next_reorder_expected_date: string | null
          notes: string | null
          phone: string | null
          platform_client_id: string | null
          portal_password: string | null
          status: string | null
          status_changed_at: string | null
          total_orders_count: number | null
          total_orders_value: number | null
          updated_at: string
          user_id: string | null
          vat_number: string | null
          website: string | null
          zone: string | null
        }
        Insert: {
          address?: string | null
          assigned_sales_id?: string | null
          avg_order_frequency_days?: number | null
          business_type?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          days_since_last_order?: number | null
          discount_class?: string | null
          disqualified_reason?: string | null
          email?: string | null
          id?: string
          last_order_date?: string | null
          last_order_value?: number | null
          next_reorder_expected_date?: string | null
          notes?: string | null
          phone?: string | null
          platform_client_id?: string | null
          portal_password?: string | null
          status?: string | null
          status_changed_at?: string | null
          total_orders_count?: number | null
          total_orders_value?: number | null
          updated_at?: string
          user_id?: string | null
          vat_number?: string | null
          website?: string | null
          zone?: string | null
        }
        Update: {
          address?: string | null
          assigned_sales_id?: string | null
          avg_order_frequency_days?: number | null
          business_type?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          days_since_last_order?: number | null
          discount_class?: string | null
          disqualified_reason?: string | null
          email?: string | null
          id?: string
          last_order_date?: string | null
          last_order_value?: number | null
          next_reorder_expected_date?: string | null
          notes?: string | null
          phone?: string | null
          platform_client_id?: string | null
          portal_password?: string | null
          status?: string | null
          status_changed_at?: string | null
          total_orders_count?: number | null
          total_orders_value?: number | null
          updated_at?: string
          user_id?: string | null
          vat_number?: string | null
          website?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          notes: string | null
          probability: number | null
          stage: string
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          notes?: string | null
          probability?: number | null
          stage?: string
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          notes?: string | null
          probability?: number | null
          stage?: string
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_tiers: {
        Row: {
          created_at: string
          discount_pct: number
          id: string
          label: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          discount_pct?: number
          id?: string
          label: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          discount_pct?: number
          id?: string
          label?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      distributor_requests: {
        Row: {
          business_type: string | null
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string
          status: string | null
          website: string | null
          zone: string | null
        }
        Insert: {
          business_type?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone: string
          status?: string | null
          website?: string | null
          zone?: string | null
        }
        Update: {
          business_type?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string
          status?: string | null
          website?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      gmail_tokens: {
        Row: {
          access_token: string
          created_at: string
          email: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      marketing_materials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: string | null
          id: string
          is_active: boolean
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: string | null
          id?: string
          is_active?: boolean
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: string | null
          id?: string
          is_active?: boolean
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      order_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_path: string
          id: string
          order_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_name: string
          file_path: string
          id?: string
          order_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          id?: string
          order_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          order_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          order_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          order_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          discount_pct: number | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          discount_pct?: number | null
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          discount_pct?: number | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string
          created_at: string
          delivery_date: string | null
          id: string
          internal_notes: string | null
          notes: string | null
          order_code: string | null
          order_type: string | null
          payed_date: string | null
          payment_status: string | null
          pickup_date: string | null
          shipping_cost_client: number | null
          shipping_cost_easysea: number | null
          status: string | null
          total_amount: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          delivery_date?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_code?: string | null
          order_type?: string | null
          payed_date?: string | null
          payment_status?: string | null
          pickup_date?: string | null
          shipping_cost_client?: number | null
          shipping_cost_easysea?: number | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          delivery_date?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_code?: string | null
          order_type?: string | null
          payed_date?: string | null
          payment_status?: string | null
          pickup_date?: string | null
          shipping_cost_client?: number | null
          shipping_cost_easysea?: number | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          price_list_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          price_list_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          price_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_clients_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          custom_price: number
          id: string
          price_list_id: string
          product_id: string
        }
        Insert: {
          custom_price: number
          id?: string
          price_list_id: string
          product_id: string
        }
        Update: {
          custom_price?: number
          id?: string
          price_list_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          discount_tier_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          discount_tier_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          discount_tier_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_lists_discount_tier_id_fkey"
            columns: ["discount_tier_id"]
            isOneToOne: false
            referencedRelation: "discount_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_details: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          features: Json | null
          gallery_images: Json | null
          id: string
          lead_time: string | null
          product_family: string
          specifications: Json | null
          technical_sheet_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          features?: Json | null
          gallery_images?: Json | null
          id?: string
          lead_time?: string | null
          product_family: string
          specifications?: Json | null
          technical_sheet_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          features?: Json | null
          gallery_images?: Json | null
          id?: string
          lead_time?: string | null
          product_family?: string
          specifications?: Json | null
          technical_sheet_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active_b2b: boolean | null
          barcode: string | null
          category: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          name: string
          price: number | null
          shopify_id: string | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          active_b2b?: boolean | null
          barcode?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          name: string
          price?: number | null
          shopify_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          active_b2b?: boolean | null
          barcode?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          name?: string
          price?: number | null
          shopify_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          website: string | null
          zone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          zone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: string | null
          reminder_at: string | null
          status: string | null
          title: string
          type: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          reminder_at?: string | null
          status?: string | null
          title: string
          type?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          reminder_at?: string | null
          status?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          client_name: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_vertical: boolean
          sort_order: number
          title: string
          updated_at: string
          video_type: string
          video_url: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_vertical?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          video_type?: string
          video_url: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_vertical?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "dealer" | "sales" | "operations"
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
      app_role: ["admin", "dealer", "sales", "operations"],
    },
  },
} as const
