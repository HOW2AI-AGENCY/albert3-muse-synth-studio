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
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "analytics_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
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
      audio_library: {
        Row: {
          analysis_data: Json | null
          analysis_status: string | null
          bpm: number | null
          category: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          file_name: string
          file_size: number | null
          file_url: string
          folder: string | null
          id: string
          is_favorite: boolean | null
          key: string | null
          last_used_at: string | null
          parent_folder_id: string | null
          project_id: string | null
          recognized_song_id: string | null
          source_metadata: Json | null
          source_type: string
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          analysis_status?: string | null
          bpm?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_name: string
          file_size?: number | null
          file_url: string
          folder?: string | null
          id?: string
          is_favorite?: boolean | null
          key?: string | null
          last_used_at?: string | null
          parent_folder_id?: string | null
          project_id?: string | null
          recognized_song_id?: string | null
          source_metadata?: Json | null
          source_type: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          analysis_status?: string | null
          bpm?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          folder?: string | null
          id?: string
          is_favorite?: boolean | null
          key?: string | null
          last_used_at?: string | null
          parent_folder_id?: string | null
          project_id?: string | null
          recognized_song_id?: string | null
          source_metadata?: Json | null
          source_type?: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_library_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "cloud_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_library_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "music_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_library_recognized_song_id_fkey"
            columns: ["recognized_song_id"]
            isOneToOne: false
            referencedRelation: "song_recognitions"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_upscale_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          ddim_steps: number | null
          error_message: string | null
          guidance_scale: number | null
          id: string
          input_audio_url: string
          metadata: Json | null
          model_version: string | null
          output_audio_url: string | null
          replicate_prediction_id: string | null
          seed: number | null
          status: string
          track_id: string | null
          truncated_batches: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          ddim_steps?: number | null
          error_message?: string | null
          guidance_scale?: number | null
          id?: string
          input_audio_url: string
          metadata?: Json | null
          model_version?: string | null
          output_audio_url?: string | null
          replicate_prediction_id?: string | null
          seed?: number | null
          status?: string
          track_id?: string | null
          truncated_batches?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          ddim_steps?: number | null
          error_message?: string | null
          guidance_scale?: number | null
          id?: string
          input_audio_url?: string
          metadata?: Json | null
          model_version?: string | null
          output_audio_url?: string | null
          replicate_prediction_id?: string | null
          seed?: number | null
          status?: string
          track_id?: string | null
          truncated_batches?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_upscale_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "audio_upscale_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_upscale_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_edited: boolean | null
          like_count: number | null
          parent_id: string | null
          post_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_edited?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_edited?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          comment_count: number | null
          content: string
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          like_count: number | null
          metadata: Json | null
          published_at: string | null
          reading_time_minutes: number | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          status: string
          subtitle: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          comment_count?: number | null
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          metadata?: Json | null
          published_at?: string | null
          reading_time_minutes?: number | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          status?: string
          subtitle?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          comment_count?: number | null
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          metadata?: Json | null
          published_at?: string | null
          reading_time_minutes?: number | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          status?: string
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "callback_logs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callback_logs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_jobs: {
        Row: {
          classification_id: string | null
          classifier_config: Json | null
          classifier_type: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_audio_url: string
          output_visualization_url: string | null
          raw_output: Json | null
          replicate_prediction_id: string | null
          retry_count: number | null
          status: string
          track_id: string | null
          updated_at: string
          user_id: string
          version_id: string | null
        }
        Insert: {
          classification_id?: string | null
          classifier_config?: Json | null
          classifier_type: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_audio_url: string
          output_visualization_url?: string | null
          raw_output?: Json | null
          replicate_prediction_id?: string | null
          retry_count?: number | null
          status?: string
          track_id?: string | null
          updated_at?: string
          user_id: string
          version_id?: string | null
        }
        Update: {
          classification_id?: string | null
          classifier_config?: Json | null
          classifier_type?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_audio_url?: string
          output_visualization_url?: string | null
          raw_output?: Json | null
          replicate_prediction_id?: string | null
          retry_count?: number | null
          status?: string
          track_id?: string | null
          updated_at?: string
          user_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classification_jobs_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "music_classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "classification_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_jobs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_folders: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_favorite: boolean | null
          metadata: Json | null
          name: string
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          metadata?: Json | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cloud_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_limits: {
        Row: {
          created_at: string | null
          generations_limit_daily: number | null
          generations_used_today: number | null
          id: string
          last_reset_at: string | null
          plan_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          generations_limit_daily?: number | null
          generations_used_today?: number | null
          id?: string
          last_reset_at?: string | null
          plan_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          generations_limit_daily?: number | null
          generations_used_today?: number | null
          id?: string
          last_reset_at?: string | null
          plan_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lyrics_generation_log: {
        Row: {
          created_at: string
          error_message: string | null
          generated_lyrics: string | null
          generated_title: string | null
          id: string
          metadata: Json | null
          prompt: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generated_lyrics?: string | null
          generated_title?: string | null
          id?: string
          metadata?: Json | null
          prompt: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generated_lyrics?: string | null
          generated_title?: string | null
          id?: string
          metadata?: Json | null
          prompt?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "lyrics_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lyrics_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
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
      music_classifications: {
        Row: {
          classifier_type: string
          classifier_version: string | null
          confidence_score: number | null
          created_at: string
          embeddings: Json | null
          error_message: string | null
          genres_ranked: Json | null
          id: string
          instruments_detected: string[] | null
          instruments_ranked: Json | null
          moods_ranked: Json | null
          primary_genre: string | null
          primary_mood: string | null
          primary_style: string | null
          processing_time_ms: number | null
          replicate_prediction_id: string | null
          status: string
          styles_ranked: Json | null
          track_id: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          classifier_type: string
          classifier_version?: string | null
          confidence_score?: number | null
          created_at?: string
          embeddings?: Json | null
          error_message?: string | null
          genres_ranked?: Json | null
          id?: string
          instruments_detected?: string[] | null
          instruments_ranked?: Json | null
          moods_ranked?: Json | null
          primary_genre?: string | null
          primary_mood?: string | null
          primary_style?: string | null
          processing_time_ms?: number | null
          replicate_prediction_id?: string | null
          status?: string
          styles_ranked?: Json | null
          track_id: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          classifier_type?: string
          classifier_version?: string | null
          confidence_score?: number | null
          created_at?: string
          embeddings?: Json | null
          error_message?: string | null
          genres_ranked?: Json | null
          id?: string
          instruments_detected?: string[] | null
          instruments_ranked?: Json | null
          moods_ranked?: Json | null
          primary_genre?: string | null
          primary_mood?: string | null
          primary_style?: string | null
          processing_time_ms?: number | null
          replicate_prediction_id?: string | null
          status?: string
          styles_ranked?: Json | null
          track_id?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_classifications_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "music_classifications_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_classifications_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_classifications_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_projects: {
        Row: {
          ai_context: Json | null
          ai_context_updated_at: string | null
          ai_context_version: number | null
          ai_generation_params: Json | null
          completed_tracks: number | null
          concept_description: string | null
          cover_url: string | null
          created_at: string | null
          created_with_ai: boolean | null
          description: string | null
          genre: string | null
          id: string
          is_public: boolean | null
          last_activity_at: string | null
          mood: string | null
          name: string
          persona_id: string | null
          planned_tracks: Json | null
          project_type: Database["public"]["Enums"]["project_type"]
          story_theme: string | null
          style_tags: string[] | null
          tempo_range: Json | null
          total_duration: number | null
          total_tracks: number | null
          updated_at: string | null
          user_id: string
          visual_references: string[] | null
        }
        Insert: {
          ai_context?: Json | null
          ai_context_updated_at?: string | null
          ai_context_version?: number | null
          ai_generation_params?: Json | null
          completed_tracks?: number | null
          concept_description?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_with_ai?: boolean | null
          description?: string | null
          genre?: string | null
          id?: string
          is_public?: boolean | null
          last_activity_at?: string | null
          mood?: string | null
          name: string
          persona_id?: string | null
          planned_tracks?: Json | null
          project_type?: Database["public"]["Enums"]["project_type"]
          story_theme?: string | null
          style_tags?: string[] | null
          tempo_range?: Json | null
          total_duration?: number | null
          total_tracks?: number | null
          updated_at?: string | null
          user_id: string
          visual_references?: string[] | null
        }
        Update: {
          ai_context?: Json | null
          ai_context_updated_at?: string | null
          ai_context_version?: number | null
          ai_generation_params?: Json | null
          completed_tracks?: number | null
          concept_description?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_with_ai?: boolean | null
          description?: string | null
          genre?: string | null
          id?: string
          is_public?: boolean | null
          last_activity_at?: string | null
          mood?: string | null
          name?: string
          persona_id?: string | null
          planned_tracks?: Json | null
          project_type?: Database["public"]["Enums"]["project_type"]
          story_theme?: string | null
          style_tags?: string[] | null
          tempo_range?: Json | null
          total_duration?: number | null
          total_tracks?: number | null
          updated_at?: string | null
          user_id?: string
          visual_references?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "music_projects_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "suno_personas"
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
          credits_remaining: number | null
          credits_used_today: number | null
          email: string | null
          full_name: string | null
          id: string
          last_credit_reset_at: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits_remaining?: number | null
          credits_used_today?: number | null
          email?: string | null
          full_name?: string | null
          id: string
          last_credit_reset_at?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits_remaining?: number | null
          credits_used_today?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_credit_reset_at?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_prompts: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          metadata: Json | null
          project_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          project_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          project_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_prompts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "music_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tracks: {
        Row: {
          added_at: string | null
          added_by: string | null
          position: number | null
          project_id: string
          track_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          position?: number | null
          project_id: string
          track_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          position?: number | null
          project_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tracks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "music_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "project_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_history: {
        Row: {
          created_at: string | null
          generation_status: string | null
          generation_time_ms: number | null
          genre: string | null
          id: string
          is_template: boolean | null
          last_used_at: string | null
          lyrics: string | null
          metadata: Json | null
          model_version: string | null
          mood: string | null
          prompt: string
          provider: string | null
          result_track_id: string | null
          style_tags: string[] | null
          template_name: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          generation_status?: string | null
          generation_time_ms?: number | null
          genre?: string | null
          id?: string
          is_template?: boolean | null
          last_used_at?: string | null
          lyrics?: string | null
          metadata?: Json | null
          model_version?: string | null
          mood?: string | null
          prompt: string
          provider?: string | null
          result_track_id?: string | null
          style_tags?: string[] | null
          template_name?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          generation_status?: string | null
          generation_time_ms?: number | null
          genre?: string | null
          id?: string
          is_template?: boolean | null
          last_used_at?: string | null
          lyrics?: string | null
          metadata?: Json | null
          model_version?: string | null
          mood?: string | null
          prompt?: string
          provider?: string | null
          result_track_id?: string | null
          style_tags?: string[] | null
          template_name?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_history_result_track_id_fkey"
            columns: ["result_track_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "prompt_history_result_track_id_fkey"
            columns: ["result_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_history_result_track_id_fkey"
            columns: ["result_track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          created_at: string
          id: string
          key: string
          last_refill: number
          last_request: number | null
          tokens: number
          updated_at: string
          window_start: number
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          last_refill: number
          last_request?: number | null
          tokens?: number
          updated_at?: string
          window_start: number
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          last_refill?: number
          last_request?: number | null
          tokens?: number
          updated_at?: string
          window_start?: number
        }
        Relationships: []
      }
      saved_lyrics: {
        Row: {
          content: string
          created_at: string | null
          folder: string | null
          genre: string | null
          id: string
          is_favorite: boolean | null
          job_id: string | null
          language: string | null
          last_used_at: string | null
          mood: string | null
          project_id: string | null
          prompt: string | null
          search_vector: unknown
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
          variant_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          folder?: string | null
          genre?: string | null
          id?: string
          is_favorite?: boolean | null
          job_id?: string | null
          language?: string | null
          last_used_at?: string | null
          mood?: string | null
          project_id?: string | null
          prompt?: string | null
          search_vector?: unknown
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          variant_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          folder?: string | null
          genre?: string | null
          id?: string
          is_favorite?: boolean | null
          job_id?: string | null
          language?: string | null
          last_used_at?: string | null
          mood?: string | null
          project_id?: string | null
          prompt?: string | null
          search_vector?: unknown
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_lyrics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "lyrics_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_lyrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "music_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_lyrics_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "lyrics_variants"
            referencedColumns: ["id"]
          },
        ]
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
          fal_request_id: string | null
          id: string
          key_signature: string | null
          metadata: Json | null
          mureka_file_id: string | null
          mureka_task_id: string | null
          provider: string | null
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
          fal_request_id?: string | null
          id?: string
          key_signature?: string | null
          metadata?: Json | null
          mureka_file_id?: string | null
          mureka_task_id?: string | null
          provider?: string | null
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
          fal_request_id?: string | null
          id?: string
          key_signature?: string | null
          metadata?: Json | null
          mureka_file_id?: string | null
          mureka_task_id?: string | null
          provider?: string | null
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
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "song_descriptions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_descriptions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks_with_timestamped_lyrics"
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
          fal_request_id: string | null
          id: string
          metadata: Json | null
          mureka_file_id: string | null
          mureka_task_id: string | null
          provider: string | null
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
          fal_request_id?: string | null
          id?: string
          metadata?: Json | null
          mureka_file_id?: string | null
          mureka_task_id?: string | null
          provider?: string | null
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
          fal_request_id?: string | null
          id?: string
          metadata?: Json | null
          mureka_file_id?: string | null
          mureka_task_id?: string | null
          provider?: string | null
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
      subscription_plans: {
        Row: {
          created_at: string | null
          credits_daily_limit: number | null
          credits_monthly: number
          description: string | null
          display_name: string
          features: Json
          id: string
          is_active: boolean | null
          max_concurrent_generations: number | null
          max_projects: number | null
          max_reference_audios: number | null
          name: string
          price_annual: number | null
          price_monthly: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits_daily_limit?: number | null
          credits_monthly?: number
          description?: string | null
          display_name: string
          features?: Json
          id?: string
          is_active?: boolean | null
          max_concurrent_generations?: number | null
          max_projects?: number | null
          max_reference_audios?: number | null
          name: string
          price_annual?: number | null
          price_monthly?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits_daily_limit?: number | null
          credits_monthly?: number
          description?: string | null
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          max_concurrent_generations?: number | null
          max_projects?: number | null
          max_reference_audios?: number | null
          name?: string
          price_annual?: number | null
          price_monthly?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      suno_personas: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string
          id: string
          is_public: boolean | null
          last_used_at: string | null
          metadata: Json | null
          name: string
          project_id: string | null
          source_music_index: number | null
          source_suno_task_id: string | null
          source_track_id: string | null
          suno_persona_id: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_public?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          name: string
          project_id?: string | null
          source_music_index?: number | null
          source_suno_task_id?: string | null
          source_track_id?: string | null
          suno_persona_id: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_public?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          name?: string
          project_id?: string | null
          source_music_index?: number | null
          source_suno_task_id?: string | null
          source_track_id?: string | null
          suno_persona_id?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suno_personas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "music_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suno_personas_source_track_id_fkey"
            columns: ["source_track_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "suno_personas_source_track_id_fkey"
            columns: ["source_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suno_personas_source_track_id_fkey"
            columns: ["source_track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      track_archiving_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          original_audio_url: string | null
          original_cover_url: string | null
          original_video_url: string | null
          started_at: string | null
          status: string
          storage_audio_url: string | null
          storage_cover_url: string | null
          storage_video_url: string | null
          track_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          original_audio_url?: string | null
          original_cover_url?: string | null
          original_video_url?: string | null
          started_at?: string | null
          status?: string
          storage_audio_url?: string | null
          storage_cover_url?: string | null
          storage_video_url?: string | null
          track_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          original_audio_url?: string | null
          original_cover_url?: string | null
          original_video_url?: string | null
          started_at?: string | null
          status?: string
          storage_audio_url?: string | null
          storage_cover_url?: string | null
          storage_video_url?: string | null
          track_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_archiving_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "track_archiving_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_archiving_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "track_likes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_likes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
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
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "track_retry_attempts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_retry_attempts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      track_section_replacements: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          negative_tags: string | null
          parent_track_id: string
          prompt: string
          replaced_end_s: number
          replaced_start_s: number
          replacement_audio_url: string | null
          status: string
          suno_task_id: string | null
          tags: string
          updated_at: string | null
          version_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          negative_tags?: string | null
          parent_track_id: string
          prompt: string
          replaced_end_s: number
          replaced_start_s: number
          replacement_audio_url?: string | null
          status?: string
          suno_task_id?: string | null
          tags: string
          updated_at?: string | null
          version_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          negative_tags?: string | null
          parent_track_id?: string
          prompt?: string
          replaced_end_s?: number
          replaced_start_s?: number
          replacement_audio_url?: string | null
          status?: string
          suno_task_id?: string | null
          tags?: string
          updated_at?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_section_replacements_parent_track_id_fkey"
            columns: ["parent_track_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "track_section_replacements_parent_track_id_fkey"
            columns: ["parent_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_section_replacements_parent_track_id_fkey"
            columns: ["parent_track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_section_replacements_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "track_versions"
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
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "track_stems_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_stems_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
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
      track_version_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_version_likes_version_id_fkey"
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
          is_preferred_variant: boolean | null
          is_primary_variant: boolean | null
          like_count: number
          lyrics: string | null
          metadata: Json | null
          parent_track_id: string
          suno_id: string | null
          variant_index: number
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          is_preferred_variant?: boolean | null
          is_primary_variant?: boolean | null
          like_count?: number
          lyrics?: string | null
          metadata?: Json | null
          parent_track_id: string
          suno_id?: string | null
          variant_index: number
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          is_preferred_variant?: boolean | null
          is_primary_variant?: boolean | null
          like_count?: number
          lyrics?: string | null
          metadata?: Json | null
          parent_track_id?: string
          suno_id?: string | null
          variant_index?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_versions_parent_track_id_fkey"
            columns: ["parent_track_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "track_versions_parent_track_id_fkey"
            columns: ["parent_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_versions_parent_track_id_fkey"
            columns: ["parent_track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          archive_scheduled_at: string | null
          archived_at: string | null
          archived_to_storage: boolean | null
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
          mureka_task_id: string | null
          persona_id: string | null
          play_count: number | null
          progress_percent: number | null
          project_id: string | null
          prompt: string
          provider: string | null
          reference_audio_url: string | null
          source_prompt_id: string | null
          status: string
          storage_audio_url: string | null
          storage_cover_url: string | null
          storage_video_url: string | null
          style_tags: string[] | null
          suno_id: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          archive_scheduled_at?: string | null
          archived_at?: string | null
          archived_to_storage?: boolean | null
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
          mureka_task_id?: string | null
          persona_id?: string | null
          play_count?: number | null
          progress_percent?: number | null
          project_id?: string | null
          prompt: string
          provider?: string | null
          reference_audio_url?: string | null
          source_prompt_id?: string | null
          status?: string
          storage_audio_url?: string | null
          storage_cover_url?: string | null
          storage_video_url?: string | null
          style_tags?: string[] | null
          suno_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          archive_scheduled_at?: string | null
          archived_at?: string | null
          archived_to_storage?: boolean | null
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
          mureka_task_id?: string | null
          persona_id?: string | null
          play_count?: number | null
          progress_percent?: number | null
          project_id?: string | null
          prompt?: string
          provider?: string | null
          reference_audio_url?: string | null
          source_prompt_id?: string | null
          status?: string
          storage_audio_url?: string | null
          storage_cover_url?: string | null
          storage_video_url?: string | null
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
            foreignKeyName: "tracks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "music_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_source_prompt_id_fkey"
            columns: ["source_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_source_prompt_id_fkey"
            columns: ["source_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_statistics"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "prompt_statistics"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "wav_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wav_jobs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks_with_timestamped_lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      prompt_statistics: {
        Row: {
          audio_url: string | null
          cover_url: string | null
          created_at: string | null
          download_count: number | null
          generation_status: string | null
          generation_time_ms: number | null
          genre: string | null
          id: string | null
          is_template: boolean | null
          last_used_at: string | null
          like_count: number | null
          lyrics: string | null
          model_version: string | null
          mood: string | null
          play_count: number | null
          prompt: string | null
          provider: string | null
          style_tags: string[] | null
          template_name: string | null
          track_id: string | null
          track_status: string | null
          track_title: string | null
          usage_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      tracks_with_timestamped_lyrics: {
        Row: {
          audio_url: string | null
          has_timestamped_lyrics: boolean | null
          id: string | null
          lyrics: string | null
          timestamped_lyrics: Json | null
          title: string | null
        }
        Insert: {
          audio_url?: string | null
          has_timestamped_lyrics?: never
          id?: string | null
          lyrics?: string | null
          timestamped_lyrics?: never
          title?: string | null
        }
        Update: {
          audio_url?: string | null
          has_timestamped_lyrics?: never
          id?: string | null
          lyrics?: string | null
          timestamped_lyrics?: never
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      batch_increment_counter: {
        Args: { amounts: number[]; field_name: string; track_ids: string[] }
        Returns: undefined
      }
      check_generation_limit: { Args: { _user_id: string }; Returns: boolean }
      cleanup_old_classification_jobs: { Args: never; Returns: number }
      decrement_production_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      decrement_test_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      get_analytics_archive_statistics: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "archive_statistics"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_analytics_generations_daily: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "analytics_generations_daily"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_analytics_top_genres: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "analytics_top_genres"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_analytics_user_stats: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "user_stats"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_project_details: {
        Args: { project_user_id?: string }
        Returns: {
          actual_completed_count: number
          actual_total_duration: number
          actual_track_count: number
          ai_generation_params: Json
          completed_tracks: number
          cover_url: string
          created_at: string
          created_with_ai: boolean
          description: string
          genre: string
          genres: string[]
          id: string
          is_public: boolean
          last_activity_at: string
          mood: string
          moods: string[]
          name: string
          project_type: string
          style_tags: string[]
          total_duration: number
          total_tracks: number
          updated_at: string
          user_id: string
        }[]
      }
      get_project_stats: {
        Args: { p_project_id: string }
        Returns: {
          completed: number
          failed: number
          processing: number
          total: number
          total_duration: number
        }[]
      }
      get_track_ai_context: { Args: { _track_id: string }; Returns: Json }
      get_tracks_needing_archiving: {
        Args: { _limit?: number }
        Returns: {
          audio_url: string
          cover_url: string
          created_at: string
          days_until_expiry: number
          title: string
          track_id: string
          user_id: string
          video_url: string
        }[]
      }
      get_user_mureka_stats: {
        Args: { user_uuid: string }
        Returns: {
          total_likes: number
          total_plays: number
          total_tracks: number
        }[]
      }
      has_role:
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      increment_download_count: {
        Args: { track_id: string }
        Returns: undefined
      }
      increment_generation_usage: {
        Args: { _user_id: string }
        Returns: undefined
      }
      increment_play_count: { Args: { track_id: string }; Returns: undefined }
      increment_view_count: { Args: { track_id: string }; Returns: undefined }
      is_version_liked: {
        Args: { p_user_id: string; p_version_id: string }
        Returns: boolean
      }
      mark_track_archived: {
        Args: {
          _storage_audio_url: string
          _storage_cover_url?: string
          _storage_video_url?: string
          _track_id: string
        }
        Returns: undefined
      }
      refresh_analytics_views: { Args: never; Returns: undefined }
      reset_daily_generation_limits: { Args: never; Returns: undefined }
      update_track_video_metadata: {
        Args: {
          p_track_id: string
          p_video_error?: string
          p_video_status?: string
          p_video_task_id?: string
          p_video_url?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      lyrics_job_status: "pending" | "processing" | "completed" | "failed"
      project_type:
        | "single"
        | "ep"
        | "album"
        | "soundtrack"
        | "instrumental"
        | "custom"
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
      project_type: [
        "single",
        "ep",
        "album",
        "soundtrack",
        "instrumental",
        "custom",
      ],
    },
  },
} as const
