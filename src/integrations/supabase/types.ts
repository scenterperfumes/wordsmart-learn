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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount_bdt: number
          base_months: number
          bonus_months: number
          created_at: string
          email: string | null
          id: string
          plan_months: number
          sender_phone: string
          status: string
          total_months: number
          trx_id: string
          user_id: string
          wallet: string
        }
        Insert: {
          amount_bdt: number
          base_months?: number
          bonus_months?: number
          created_at?: string
          email?: string | null
          id?: string
          plan_months: number
          sender_phone: string
          status?: string
          total_months?: number
          trx_id: string
          user_id: string
          wallet: string
        }
        Update: {
          amount_bdt?: number
          base_months?: number
          bonus_months?: number
          created_at?: string
          email?: string | null
          id?: string
          plan_months?: number
          sender_phone?: string
          status?: string
          total_months?: number
          trx_id?: string
          user_id?: string
          wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          custom_daily_target: number | null
          daily_log: Json
          device_1_id: string | null
          device_1_name: string | null
          device_2_id: string | null
          device_2_name: string | null
          earned_bonus_month: boolean
          email: string | null
          id: string
          last_device_reset_at: string | null
          last_master_id: number
          mastered_words: Json
          preferences: Json
          security_answer_hash: string | null
          security_question: string | null
          study_seconds: number
          subscription_expires_at: string | null
          subscription_status: string
          target_exam_date: string
          trial_quiz_score: number | null
          word_history: Json
        }
        Insert: {
          created_at?: string
          custom_daily_target?: number | null
          daily_log?: Json
          device_1_id?: string | null
          device_1_name?: string | null
          device_2_id?: string | null
          device_2_name?: string | null
          earned_bonus_month?: boolean
          email?: string | null
          id: string
          last_device_reset_at?: string | null
          last_master_id?: number
          mastered_words?: Json
          preferences?: Json
          security_answer_hash?: string | null
          security_question?: string | null
          study_seconds?: number
          subscription_expires_at?: string | null
          subscription_status?: string
          target_exam_date?: string
          trial_quiz_score?: number | null
          word_history?: Json
        }
        Update: {
          created_at?: string
          custom_daily_target?: number | null
          daily_log?: Json
          device_1_id?: string | null
          device_1_name?: string | null
          device_2_id?: string | null
          device_2_name?: string | null
          earned_bonus_month?: boolean
          email?: string | null
          id?: string
          last_device_reset_at?: string | null
          last_master_id?: number
          mastered_words?: Json
          preferences?: Json
          security_answer_hash?: string | null
          security_question?: string | null
          study_seconds?: number
          subscription_expires_at?: string | null
          subscription_status?: string
          target_exam_date?: string
          trial_quiz_score?: number | null
          word_history?: Json
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          completed: boolean
          deadline: string
          id: string
          trial: boolean
          user_id: string
          word_ids: number[]
        }
        Insert: {
          completed?: boolean
          deadline: string
          id?: string
          trial: boolean
          user_id: string
          word_ids: number[]
        }
        Update: {
          completed?: boolean
          deadline?: string
          id?: string
          trial?: boolean
          user_id?: string
          word_ids?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_reset_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
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
      words_vault: {
        Row: {
          ant: string | null
          is_free_trial: boolean
          master_id: number
          meaning_bn: string | null
          meaning_en: string | null
          pos: string | null
          sentence: string | null
          syn: string | null
          word: string
        }
        Insert: {
          ant?: string | null
          is_free_trial?: boolean
          master_id: number
          meaning_bn?: string | null
          meaning_en?: string | null
          pos?: string | null
          sentence?: string | null
          syn?: string | null
          word: string
        }
        Update: {
          ant?: string | null
          is_free_trial?: boolean
          master_id?: number
          meaning_bn?: string | null
          meaning_en?: string | null
          pos?: string | null
          sentence?: string | null
          syn?: string | null
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_clear_devices: { Args: { _user: string }; Returns: undefined }
      admin_extend: {
        Args: { _months: number; _user: string }
        Returns: undefined
      }
      admin_review_payment: {
        Args: { _approve: boolean; _id: string }
        Returns: undefined
      }
      admin_set_access: {
        Args: { _active: boolean; _user: string }
        Returns: undefined
      }
      admin_set_wallet: { Args: { _number: string }; Returns: undefined }
      admin_upsert_words: {
        Args: { _mark_free: boolean; _words: Json }
        Returns: number
      }
      claim_device: {
        Args: { _device_id: string; _device_name: string }
        Returns: Json
      }
      ensure_owner_access: { Args: never; Returns: undefined }
      finish_timed_quiz: {
        Args: { _answers: Json; _progress: Json; _session: string }
        Returns: Json
      }
      get_security_question: { Args: { _email: string }; Returns: string }
      has_active_pass: { Args: { _uid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_my_devices: { Args: never; Returns: boolean }
      reset_password_with_answer: {
        Args: { _answer: string; _email: string; _new_password: string }
        Returns: boolean
      }
      set_security_answer: {
        Args: { _answer: string; _question: string }
        Returns: undefined
      }
      start_timed_quiz: {
        Args: { _ids: number[]; _trial: boolean }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
