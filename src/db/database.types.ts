export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          payload: Json | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          payload?: Json | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          payload?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      badge_applications: {
        Row: {
          applicant_id: string;
          catalog_badge_id: string;
          catalog_badge_version: number;
          created_at: string;
          date_of_application: string;
          date_of_fulfillment: string | null;
          id: string;
          reason: string | null;
          review_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          applicant_id: string;
          catalog_badge_id: string;
          catalog_badge_version: number;
          created_at?: string;
          date_of_application: string;
          date_of_fulfillment?: string | null;
          id?: string;
          reason?: string | null;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          applicant_id?: string;
          catalog_badge_id?: string;
          catalog_badge_version?: number;
          created_at?: string;
          date_of_application?: string;
          date_of_fulfillment?: string | null;
          id?: string;
          reason?: string | null;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "badge_applications_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "badge_applications_catalog_badge_id_fkey";
            columns: ["catalog_badge_id"];
            isOneToOne: false;
            referencedRelation: "catalog_badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "badge_applications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_badges: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          deactivated_at: string | null;
          description: string | null;
          id: string;
          level: string;
          metadata: Json | null;
          status: string;
          title: string;
          version: number;
        };
        Insert: {
          category: string;
          created_at?: string;
          created_by?: string | null;
          deactivated_at?: string | null;
          description?: string | null;
          id?: string;
          level: string;
          metadata?: Json | null;
          status?: string;
          title: string;
          version?: number;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          deactivated_at?: string | null;
          description?: string | null;
          id?: string;
          level?: string;
          metadata?: Json | null;
          status?: string;
          title?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_badges_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      promotion_badges: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          badge_application_id: string;
          consumed: boolean;
          id: string;
          promotion_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          badge_application_id: string;
          consumed?: boolean;
          id?: string;
          promotion_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          badge_application_id?: string;
          consumed?: boolean;
          id?: string;
          promotion_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotion_badges_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotion_badges_badge_application_id_fkey";
            columns: ["badge_application_id"];
            isOneToOne: false;
            referencedRelation: "badge_applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotion_badges_promotion_id_fkey";
            columns: ["promotion_id"];
            isOneToOne: false;
            referencedRelation: "promotions";
            referencedColumns: ["id"];
          },
        ];
      };
      promotion_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          from_level: string;
          id: string;
          is_active: boolean;
          name: string;
          path: string;
          rules: Json;
          to_level: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          from_level: string;
          id?: string;
          is_active?: boolean;
          name: string;
          path: string;
          rules: Json;
          to_level: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          from_level?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          path?: string;
          rules?: Json;
          to_level?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotion_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      promotions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          created_by: string | null;
          executed: boolean;
          from_level: string;
          id: string;
          path: string;
          reject_reason: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          status: string;
          submitted_at: string | null;
          template_id: string;
          to_level: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          executed?: boolean;
          from_level: string;
          id?: string;
          path: string;
          reject_reason?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          template_id: string;
          to_level: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          executed?: boolean;
          from_level?: string;
          id?: string;
          path?: string;
          reject_reason?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          template_id?: string;
          to_level?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotions_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotions_rejected_by_fkey";
            columns: ["rejected_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotions_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "promotion_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json | null;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: Json | null;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          google_sub: string;
          id: string;
          is_admin: boolean;
          last_seen_at: string | null;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          email: string;
          google_sub: string;
          id?: string;
          is_admin?: boolean;
          last_seen_at?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          google_sub?: string;
          id?: string;
          is_admin?: boolean;
          last_seen_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
