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
      activities: {
        Row: {
          category: string
          city: string | null
          cost: number
          country: string | null
          created_at: string | null
          created_by: string | null
          current_participants: number | null
          date: string
          description: string | null
          description_ca: string | null
          description_de: string | null
          description_en: string | null
          description_es: string | null
          description_fr: string | null
          description_it: string | null
          id: string
          image_url: string | null
          latitude: number | null
          location: string
          longitude: number | null
          max_participants: number | null
          province: string | null
          secondary_images: string[] | null
          time: string
          title: string
          title_ca: string | null
          title_de: string | null
          title_en: string | null
          title_es: string | null
          title_fr: string | null
          title_it: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          city?: string | null
          cost?: number
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          current_participants?: number | null
          date: string
          description?: string | null
          description_ca?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          max_participants?: number | null
          province?: string | null
          secondary_images?: string[] | null
          time?: string
          title: string
          title_ca?: string | null
          title_de?: string | null
          title_en?: string | null
          title_es?: string | null
          title_fr?: string | null
          title_it?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          city?: string | null
          cost?: number
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          current_participants?: number | null
          date?: string
          description?: string | null
          description_ca?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          max_participants?: number | null
          province?: string | null
          secondary_images?: string[] | null
          time?: string
          title?: string
          title_ca?: string | null
          title_de?: string | null
          title_en?: string | null
          title_es?: string | null
          title_fr?: string | null
          title_it?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      activity_messages: {
        Row: {
          activity_id: string
          attachment_url: string | null
          content: string
          content_type: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          attachment_url?: string | null
          content: string
          content_type?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          attachment_url?: string | null
          content?: string
          content_type?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_messages_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_participants: {
        Row: {
          activity_id: string | null
          id: string
          joined_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_ratings: {
        Row: {
          activity_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_ratings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_alert_emails: {
        Row: {
          created_at: string
          email: string
          enabled: boolean
          id: string
          name: string | null
          receives_critical_only: boolean
          receives_tts_alerts: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          enabled?: boolean
          id?: string
          name?: string | null
          receives_critical_only?: boolean
          receives_tts_alerts?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          enabled?: boolean
          id?: string
          name?: string | null
          receives_critical_only?: boolean
          receives_tts_alerts?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          unread_count_a: number | null
          unread_count_b: number | null
          user_a: string | null
          user_b: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          unread_count_a?: number | null
          unread_count_b?: number | null
          user_a?: string | null
          user_b?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          unread_count_a?: number | null
          unread_count_b?: number | null
          user_a?: string | null
          user_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_content: string
          id: string
          name: string
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          name: string
          subject: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string | null
          friend_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banners: {
        Row: {
          created_at: string
          created_by: string | null
          cta_link: string | null
          cta_text_ca: string | null
          cta_text_de: string | null
          cta_text_en: string | null
          cta_text_es: string | null
          cta_text_fr: string | null
          cta_text_it: string | null
          description_ca: string | null
          description_de: string | null
          description_en: string | null
          description_es: string
          description_fr: string | null
          description_it: string | null
          id: string
          image_url: string
          image_url_mobile: string | null
          is_active: boolean | null
          order_index: number | null
          slider_id: string | null
          title_ca: string | null
          title_de: string | null
          title_en: string | null
          title_es: string
          title_fr: string | null
          title_it: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cta_link?: string | null
          cta_text_ca?: string | null
          cta_text_de?: string | null
          cta_text_en?: string | null
          cta_text_es?: string | null
          cta_text_fr?: string | null
          cta_text_it?: string | null
          description_ca?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es: string
          description_fr?: string | null
          description_it?: string | null
          id?: string
          image_url: string
          image_url_mobile?: string | null
          is_active?: boolean | null
          order_index?: number | null
          slider_id?: string | null
          title_ca?: string | null
          title_de?: string | null
          title_en?: string | null
          title_es: string
          title_fr?: string | null
          title_it?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cta_link?: string | null
          cta_text_ca?: string | null
          cta_text_de?: string | null
          cta_text_en?: string | null
          cta_text_es?: string | null
          cta_text_fr?: string | null
          cta_text_it?: string | null
          description_ca?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string
          description_fr?: string | null
          description_it?: string | null
          id?: string
          image_url?: string
          image_url_mobile?: string | null
          is_active?: boolean | null
          order_index?: number | null
          slider_id?: string | null
          title_ca?: string | null
          title_de?: string | null
          title_en?: string | null
          title_es?: string
          title_fr?: string | null
          title_it?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_banners_slider_id_fkey"
            columns: ["slider_id"]
            isOneToOne: false
            referencedRelation: "sliders"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          ai_generated: boolean | null
          attachment_url: string | null
          audio_url: string | null
          content: string | null
          content_type: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          read_at: string | null
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          attachment_url?: string | null
          audio_url?: string | null
          content?: string | null
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          attachment_url?: string | null
          audio_url?: string | null
          content?: string | null
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          cron_interval_minutes: number
          enabled: boolean
          hours_before: number[]
          id: string
          updated_at: string | null
        }
        Insert: {
          cron_interval_minutes?: number
          enabled?: boolean
          hours_before?: number[]
          id?: string
          updated_at?: string | null
        }
        Update: {
          cron_interval_minutes?: number
          enabled?: boolean
          hours_before?: number[]
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          activity_id: string | null
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          created_at: string | null
          followers_count: number | null
          following_count: number | null
          friends_count: number | null
          full_name: string | null
          gallery_images: Json | null
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          profile_visibility: string | null
          updated_at: string | null
          username: string | null
          voice_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          friends_count?: number | null
          full_name?: string | null
          gallery_images?: Json | null
          id: string
          is_online?: boolean | null
          last_seen_at?: string | null
          profile_visibility?: string | null
          updated_at?: string | null
          username?: string | null
          voice_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          friends_count?: number | null
          full_name?: string | null
          gallery_images?: Json | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          profile_visibility?: string | null
          updated_at?: string | null
          username?: string | null
          voice_status?: string | null
        }
        Relationships: []
      }
      recent_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json | null
          user_id_text: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json | null
          user_id_text?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json | null
          user_id_text?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      sliders: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          page_path: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          page_path?: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          page_path?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_flags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          flag_key: string
          flag_value: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          flag_key: string
          flag_value: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          flag_key?: string
          flag_value?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tts_alert_thresholds: {
        Row: {
          alert_severity: string | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          last_triggered_at: string | null
          metric_name: string
          notification_channels: string[] | null
          threshold_value: number
          time_window_minutes: number
          trigger_count: number | null
          updated_at: string | null
        }
        Insert: {
          alert_severity?: string | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          metric_name: string
          notification_channels?: string[] | null
          threshold_value: number
          time_window_minutes: number
          trigger_count?: number | null
          updated_at?: string | null
        }
        Update: {
          alert_severity?: string | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          metric_name?: string
          notification_channels?: string[] | null
          threshold_value?: number
          time_window_minutes?: number
          trigger_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tts_alerts_log: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_users_count: number | null
          alert_message: string
          alert_severity: string
          created_at: string | null
          id: string
          metric_name: string
          metric_value: number
          notification_sent_at: string | null
          notified_channels: string[] | null
          threshold_id: string | null
          threshold_value: number
          time_window_end: string
          time_window_start: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_users_count?: number | null
          alert_message: string
          alert_severity: string
          created_at?: string | null
          id?: string
          metric_name: string
          metric_value: number
          notification_sent_at?: string | null
          notified_channels?: string[] | null
          threshold_id?: string | null
          threshold_value: number
          time_window_end: string
          time_window_start: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_users_count?: number | null
          alert_message?: string
          alert_severity?: string
          created_at?: string | null
          id?: string
          metric_name?: string
          metric_value?: number
          notification_sent_at?: string | null
          notified_channels?: string[] | null
          threshold_id?: string | null
          threshold_value?: number
          time_window_end?: string
          time_window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "tts_alerts_log_threshold_id_fkey"
            columns: ["threshold_id"]
            isOneToOne: false
            referencedRelation: "tts_alert_thresholds"
            referencedColumns: ["id"]
          },
        ]
      }
      tts_cache: {
        Row: {
          audio_url: string
          bitrate: number | null
          content_type: string
          created_at: string
          expires_at: string
          id: string
          text: string
          text_hash: string
          voice_name: string
        }
        Insert: {
          audio_url: string
          bitrate?: number | null
          content_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          text: string
          text_hash: string
          voice_name: string
        }
        Update: {
          audio_url?: string
          bitrate?: number | null
          content_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          text?: string
          text_hash?: string
          voice_name?: string
        }
        Relationships: []
      }
      tts_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tts_monitoring_logs: {
        Row: {
          actual_cost: number | null
          audio_duration_seconds: number | null
          cache_hit_saved_cost: number | null
          cached: boolean | null
          created_at: string | null
          error_message: string | null
          estimated_cost: number | null
          generation_time_ms: number | null
          id: string
          mode: string | null
          provider: string
          request_id: string
          request_metadata: Json | null
          session_id: string | null
          status: string | null
          text_input: string
          text_length: number
          user_id: string | null
          voice_name: string | null
        }
        Insert: {
          actual_cost?: number | null
          audio_duration_seconds?: number | null
          cache_hit_saved_cost?: number | null
          cached?: boolean | null
          created_at?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          generation_time_ms?: number | null
          id?: string
          mode?: string | null
          provider: string
          request_id: string
          request_metadata?: Json | null
          session_id?: string | null
          status?: string | null
          text_input: string
          text_length: number
          user_id?: string | null
          voice_name?: string | null
        }
        Update: {
          actual_cost?: number | null
          audio_duration_seconds?: number | null
          cache_hit_saved_cost?: number | null
          cached?: boolean | null
          created_at?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          generation_time_ms?: number | null
          id?: string
          mode?: string | null
          provider?: string
          request_id?: string
          request_metadata?: Json | null
          session_id?: string | null
          status?: string | null
          text_input?: string
          text_length?: number
          user_id?: string | null
          voice_name?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string | null
          id: string
          interest_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interests_user_id_fkey"
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
      user_tts_usage: {
        Row: {
          created_at: string
          day_window_start: string
          id: string
          last_request_at: string
          minute_window_start: string
          requests_last_day: number
          requests_last_minute: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_window_start?: string
          id?: string
          last_request_at?: string
          minute_window_start?: string
          requests_last_day?: number
          requests_last_minute?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_window_start?: string
          id?: string
          last_request_at?: string
          minute_window_start?: string
          requests_last_day?: number
          requests_last_minute?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_response_metrics: {
        Row: {
          cache_hit: boolean | null
          clarity_score: number | null
          created_at: string | null
          feedback_comment: string | null
          feedback_submitted_at: string | null
          generation_time_ms: number | null
          id: string
          intent: string
          language: string
          response_length: number
          response_text: string
          satisfaction_score: number | null
          session_id: string
          tts_provider: string | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean | null
          clarity_score?: number | null
          created_at?: string | null
          feedback_comment?: string | null
          feedback_submitted_at?: string | null
          generation_time_ms?: number | null
          id?: string
          intent: string
          language: string
          response_length: number
          response_text: string
          satisfaction_score?: number | null
          session_id: string
          tts_provider?: string | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean | null
          clarity_score?: number | null
          created_at?: string | null
          feedback_comment?: string | null
          feedback_submitted_at?: string | null
          generation_time_ms?: number | null
          id?: string
          intent?: string
          language?: string
          response_length?: number
          response_text?: string
          satisfaction_score?: number | null
          session_id?: string
          tts_provider?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      tts_monitoring_stats: {
        Row: {
          avg_audio_duration_seconds: number | null
          avg_cost_per_request: number | null
          avg_generation_time_ms: number | null
          avg_text_length: number | null
          brief_mode_count: number | null
          cache_hit_rate: number | null
          cache_hits: number | null
          error_count: number | null
          error_rate: number | null
          full_mode_count: number | null
          provider: string | null
          time_bucket: string | null
          total_actual_cost: number | null
          total_cache_savings: number | null
          total_estimated_cost: number | null
          total_requests: number | null
          unique_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      voice_quality_stats: {
        Row: {
          avg_clarity_score: number | null
          avg_generation_time_ms: number | null
          avg_response_length: number | null
          avg_satisfaction_score: number | null
          cache_hits: number | null
          date: string | null
          feedback_count: number | null
          intent: string | null
          language: string | null
          total_responses: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_tts_alert_thresholds: {
        Args: never
        Returns: {
          alert_message: string
          exceeded: boolean
          metric_name: string
          metric_value: number
          threshold_id: string
          threshold_value: number
        }[]
      }
      check_user_tts_throttle: {
        Args: {
          _max_per_day?: number
          _max_per_minute?: number
          _user_id: string
        }
        Returns: {
          allowed: boolean
          current_day: number
          current_minute: number
          reason: string
        }[]
      }
      cleanup_expired_tts_cache: { Args: never; Returns: undefined }
      cleanup_old_recent_events: { Args: never; Returns: undefined }
      decrement_counter: {
        Args: { column_name: string; row_id: string; table_name: string }
        Returns: undefined
      }
      get_tts_monitoring_stats: {
        Args: never
        Returns: {
          avg_audio_duration_seconds: number | null
          avg_cost_per_request: number | null
          avg_generation_time_ms: number | null
          avg_text_length: number | null
          brief_mode_count: number | null
          cache_hit_rate: number | null
          cache_hits: number | null
          error_count: number | null
          error_rate: number | null
          full_mode_count: number | null
          provider: string | null
          time_bucket: string | null
          total_actual_cost: number | null
          total_cache_savings: number | null
          total_estimated_cost: number | null
          total_requests: number | null
          unique_sessions: number | null
          unique_users: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tts_monitoring_stats"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_voice_quality_stats: {
        Args: never
        Returns: {
          avg_clarity_score: number | null
          avg_generation_time_ms: number | null
          avg_response_length: number | null
          avg_satisfaction_score: number | null
          cache_hits: number | null
          date: string | null
          feedback_count: number | null
          intent: string | null
          language: string | null
          total_responses: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "voice_quality_stats"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_counter: {
        Args: { column_name: string; row_id: string; table_name: string }
        Returns: undefined
      }
      is_activity_participant: {
        Args: { p_activity_id: string; p_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      refresh_tts_monitoring_stats: { Args: never; Returns: undefined }
      refresh_voice_quality_stats: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
