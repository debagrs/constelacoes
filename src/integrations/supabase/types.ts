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
      activities: {
        Row: {
          class_id: string
          created_at: string
          due_at: string | null
          id: string
          prompt: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          prompt?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          prompt?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_decisions: {
        Row: {
          action: Database["public"]["Enums"]["ai_decision_action"]
          created_at: string
          diff: Json
          id: string
          notes: string | null
          proposal_id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["ai_decision_action"]
          created_at?: string
          diff?: Json
          id?: string
          notes?: string | null
          proposal_id: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["ai_decision_action"]
          created_at?: string
          diff?: Json
          id?: string
          notes?: string | null
          proposal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_decisions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_proposals: {
        Row: {
          created_at: string
          id: string
          payload: Json
          proposal_type: string
          review_notes: string | null
          status: Database["public"]["Enums"]["ai_proposal_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["ai_target_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          proposal_type: string
          review_notes?: string | null
          status?: Database["public"]["Enums"]["ai_proposal_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["ai_target_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          proposal_type?: string
          review_notes?: string | null
          status?: Database["public"]["Enums"]["ai_proposal_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["ai_target_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atlas_cards: {
        Row: {
          atlas_id: string
          body: string | null
          card_type: string
          created_at: string
          entity_id: string | null
          group_id: string | null
          height: number
          id: string
          link_url: string | null
          media_url: string | null
          rotation: number
          style: Json
          title: string | null
          updated_at: string
          width: number
          x: number
          y: number
          z_index: number
        }
        Insert: {
          atlas_id: string
          body?: string | null
          card_type: string
          created_at?: string
          entity_id?: string | null
          group_id?: string | null
          height?: number
          id?: string
          link_url?: string | null
          media_url?: string | null
          rotation?: number
          style?: Json
          title?: string | null
          updated_at?: string
          width?: number
          x?: number
          y?: number
          z_index?: number
        }
        Update: {
          atlas_id?: string
          body?: string | null
          card_type?: string
          created_at?: string
          entity_id?: string | null
          group_id?: string | null
          height?: number
          id?: string
          link_url?: string | null
          media_url?: string | null
          rotation?: number
          style?: Json
          title?: string | null
          updated_at?: string
          width?: number
          x?: number
          y?: number
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "atlas_cards_atlas_id_fkey"
            columns: ["atlas_id"]
            isOneToOne: false
            referencedRelation: "atlases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_cards_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_cards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "atlas_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_connections: {
        Row: {
          argument: string | null
          atlas_id: string
          created_at: string
          id: string
          relation_type: string | null
          source_card_id: string
          target_card_id: string
          updated_at: string
        }
        Insert: {
          argument?: string | null
          atlas_id: string
          created_at?: string
          id?: string
          relation_type?: string | null
          source_card_id: string
          target_card_id: string
          updated_at?: string
        }
        Update: {
          argument?: string | null
          atlas_id?: string
          created_at?: string
          id?: string
          relation_type?: string | null
          source_card_id?: string
          target_card_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_connections_atlas_id_fkey"
            columns: ["atlas_id"]
            isOneToOne: false
            referencedRelation: "atlases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_connections_source_card_id_fkey"
            columns: ["source_card_id"]
            isOneToOne: false
            referencedRelation: "atlas_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_connections_target_card_id_fkey"
            columns: ["target_card_id"]
            isOneToOne: false
            referencedRelation: "atlas_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_groups: {
        Row: {
          atlas_id: string
          color: string | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          atlas_id: string
          color?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          atlas_id?: string
          color?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_groups_atlas_id_fkey"
            columns: ["atlas_id"]
            isOneToOne: false
            referencedRelation: "atlases"
            referencedColumns: ["id"]
          },
        ]
      }
      atlases: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          owner_id: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          owner_id: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          owner_id?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bibliography: {
        Row: {
          authors: string | null
          created_at: string
          created_by: string | null
          doi: string | null
          id: string
          isbn: string | null
          ref_type: string | null
          title: string
          updated_at: string
          url: string | null
          year: number | null
        }
        Insert: {
          authors?: string | null
          created_at?: string
          created_by?: string | null
          doi?: string | null
          id?: string
          isbn?: string | null
          ref_type?: string | null
          title: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Update: {
          authors?: string | null
          created_at?: string
          created_by?: string | null
          doi?: string | null
          id?: string
          isbn?: string | null
          ref_type?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      class_enrollments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          professor_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          professor_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          professor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      curation_reviews: {
        Row: {
          atlas_id: string | null
          comment: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["content_status"] | null
          id: string
          reviewer_id: string | null
          to_status: Database["public"]["Enums"]["content_status"]
        }
        Insert: {
          atlas_id?: string | null
          comment?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["content_status"] | null
          id?: string
          reviewer_id?: string | null
          to_status: Database["public"]["Enums"]["content_status"]
        }
        Update: {
          atlas_id?: string | null
          comment?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["content_status"] | null
          id?: string
          reviewer_id?: string | null
          to_status?: Database["public"]["Enums"]["content_status"]
        }
        Relationships: [
          {
            foreignKeyName: "curation_reviews_atlas_id_fkey"
            columns: ["atlas_id"]
            isOneToOne: false
            referencedRelation: "atlases"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          colors: string[]
          continent: string | null
          country: string | null
          created_at: string
          created_by: string | null
          culture: string | null
          date_display: string | null
          date_end: number | null
          date_start: number | null
          description: string | null
          embedding: string | null
          entity_type: string
          id: string
          image_license: string | null
          image_url: string | null
          location: string | null
          materials: string[]
          metadata: Json
          open_image: boolean
          slug: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["content_status"]
          subtitle: string | null
          tags: string[]
          techniques: string[]
          themes: string[]
          title: string
          updated_at: string
        }
        Insert: {
          colors?: string[]
          continent?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          culture?: string | null
          date_display?: string | null
          date_end?: number | null
          date_start?: number | null
          description?: string | null
          embedding?: string | null
          entity_type: string
          id?: string
          image_license?: string | null
          image_url?: string | null
          location?: string | null
          materials?: string[]
          metadata?: Json
          open_image?: boolean
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          tags?: string[]
          techniques?: string[]
          themes?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          colors?: string[]
          continent?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          culture?: string | null
          date_display?: string | null
          date_end?: number | null
          date_start?: number | null
          description?: string | null
          embedding?: string | null
          entity_type?: string
          id?: string
          image_license?: string | null
          image_url?: string | null
          location?: string | null
          materials?: string[]
          metadata?: Json
          open_image?: boolean
          slug?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          tags?: string[]
          techniques?: string[]
          themes?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      entity_bibliography: {
        Row: {
          bibliography_id: string
          entity_id: string
        }
        Insert: {
          bibliography_id: string
          entity_id: string
        }
        Update: {
          bibliography_id?: string
          entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_bibliography_bibliography_id_fkey"
            columns: ["bibliography_id"]
            isOneToOne: false
            referencedRelation: "bibliography"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_bibliography_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_motifs: {
        Row: {
          entity_id: string
          motif_id: string
        }
        Insert: {
          entity_id: string
          motif_id: string
        }
        Update: {
          entity_id?: string
          motif_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_motifs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_motifs_motif_id_fkey"
            columns: ["motif_id"]
            isOneToOne: false
            referencedRelation: "motifs"
            referencedColumns: ["id"]
          },
        ]
      }
      image_suggestions: {
        Row: {
          candidate_description: string | null
          candidate_title: string | null
          created_at: string
          entity_id: string
          id: string
          image_url: string
          license: string | null
          notes: string | null
          rank: number
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          source_url: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          wikidata_qid: string | null
        }
        Insert: {
          candidate_description?: string | null
          candidate_title?: string | null
          created_at?: string
          entity_id: string
          id?: string
          image_url: string
          license?: string | null
          notes?: string | null
          rank?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          source_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          wikidata_qid?: string | null
        }
        Update: {
          candidate_description?: string | null
          candidate_title?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          image_url?: string
          license?: string | null
          notes?: string | null
          rank?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          source_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          wikidata_qid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_suggestions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      motifs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          institution: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          institution?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          institution?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      relation_bibliography: {
        Row: {
          bibliography_id: string
          relation_id: string
        }
        Insert: {
          bibliography_id: string
          relation_id: string
        }
        Update: {
          bibliography_id?: string
          relation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relation_bibliography_bibliography_id_fkey"
            columns: ["bibliography_id"]
            isOneToOne: false
            referencedRelation: "bibliography"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relation_bibliography_relation_id_fkey"
            columns: ["relation_id"]
            isOneToOne: false
            referencedRelation: "relations"
            referencedColumns: ["id"]
          },
        ]
      }
      relations: {
        Row: {
          author: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          relation_type: string
          source_id: string
          status: Database["public"]["Enums"]["content_status"]
          target_id: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          relation_type: string
          source_id: string
          status?: Database["public"]["Enums"]["content_status"]
          target_id: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          relation_type?: string
          source_id?: string
          status?: Database["public"]["Enums"]["content_status"]
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relations_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "entities"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_image_suggestion: {
        Args: { _suggestion_id: string }
        Returns: undefined
      }
      can_edit_atlas: { Args: { _atlas_id: string }; Returns: boolean }
      can_view_atlas: { Args: { _atlas_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_current_user: {
        Args: { _display_name?: string }
        Returns: undefined
      }
      is_enrolled: { Args: { _class_id: string }; Returns: boolean }
      is_reviewer: { Args: { _user_id: string }; Returns: boolean }
      owns_class: { Args: { _class_id: string }; Returns: boolean }
      reject_image_suggestion: {
        Args: { _notes?: string; _suggestion_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ai_decision_action: "accept" | "reject" | "edit"
      ai_proposal_status: "pending" | "accepted" | "rejected" | "edited"
      ai_target_type: "entity" | "atlas"
      app_role: "admin" | "curador" | "professor" | "estudante"
      content_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "published"
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
      ai_decision_action: ["accept", "reject", "edit"],
      ai_proposal_status: ["pending", "accepted", "rejected", "edited"],
      ai_target_type: ["entity", "atlas"],
      app_role: ["admin", "curador", "professor", "estudante"],
      content_status: [
        "draft",
        "submitted",
        "in_review",
        "approved",
        "published",
      ],
    },
  },
} as const
