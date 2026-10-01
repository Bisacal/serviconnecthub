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
      bookings: {
        Row: {
          booking_date: string
          client_id: string
          created_at: string
          details: Json
          end_time: string
          id: string
          location: string | null
          notes: string | null
          provider_id: string
          provider_note: string | null
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          booking_date: string
          client_id: string
          created_at?: string
          details?: Json
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          provider_id: string
          provider_note?: string | null
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          booking_date?: string
          client_id?: string
          created_at?: string
          details?: Json
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          provider_id?: string
          provider_note?: string | null
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          additional_info: string | null
          address: string | null
          city: string | null
          created_at: string
          id: string
          preferred_location: string | null
          service_notes: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          preferred_location?: string | null
          service_notes?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_info?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          preferred_location?: string | null
          service_notes?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          client_id: string
          client_last_read_at: string
          created_at: string
          id: string
          last_message_at: string | null
          provider_id: string
          provider_last_read_at: string
          provider_user_id: string
        }
        Insert: {
          client_id: string
          client_last_read_at?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          provider_id: string
          provider_last_read_at?: string
          provider_user_id: string
        }
        Update: {
          client_id?: string
          client_last_read_at?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          provider_id?: string
          provider_last_read_at?: string
          provider_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_path: string | null
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          kind: string
          sender_id: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          sender_id: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          provider_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          provider_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          provider_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          profile_image: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_image?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_image?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string
          end_time: string
          id: string
          provider_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          provider_id: string
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          provider_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_profiles: {
        Row: {
          area: string | null
          availability: string | null
          availability_status: Database["public"]["Enums"]["availability_status"]
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          business_name: string | null
          category_id: string | null
          city: string | null
          created_at: string
          headline: string | null
          id: string
          is_published: boolean
          is_verified: boolean
          location: string | null
          profession: string | null
          public_name: string | null
          rating_average: number
          review_count: number
          starting_price: number | null
          state: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          years_experience: number | null
        }
        Insert: {
          area?: string | null
          availability?: string | null
          availability_status?: Database["public"]["Enums"]["availability_status"]
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          business_name?: string | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          is_published?: boolean
          is_verified?: boolean
          location?: string | null
          profession?: string | null
          public_name?: string | null
          rating_average?: number
          review_count?: number
          starting_price?: number | null
          state?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Update: {
          area?: string | null
          availability?: string | null
          availability_status?: Database["public"]["Enums"]["availability_status"]
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          business_name?: string | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          is_published?: boolean
          is_verified?: boolean
          location?: string | null
          profession?: string | null
          public_name?: string | null
          rating_average?: number
          review_count?: number
          starting_price?: number | null
          state?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          price_from: number | null
          price_type: Database["public"]["Enums"]["price_type"]
          price_unit: string | null
          provider_id: string
          requires_booking: boolean
          subcategory_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          price_from?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          price_unit?: string | null
          provider_id: string
          requires_booking?: boolean
          subcategory_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          price_from?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          price_unit?: string | null
          provider_id?: string
          requires_booking?: boolean
          subcategory_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "service_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          id: string
          is_hidden: boolean
          moderation_note: string | null
          provider_id: string
          rating: number
          request_id: string
          reviewer_name: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          moderation_note?: string | null
          provider_id: string
          rating: number
          request_id: string
          reviewer_name?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          moderation_note?: string | null
          provider_id?: string
          rating?: number
          request_id?: string
          reviewer_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_providers: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          icon_key: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          budget: number | null
          client_id: string
          created_at: string
          details: string | null
          id: string
          location: string | null
          preferred_date: string | null
          preferred_time: string | null
          provider_id: string
          service_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id: string
          created_at?: string
          details?: string | null
          id?: string
          location?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_id: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string
          created_at?: string
          details?: string | null
          id?: string
          location?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_id?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
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
      verification_documents: {
        Row: {
          admin_note: string | null
          created_at: string
          document_type: Database["public"]["Enums"]["verification_document_type"]
          file_name: string | null
          file_path: string
          id: string
          notes: string | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          document_type: Database["public"]["Enums"]["verification_document_type"]
          file_name?: string | null
          file_path: string
          id?: string
          notes?: string | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["verification_document_type"]
          file_name?: string | null
          file_path?: string
          id?: string
          notes?: string | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      provider_portfolios: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          image_path: string | null
          provider_id: string | null
          sort_order: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_path?: string | null
          provider_id?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_path?: string | null
          provider_id?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_provider_busy_slots: {
        Args: { _date: string; _provider_id: string }
        Returns: {
          end_time: string
          start_time: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_conversation_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      my_conversations: {
        Args: never
        Returns: {
          id: string
          is_client: boolean
          last_body: string
          last_message_at: string
          other_name: string
          unread: number
        }[]
      }
      start_conversation: {
        Args: { _client_id: string; _provider_id: string }
        Returns: string
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "deactivated"
      app_role: "client" | "provider" | "admin"
      availability_status: "available" | "busy" | "unavailable"
      booking_status:
        | "pending"
        | "confirmed"
        | "declined"
        | "cancelled"
        | "completed"
      price_type: "hourly" | "fixed" | "daily" | "negotiable" | "starting_from"
      request_status:
        | "pending"
        | "accepted"
        | "declined"
        | "in_progress"
        | "completed"
        | "cancelled"
      verification_document_type:
        | "identity_document"
        | "professional_certificate"
        | "business_registration"
        | "professional_licence"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      account_status: ["active", "suspended", "deactivated"],
      app_role: ["client", "provider", "admin"],
      availability_status: ["available", "busy", "unavailable"],
      booking_status: [
        "pending",
        "confirmed",
        "declined",
        "cancelled",
        "completed",
      ],
      price_type: ["hourly", "fixed", "daily", "negotiable", "starting_from"],
      request_status: [
        "pending",
        "accepted",
        "declined",
        "in_progress",
        "completed",
        "cancelled",
      ],
      verification_document_type: [
        "identity_document",
        "professional_certificate",
        "business_registration",
        "professional_licence",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
