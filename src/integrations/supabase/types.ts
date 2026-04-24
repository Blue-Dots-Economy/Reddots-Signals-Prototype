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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      centre_dots: {
        Row: {
          address: string | null
          area: string
          availability: string | null
          called_by: string | null
          contact: string
          created_at: string
          description: string | null
          distance: string | null
          email: string | null
          fees: string | null
          hiring_manager_name: string | null
          icon: string
          id: string
          internship: string | null
          job_role_salary: string | null
          last_role_held: string | null
          lat: number
          lng: number
          min_qualification: string | null
          name: string
          nature_of_job: string | null
          openings: string | null
          rating: string | null
          relevance: string | null
          remarks: string | null
          requirement_of_portal: string | null
          services: string | null
          type_of_candidate: string | null
          unique_id: string | null
          updated_at: string
          work_experience_years: string | null
        }
        Insert: {
          address?: string | null
          area: string
          availability?: string | null
          called_by?: string | null
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          email?: string | null
          fees?: string | null
          hiring_manager_name?: string | null
          icon?: string
          id?: string
          internship?: string | null
          job_role_salary?: string | null
          last_role_held?: string | null
          lat: number
          lng: number
          min_qualification?: string | null
          name: string
          nature_of_job?: string | null
          openings?: string | null
          rating?: string | null
          relevance?: string | null
          remarks?: string | null
          requirement_of_portal?: string | null
          services?: string | null
          type_of_candidate?: string | null
          unique_id?: string | null
          updated_at?: string
          work_experience_years?: string | null
        }
        Update: {
          address?: string | null
          area?: string
          availability?: string | null
          called_by?: string | null
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          email?: string | null
          fees?: string | null
          hiring_manager_name?: string | null
          icon?: string
          id?: string
          internship?: string | null
          job_role_salary?: string | null
          last_role_held?: string | null
          lat?: number
          lng?: number
          min_qualification?: string | null
          name?: string
          nature_of_job?: string | null
          openings?: string | null
          rating?: string | null
          relevance?: string | null
          remarks?: string | null
          requirement_of_portal?: string | null
          services?: string | null
          type_of_candidate?: string | null
          unique_id?: string | null
          updated_at?: string
          work_experience_years?: string | null
        }
        Relationships: []
      }
      college_dots: {
        Row: {
          address: string | null
          area: string
          availability: string | null
          contact: string
          created_at: string
          description: string | null
          distance: string | null
          email: string | null
          fees: string | null
          icon: string
          id: string
          lat: number
          lng: number
          name: string
          programs: string | null
          rating: string | null
          relevance: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area: string
          availability?: string | null
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          email?: string | null
          fees?: string | null
          icon?: string
          id?: string
          lat: number
          lng: number
          name: string
          programs?: string | null
          rating?: string | null
          relevance?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string
          availability?: string | null
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          email?: string | null
          fees?: string | null
          icon?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          programs?: string | null
          rating?: string | null
          relevance?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string
          from_dot_id: string | null
          from_persona: string
          from_user_id: string
          id: string
          status: string
          to_dot_id: string | null
          to_persona: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_dot_id?: string | null
          from_persona: string
          from_user_id: string
          id?: string
          status?: string
          to_dot_id?: string | null
          to_persona: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_dot_id?: string | null
          from_persona?: string
          from_user_id?: string
          id?: string
          status?: string
          to_dot_id?: string | null
          to_persona?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_views: {
        Row: {
          id: string
          outreach_id: string
          outreach_table: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          outreach_id: string
          outreach_table?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          outreach_id?: string
          outreach_table?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      counsellor_dots: {
        Row: {
          area: string
          availability: string | null
          contact: string
          created_at: string
          description: string | null
          distance: string | null
          email: string | null
          experience: string | null
          icon: string
          id: string
          languages: string | null
          lat: number
          lng: number
          mode: string | null
          name: string
          price_range: string | null
          qualification: string | null
          rating: string | null
          relevance: string | null
          speciality: string
          updated_at: string
        }
        Insert: {
          area: string
          availability?: string | null
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          email?: string | null
          experience?: string | null
          icon?: string
          id?: string
          languages?: string | null
          lat: number
          lng: number
          mode?: string | null
          name: string
          price_range?: string | null
          qualification?: string | null
          rating?: string | null
          relevance?: string | null
          speciality?: string
          updated_at?: string
        }
        Update: {
          area?: string
          availability?: string | null
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          email?: string | null
          experience?: string | null
          icon?: string
          id?: string
          languages?: string | null
          lat?: number
          lng?: number
          mode?: string | null
          name?: string
          price_range?: string | null
          qualification?: string | null
          rating?: string | null
          relevance?: string | null
          speciality?: string
          updated_at?: string
        }
        Relationships: []
      }
      filter_usage_logs: {
        Row: {
          created_at: string
          filter_type: string
          filter_value: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_type: string
          filter_value: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_type?: string
          filter_value?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      lahi_connections: {
        Row: {
          created_at: string
          from_dot_id: string
          from_name: string | null
          from_persona: string
          from_phone: string
          id: string
          is_minor: boolean | null
          status: string
          to_dot_id: string
          to_name: string | null
          to_persona: string
          to_phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_dot_id: string
          from_name?: string | null
          from_persona: string
          from_phone: string
          id?: string
          is_minor?: boolean | null
          status?: string
          to_dot_id: string
          to_name?: string | null
          to_persona: string
          to_phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_dot_id?: string
          from_name?: string | null
          from_persona?: string
          from_phone?: string
          id?: string
          is_minor?: boolean | null
          status?: string
          to_dot_id?: string
          to_name?: string | null
          to_persona?: string
          to_phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      outreach: {
        Row: {
          created_at: string
          dot_id: string
          id: string
          notes: string | null
          requester_email: string | null
          requester_name: string | null
          status: Database["public"]["Enums"]["outreach_status"]
          student_area: string
          student_category: string
          student_grade: string | null
          student_icon: string | null
          student_name: string
          student_needs: string | null
          target_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dot_id: string
          id?: string
          notes?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["outreach_status"]
          student_area: string
          student_category: string
          student_grade?: string | null
          student_icon?: string | null
          student_name: string
          student_needs?: string | null
          target_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dot_id?: string
          id?: string
          notes?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["outreach_status"]
          student_area?: string
          student_category?: string
          student_grade?: string | null
          student_icon?: string | null
          student_name?: string
          student_needs?: string | null
          target_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sheet_configs: {
        Row: {
          created_at: string
          dot_type: string
          id: string
          last_synced_at: string | null
          sheet_id: string
          sheet_url: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dot_type?: string
          id?: string
          last_synced_at?: string | null
          sheet_id: string
          sheet_url: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dot_type?: string
          id?: string
          last_synced_at?: string | null
          sheet_id?: string
          sheet_url?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_dots: {
        Row: {
          age: string | null
          area: string
          availability: string | null
          category: string
          contact: string
          created_at: string
          description: string | null
          distance: string | null
          education: string | null
          email: string | null
          gender: string | null
          grade: string | null
          highest_qualification: string | null
          icon: string
          id: string
          jobs_interested_nature: string | null
          jobs_interested_role: string | null
          last_role: string | null
          lat: number
          lng: number
          mobile_device: string | null
          name: string
          needs: string | null
          other_help: string | null
          pillar: string
          relevance: string | null
          school_iti: string | null
          skills: string | null
          unique_id: string | null
          updated_at: string
          work_experience: string | null
        }
        Insert: {
          age?: string | null
          area: string
          availability?: string | null
          category?: string
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          education?: string | null
          email?: string | null
          gender?: string | null
          grade?: string | null
          highest_qualification?: string | null
          icon?: string
          id?: string
          jobs_interested_nature?: string | null
          jobs_interested_role?: string | null
          last_role?: string | null
          lat: number
          lng: number
          mobile_device?: string | null
          name: string
          needs?: string | null
          other_help?: string | null
          pillar?: string
          relevance?: string | null
          school_iti?: string | null
          skills?: string | null
          unique_id?: string | null
          updated_at?: string
          work_experience?: string | null
        }
        Update: {
          age?: string | null
          area?: string
          availability?: string | null
          category?: string
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          education?: string | null
          email?: string | null
          gender?: string | null
          grade?: string | null
          highest_qualification?: string | null
          icon?: string
          id?: string
          jobs_interested_nature?: string | null
          jobs_interested_role?: string | null
          last_role?: string | null
          lat?: number
          lng?: number
          mobile_device?: string | null
          name?: string
          needs?: string | null
          other_help?: string | null
          pillar?: string
          relevance?: string | null
          school_iti?: string | null
          skills?: string | null
          unique_id?: string | null
          updated_at?: string
          work_experience?: string | null
        }
        Relationships: []
      }
      student_filter_usage_logs: {
        Row: {
          created_at: string
          filter_type: string
          filter_value: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_type: string
          filter_value: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_type?: string
          filter_value?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_dots: {
        Row: {
          area: string
          availability: string | null
          contact: string
          created_at: string
          description: string | null
          distance: string | null
          email: string | null
          experience: string | null
          grade: string | null
          icon: string
          id: string
          languages: string | null
          lat: number
          lng: number
          name: string
          price_range: string | null
          qualification: string | null
          rating: string | null
          relevance: string | null
          stream: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          area: string
          availability?: string | null
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          email?: string | null
          experience?: string | null
          grade?: string | null
          icon?: string
          id?: string
          languages?: string | null
          lat: number
          lng: number
          name: string
          price_range?: string | null
          qualification?: string | null
          rating?: string | null
          relevance?: string | null
          stream?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          area?: string
          availability?: string | null
          contact?: string
          created_at?: string
          description?: string | null
          distance?: string | null
          email?: string | null
          experience?: string | null
          grade?: string | null
          icon?: string
          id?: string
          languages?: string | null
          lat?: number
          lng?: number
          name?: string
          price_range?: string | null
          qualification?: string | null
          rating?: string | null
          relevance?: string | null
          stream?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_outreach: {
        Row: {
          created_at: string
          dot_id: string
          id: string
          notes: string | null
          requester_email: string | null
          requester_name: string | null
          status: Database["public"]["Enums"]["outreach_status"]
          target_user_id: string | null
          tutor_area: string
          tutor_experience: string | null
          tutor_icon: string | null
          tutor_name: string
          tutor_price: string | null
          tutor_subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dot_id: string
          id?: string
          notes?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["outreach_status"]
          target_user_id?: string | null
          tutor_area: string
          tutor_experience?: string | null
          tutor_icon?: string | null
          tutor_name: string
          tutor_price?: string | null
          tutor_subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dot_id?: string
          id?: string
          notes?: string | null
          requester_email?: string | null
          requester_name?: string | null
          status?: Database["public"]["Enums"]["outreach_status"]
          target_user_id?: string | null
          tutor_area?: string
          tutor_experience?: string | null
          tutor_icon?: string | null
          tutor_name?: string
          tutor_price?: string | null
          tutor_subject?: string
          updated_at?: string
          user_id?: string
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
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      outreach_status:
        | "invited"
        | "responded"
        | "session_booked"
        | "completed"
        | "pending"
        | "rejected"
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
      app_role: ["admin", "user"],
      outreach_status: [
        "invited",
        "responded",
        "session_booked",
        "completed",
        "pending",
        "rejected",
      ],
    },
  },
} as const
