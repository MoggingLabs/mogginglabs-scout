export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["tenant_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: Database["public"]["Enums"]["tenant_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["tenant_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string;
          role: Database["public"]["Enums"]["membership_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          profile_id: string;
          role?: Database["public"]["Enums"]["membership_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          profile_id?: string;
          role?: Database["public"]["Enums"]["membership_role"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      lead_sources: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          kind: string;
          external_reference: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          kind?: string;
          external_reference?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          kind?: string;
          external_reference?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_sources_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      import_batches: {
        Row: {
          id: string;
          tenant_id: string;
          source_id: string | null;
          filename: string;
          status: Database["public"]["Enums"]["import_batch_status"];
          total_rows: number;
          valid_rows: number;
          invalid_rows: number;
          committed_rows: number;
          created_by: string | null;
          mapping: Json;
          error_summary: Json;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source_id?: string | null;
          filename: string;
          status?: Database["public"]["Enums"]["import_batch_status"];
          total_rows?: number;
          valid_rows?: number;
          invalid_rows?: number;
          committed_rows?: number;
          created_by?: string | null;
          mapping?: Json;
          error_summary?: Json;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          source_id?: string | null;
          filename?: string;
          status?: Database["public"]["Enums"]["import_batch_status"];
          total_rows?: number;
          valid_rows?: number;
          invalid_rows?: number;
          committed_rows?: number;
          created_by?: string | null;
          mapping?: Json;
          error_summary?: Json;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "import_batches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_batches_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "lead_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_batches_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      leads: {
        Row: {
          id: string;
          tenant_id: string;
          source_id: string | null;
          import_batch_id: string | null;
          company_name: string;
          domain: string | null;
          website_url: string | null;
          industry: string | null;
          city: string | null;
          state_region: string | null;
          country: string;
          phone: string | null;
          email: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          source_metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source_id?: string | null;
          import_batch_id?: string | null;
          company_name: string;
          domain?: string | null;
          website_url?: string | null;
          industry?: string | null;
          city?: string | null;
          state_region?: string | null;
          country?: string;
          phone?: string | null;
          email?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          source_metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          source_id?: string | null;
          import_batch_id?: string | null;
          company_name?: string;
          domain?: string | null;
          website_url?: string | null;
          industry?: string | null;
          city?: string | null;
          state_region?: string | null;
          country?: string;
          phone?: string | null;
          email?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          source_metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_import_batch_id_fkey";
            columns: ["import_batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "lead_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      import_rows: {
        Row: {
          id: string;
          batch_id: string;
          tenant_id: string;
          row_number: number;
          status: Database["public"]["Enums"]["import_row_status"];
          raw_data: Json;
          normalized_data: Json;
          validation_errors: Json;
          duplicate_key: string | null;
          lead_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          tenant_id: string;
          row_number: number;
          status?: Database["public"]["Enums"]["import_row_status"];
          raw_data: Json;
          normalized_data?: Json;
          validation_errors?: Json;
          duplicate_key?: string | null;
          lead_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          tenant_id?: string;
          row_number?: number;
          status?: Database["public"]["Enums"]["import_row_status"];
          raw_data?: Json;
          normalized_data?: Json;
          validation_errors?: Json;
          duplicate_key?: string | null;
          lead_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_rows_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_rows_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_rows_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tenant_status: "active" | "archived";
      membership_role: "owner" | "admin" | "member" | "viewer";
      lead_status: "new" | "qualified" | "disqualified" | "archived";
      import_batch_status:
        | "draft"
        | "validating"
        | "ready"
        | "committed"
        | "failed";
      import_row_status:
        | "pending"
        | "valid"
        | "invalid"
        | "duplicate"
        | "committed";
    };
    CompositeTypes: Record<string, never>;
  };
};
