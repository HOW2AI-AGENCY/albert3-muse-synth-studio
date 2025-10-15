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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          track_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          track_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          track_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      callback_logs: {
        Row: {
          callback_type: string
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          track_id: string | null
        }
        Insert: {
          callback_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          track_id?: string | null
        }
        Update: {
          callback_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "callback_logs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      lyrics_jobs: {
        Row: {
          base_lyrics: string | null
          call_strategy: string | null
          callback_url: string | null
          created_at: string
          error_message: string | null
          id: string
          initial_response: Json | null
          is_extension: boolean | null
          last_callback: Json | null
          last_poll_response: Json | null
          metadata: Json | null
          prompt: string
          provider: string | null
          request_payload: Json | null
          status: string
          suno_task_id: string | null
          track_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_lyrics?: string | null
          call_strategy?: string | null
          callback_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          initial_response?: Json | null
          is_extension?: boolean | null
          last_callback?: Json | null
          last_poll_response?: Json | null
          metadata?: Json | null
          prompt: string
          provider?: string | null
          request_payload?: Json | null
          status?: string
          suno_task_id?: string | null
          track_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_lyrics?: string | null
          call_strategy?: string | null
          callback_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          initial_response?: Json | null
          is_extension?: boolean | null
          last_callback?: Json | null
          last_poll_response?: Json | null
          metadata?: Json | null
          prompt?: string
          provider?: string | null
          request_payload?: Json | null
          status?: string
          suno_task_id?: string | null
          track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lyrics_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      lyrics_variants: {
        Row: {
          content: string | null
          created_at: string
          error_message: string | null
          id: string
          job_id: string
          status: string | null
          title: string | null
          updated_at: string
          variant_index: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_id: string
          status?: string | null
          title?: string | null
          updated_at?: string
          variant_index: number
        }
        Update: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string
          status?: string | null
          title?: string | null
          updated_at?: string
          variant_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "lyrics_variants_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "lyrics_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompt_history: {
        Row: {
          created_at: string | null
          genre: string | null
          id: string
          is_template: boolean | null
          last_used_at: string | null
          lyrics: string | null
          metadata: Json | null
          mood: string | null
          prompt: string
          provider: string | null
          style_tags: string[] | null
          template_name: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          genre?: string | null
          id?: string
          is_template?: boolean | null
          last_used_at?: string | null
          lyrics?: string | null
          metadata?: Json | null
          mood?: string | null
          prompt: string
          provider?: string | null
          style_tags?: string[] | null
          template_name?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          genre?: string | null
          id?: string
          is_template?: boolean | null
          last_used_at?: string | null
          lyrics?: string | null
          metadata?: Json | null
          mood?: string | null
          prompt?: string
          provider?: string | null
          style_tags?: string[] | null
          template_name?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      song_descriptions: {
        Row: {
          ai_description: string | null
          audio_file_url: string
          created_at: string
          danceability: number | null
          detected_genre: string | null
          detected_instruments: string[] | null
          detected_mood: string | null
          energy_level: number | null
          error_message: string | null
          id: string
          key_signature: string | null
          metadata: Json | null
          mureka_file_id: string | null
          mureka_task_id: string | null
          status: string
          tempo_bpm: number | null
          track_id: string | null
          updated_at: string
          user_id: string
          valence: number | null
        }
        Insert: {
          ai_description?: string | null
          audio_file_url: string
          created_at?: string
          danceability?: number | null
          detected_genre?: string | null
          detected_instruments?: string[] | null
          detected_mood?: string | null
          energy_level?: number | null
          error_message?: string | null
          id?: string
          key_signature?: string | null
          metadata?: Json | null
          mureka_file_id?: string | null
          mureka_task_id?: string | null
          status?: string
          tempo_bpm?: number | null
          track_id?: string | null
          updated_at?: string
          user_id: string
          valence?: number | null
        }
        Update: {
          ai_description?: string | null
          audio_file_url?: string
          created_at?: string
          danceability?: number | null
          detected_genre?: string | null
          detected_instruments?: string[] | null
          detected_mood?: string | null
          energy_level?: number | null
          error_message?: string | null
          id?: string
          key_signature?: string | null
          metadata?: Json | null
          mureka_file_id?: string | null
          mureka_task_id?: string | null
          status?: string
          tempo_bpm?: number | null
          track_id?: string | null
          updated_at?: string
          user_id?: string
          valence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "song_descriptions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      song_recognitions: {
        Row: {
          audio_file_url: string
          confidence_score: number | null
          created_at: string
          error_message: string | null
          external_ids: Json | null
          id: string
          metadata: Json | null
          mureka_file_id: string | null
          mureka_task_id: string | null
          recognized_album: string | null
          recognized_artist: string | null
          recognized_title: string | null
          release_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_file_url: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          external_ids?: Json | null
          id?: string
          metadata?: Json | null
          mureka_file_id?: string | null
          mureka_task_id?: string | null
          recognized_album?: string | null
          recognized_artist?: string | null
          recognized_title?: string | null
          release_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_file_url?: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          external_ids?: Json | null
          id?: string
          metadata?: Json | null
          mureka_file_id?: string | null
          mureka_task_id?: string | null
          recognized_album?: string | null
          recognized_artist?: string | null
          recognized_title?: string | null
          release_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      track_likes: {
        Row: {
          created_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_likes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      track_retry_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          track_id: string
        }
        Insert: {
          attempt_number: number
          attempted_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          track_id: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_retry_attempts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_stems: {
        Row: {
          audio_url: string
          created_at: string
          id: string
          metadata: Json | null
          separation_mode: string
          stem_type: string
          suno_task_id: string | null
          track_id: string
          version_id: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string
          id?: string
          metadata?: Json | null
          separation_mode: string
          stem_type: string
          suno_task_id?: string | null
          track_id: string
          version_id?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          separation_mode?: string
          stem_type?: string
          suno_task_id?: string | null
          track_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_stems_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_stems_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_versions: {
        Row: {
          audio_url: string | null
          cover_url: string | null
          created_at: string
          duration: number | null
          id: string
          is_master: boolean | null
          lyrics: string | null
          metadata: Json | null
          parent_track_id: string
          suno_id: string | null
          version_number: number
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          is_master?: boolean | null
          lyrics?: string | null
          metadata?: Json | null
          parent_track_id: string
          suno_id?: string | null
          version_number: number
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          is_master?: boolean | null
          lyrics?: string | null
          metadata?: Json | null
          parent_track_id?: string
          suno_id?: string | null
          version_number?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_versions_parent_track_id_fkey"
            columns: ["parent_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          audio_url: string | null
          cover_url: string | null
          created_at: string
          created_at_suno: string | null
          download_count: number | null
          duration: number | null
          duration_seconds: number | null
          error_message: string | null
          genre: string | null
          has_stems: boolean | null
          has_vocals: boolean | null
          id: string
          idempotency_key: string | null
          improved_prompt: string | null
          is_public: boolean | null
          like_count: number | null
          lyrics: string | null
          metadata: Json | null
          model_name: string | null
          mood: string | null
          play_count: number | null
          progress_percent: number | null
          prompt: string
          provider: string | null
          reference_audio_url: string | null
          status: string
          style_tags: string[] | null
          suno_id: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_at_suno?: string | null
          download_count?: number | null
          duration?: number | null
          duration_seconds?: number | null
          error_message?: string | null
          genre?: string | null
          has_stems?: boolean | null
          has_vocals?: boolean | null
          id?: string
          idempotency_key?: string | null
          improved_prompt?: string | null
          is_public?: boolean | null
          like_count?: number | null
          lyrics?: string | null
          metadata?: Json | null
          model_name?: string | null
          mood?: string | null
          play_count?: number | null
          progress_percent?: number | null
          prompt: string
          provider?: string | null
          reference_audio_url?: string | null
          status?: string
          style_tags?: string[] | null
          suno_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_at_suno?: string | null
          download_count?: number | null
          duration?: number | null
          duration_seconds?: number | null
          error_message?: string | null
          genre?: string | null
          has_stems?: boolean | null
          has_vocals?: boolean | null
          id?: string
          idempotency_key?: string | null
          improved_prompt?: string | null
          is_public?: boolean | null
          like_count?: number | null
          lyrics?: string | null
          metadata?: Json | null
          model_name?: string | null
          mood?: string | null
          play_count?: number | null
          progress_percent?: number | null
          prompt?: string
          provider?: string | null
          reference_audio_url?: string | null
          status?: string
          style_tags?: string[] | null
          suno_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tracks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wav_jobs: {
        Row: {
          audio_id: string
          callback_url: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          status: string
          suno_task_id: string | null
          track_id: string
          updated_at: string | null
          user_id: string
          wav_url: string | null
        }
        Insert: {
          audio_id: string
          callback_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          suno_task_id?: string | null
          track_id: string
          updated_at?: string | null
          user_id: string
          wav_url?: string | null
        }
        Update: {
          audio_id?: string
          callback_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          suno_task_id?: string | null
          track_id?: string
          updated_at?: string | null
          user_id?: string
          wav_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wav_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_production_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      decrement_test_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      get_user_mureka_stats: {
        Args: { user_uuid: string }
        Returns: {
          total_likes: number
          total_plays: number
          total_tracks: number
        }[]
      }
      has_role: {
        Args:
          | { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }
          | { _role: string; _user_id: string }
        Returns: boolean
      }
      increment_download_count: {
        Args: { track_id: string }
        Returns: undefined
      }
      increment_play_count: {
        Args: { track_id: string }
        Returns: undefined
      }
      increment_view_count: {
        Args: { track_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      lyrics_job_status: "pending" | "processing" | "completed" | "failed"
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
      app_role: ["admin", "moderator", "user"],
      lyrics_job_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const
