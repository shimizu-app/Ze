export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
        }
        Relationships: []
      }
      avatars: {
        Row: {
          account_id: string
          character_notes: string | null
          created_at: string | null
          goal: string | null
          heygen_avatar_id: string
          id: string
          language: string | null
          name: string
          pain_focus: string[] | null
          product_ids: string[] | null
          role: string
          strength_order: string[] | null
          system_prompt: string | null
          trigger_condition: string | null
          voice_tone: string | null
        }
        Insert: {
          account_id: string
          character_notes?: string | null
          created_at?: string | null
          goal?: string | null
          heygen_avatar_id: string
          id?: string
          language?: string | null
          name: string
          pain_focus?: string[] | null
          product_ids?: string[] | null
          role: string
          strength_order?: string[] | null
          system_prompt?: string | null
          trigger_condition?: string | null
          voice_tone?: string | null
        }
        Update: {
          account_id?: string
          character_notes?: string | null
          created_at?: string | null
          goal?: string | null
          heygen_avatar_id?: string
          id?: string
          language?: string | null
          name?: string
          pain_focus?: string[] | null
          product_ids?: string[] | null
          role?: string
          strength_order?: string[] | null
          system_prompt?: string | null
          trigger_condition?: string | null
          voice_tone?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          account_id: string | null
          cause_analysis: string | null
          company_name: string | null
          created_at: string | null
          id: string
          meeting_id: string | null
          outcome: string | null
          summary: string | null
          tags: string[] | null
          transcript: Json | null
          turns: number | null
        }
        Insert: {
          account_id?: string | null
          cause_analysis?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          outcome?: string | null
          summary?: string | null
          tags?: string[] | null
          transcript?: Json | null
          turns?: number | null
        }
        Update: {
          account_id?: string | null
          cause_analysis?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          outcome?: string | null
          summary?: string | null
          tags?: string[] | null
          transcript?: Json | null
          turns?: number | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          account_id: string
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          product_id: string | null
        }
        Insert: {
          account_id: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
        }
        Update: {
          account_id?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          account_id: string
          avatar_id: string | null
          company_name: string
          contact_name: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          note: string | null
          product_id: string | null
          room_id: string
          scheduled_at: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          account_id: string
          avatar_id?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          note?: string | null
          product_id?: string | null
          room_id: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          account_id?: string
          avatar_id?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          note?: string | null
          product_id?: string | null
          room_id?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          account_id: string
          category: string | null
          created_at: string | null
          embedding: string | null
          free_text: string | null
          id: string
          name: string
          ng_words: string | null
          pains: string[] | null
          price: string | null
          strengths: string | null
        }
        Insert: {
          account_id: string
          category?: string | null
          created_at?: string | null
          embedding?: string | null
          free_text?: string | null
          id?: string
          name: string
          ng_words?: string | null
          pains?: string[] | null
          price?: string | null
          strengths?: string | null
        }
        Update: {
          account_id?: string
          category?: string | null
          created_at?: string | null
          embedding?: string | null
          free_text?: string | null
          id?: string
          name?: string
          ng_words?: string | null
          pains?: string[] | null
          price?: string | null
          strengths?: string | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      current_account_id: { Args: Record<string, unknown>; Returns: string }
      match_documents: {
        Args: {
          filter_account_id: string
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          product_id: string
          similarity: number
        }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
