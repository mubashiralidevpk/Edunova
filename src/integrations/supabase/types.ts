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
      achievements: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      admission_applicants: {
        Row: {
          address: string | null
          admitted_at: string | null
          admitted_student_id: string | null
          assigned_class_id: string | null
          b_form_number: string
          bform_document_url: string | null
          blood_group: string | null
          created_at: string
          created_by: string
          custom_fields: Json
          date_of_birth: string
          desired_class_level: number
          elective_group: string | null
          emergency_contact: string | null
          father_monthly_income: number | null
          father_occupation: string | null
          form_version_id: string | null
          full_name: string
          gender: string | null
          guardian_mobile: string | null
          guardian_name: string | null
          guardian_nic: string | null
          guardian_relationship: string | null
          id: string
          institution_program_id: string | null
          interview_notes: string | null
          interview_scheduled_at: string | null
          interview_score: number | null
          interview_status: string
          interview_venue: string | null
          nationality: string | null
          notes: string | null
          parent_email: string | null
          parent_father_mobile: string | null
          parent_father_name: string | null
          parent_father_nic: string | null
          parent_mother_mobile: string | null
          parent_mother_name: string | null
          parent_mother_nic: string | null
          photo_document_url: string | null
          place_of_birth: string | null
          previous_school: string | null
          religion: string | null
          school_id: string
          status: string
          status_note: string | null
          status_updated_at: string
          test_completed_at: string | null
          test_obtained_marks: number | null
          test_total_marks: number | null
          transfer_certificate_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admitted_at?: string | null
          admitted_student_id?: string | null
          assigned_class_id?: string | null
          b_form_number: string
          bform_document_url?: string | null
          blood_group?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json
          date_of_birth: string
          desired_class_level: number
          elective_group?: string | null
          emergency_contact?: string | null
          father_monthly_income?: number | null
          father_occupation?: string | null
          form_version_id?: string | null
          full_name: string
          gender?: string | null
          guardian_mobile?: string | null
          guardian_name?: string | null
          guardian_nic?: string | null
          guardian_relationship?: string | null
          id?: string
          institution_program_id?: string | null
          interview_notes?: string | null
          interview_scheduled_at?: string | null
          interview_score?: number | null
          interview_status?: string
          interview_venue?: string | null
          nationality?: string | null
          notes?: string | null
          parent_email?: string | null
          parent_father_mobile?: string | null
          parent_father_name?: string | null
          parent_father_nic?: string | null
          parent_mother_mobile?: string | null
          parent_mother_name?: string | null
          parent_mother_nic?: string | null
          photo_document_url?: string | null
          place_of_birth?: string | null
          previous_school?: string | null
          religion?: string | null
          school_id: string
          status?: string
          status_note?: string | null
          status_updated_at?: string
          test_completed_at?: string | null
          test_obtained_marks?: number | null
          test_total_marks?: number | null
          transfer_certificate_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admitted_at?: string | null
          admitted_student_id?: string | null
          assigned_class_id?: string | null
          b_form_number?: string
          bform_document_url?: string | null
          blood_group?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json
          date_of_birth?: string
          desired_class_level?: number
          elective_group?: string | null
          emergency_contact?: string | null
          father_monthly_income?: number | null
          father_occupation?: string | null
          form_version_id?: string | null
          full_name?: string
          gender?: string | null
          guardian_mobile?: string | null
          guardian_name?: string | null
          guardian_nic?: string | null
          guardian_relationship?: string | null
          id?: string
          institution_program_id?: string | null
          interview_notes?: string | null
          interview_scheduled_at?: string | null
          interview_score?: number | null
          interview_status?: string
          interview_venue?: string | null
          nationality?: string | null
          notes?: string | null
          parent_email?: string | null
          parent_father_mobile?: string | null
          parent_father_name?: string | null
          parent_father_nic?: string | null
          parent_mother_mobile?: string | null
          parent_mother_name?: string | null
          parent_mother_nic?: string | null
          photo_document_url?: string | null
          place_of_birth?: string | null
          previous_school?: string | null
          religion?: string | null
          school_id?: string
          status?: string
          status_note?: string | null
          status_updated_at?: string
          test_completed_at?: string | null
          test_obtained_marks?: number | null
          test_total_marks?: number | null
          transfer_certificate_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_applicants_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "admission_form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applicants_institution_program_id_fkey"
            columns: ["institution_program_id"]
            isOneToOne: false
            referencedRelation: "institution_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_boards: {
        Row: {
          code: string
          country_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          short_name: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          short_name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_boards_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "admission_countries"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_countries: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      admission_form_fields: {
        Row: {
          created_at: string
          created_by: string | null
          field_key: string
          field_type: string
          help_text: string | null
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          options: Json
          school_id: string
          sort_order: number
          updated_at: string
          version_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          field_key: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          options?: Json
          school_id: string
          sort_order?: number
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          field_key?: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          options?: Json
          school_id?: string
          sort_order?: number
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_form_fields_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_form_fields_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "admission_form_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_form_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          institution_program_id: string | null
          is_active: boolean
          name: string
          published_at: string | null
          school_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          institution_program_id?: string | null
          is_active?: boolean
          name: string
          published_at?: string | null
          school_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          institution_program_id?: string | null
          is_active?: boolean
          name?: string
          published_at?: string | null
          school_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "admission_form_versions_institution_program_id_fkey"
            columns: ["institution_program_id"]
            isOneToOne: false
            referencedRelation: "institution_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_form_versions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_messages: {
        Row: {
          applicant_id: string
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          applicant_id: string
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_type: string
          sender_user_id?: string | null
        }
        Update: {
          applicant_id?: string
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_messages_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "admission_applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_program_combinations: {
        Row: {
          code: string | null
          created_at: string
          id: string
          institution_program_id: string
          is_active: boolean
          name: string
          school_id: string
          seats: number | null
          sort_order: number
          subjects: string[]
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          institution_program_id: string
          is_active?: boolean
          name: string
          school_id: string
          seats?: number | null
          sort_order?: number
          subjects?: string[]
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          institution_program_id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          seats?: number | null
          sort_order?: number
          subjects?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_program_combinations_institution_program_id_fkey"
            columns: ["institution_program_id"]
            isOneToOne: false
            referencedRelation: "institution_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_program_combinations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_programs: {
        Row: {
          board_id: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          school_id: string | null
          sort_order: number
          stage: string
          updated_at: string
        }
        Insert: {
          board_id: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          school_id?: string | null
          sort_order?: number
          stage?: string
          updated_at?: string
        }
        Update: {
          board_id?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string | null
          sort_order?: number
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_programs_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "admission_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_programs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_ranking_weights: {
        Row: {
          id: string
          updated_at: string
          w_admission_success: number
          w_attendance: number
          w_pass_rate: number
          w_scale: number
        }
        Insert: {
          id?: string
          updated_at?: string
          w_admission_success?: number
          w_attendance?: number
          w_pass_rate?: number
          w_scale?: number
        }
        Update: {
          id?: string
          updated_at?: string
          w_admission_success?: number
          w_attendance?: number
          w_pass_rate?: number
          w_scale?: number
        }
        Relationships: []
      }
      admission_requirements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          institution_program_id: string
          is_active: boolean
          is_default: boolean
          is_required: boolean
          kind: string
          label: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          institution_program_id: string
          is_active?: boolean
          is_default?: boolean
          is_required?: boolean
          kind?: string
          label: string
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          institution_program_id?: string
          is_active?: boolean
          is_default?: boolean
          is_required?: boolean
          kind?: string
          label?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_requirements_institution_program_id_fkey"
            columns: ["institution_program_id"]
            isOneToOne: false
            referencedRelation: "institution_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_requirements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_status_events: {
        Row: {
          actor_id: string | null
          applicant_id: string
          created_at: string
          id: string
          note: string | null
          school_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          applicant_id: string
          created_at?: string
          id?: string
          note?: string | null
          school_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          applicant_id?: string
          created_at?: string
          id?: string
          note?: string | null
          school_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_status_events_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "admission_applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_test_schedules: {
        Row: {
          applicant_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          test_date: string
          test_time: string
          venue: string | null
        }
        Insert: {
          applicant_id: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          test_date: string
          test_time: string
          venue?: string | null
        }
        Update: {
          applicant_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          test_date?: string
          test_time?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_test_schedules_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "admission_applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          assistant_type: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant_type: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant_type?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_logs: {
        Row: {
          alert_type: string
          created_at: string
          delivery_status: string
          id: string
          message: string
          recipient_id: string | null
          recipient_info: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          school_id: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          delivery_status?: string
          id?: string
          message: string
          recipient_id?: string | null
          recipient_info?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          school_id?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          delivery_status?: string
          id?: string
          message?: string
          recipient_id?: string | null
          recipient_info?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          school_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          class_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_categories: {
        Row: {
          class_id: string
          created_at: string
          id: string
          name: string
          weight: number
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          name: string
          weight?: number
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assignment_categories_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assignment_type: string
          category_id: string | null
          class_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_published: boolean
          max_score: number
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignment_type?: string
          category_id?: string | null
          class_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean
          max_score?: number
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignment_type?: string
          category_id?: string | null
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean
          max_score?: number
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "assignment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string | null
          period: number | null
          reason: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          period?: number | null
          reason?: string | null
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          period?: number | null
          reason?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_patterns: {
        Row: {
          created_at: string
          frequency: number
          id: string
          last_detected: string
          metadata: Json | null
          pattern_type: string
          student_id: string
        }
        Insert: {
          created_at?: string
          frequency?: number
          id?: string
          last_detected?: string
          metadata?: Json | null
          pattern_type: string
          student_id: string
        }
        Update: {
          created_at?: string
          frequency?: number
          id?: string
          last_detected?: string
          metadata?: Json | null
          pattern_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_patterns_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_impacts: {
        Row: {
          admin_remarks: string | null
          approved_at: string | null
          approved_by: string | null
          class_id: string
          created_at: string
          date: string
          id: string
          period: number
          school_id: string | null
          status: string
          subject: string | null
          substitute_teacher_id: string | null
          teacher_id: string
          time_slot: string | null
          updated_at: string
        }
        Insert: {
          admin_remarks?: string | null
          approved_at?: string | null
          approved_by?: string | null
          class_id: string
          created_at?: string
          date?: string
          id?: string
          period: number
          school_id?: string | null
          status?: string
          subject?: string | null
          substitute_teacher_id?: string | null
          teacher_id: string
          time_slot?: string | null
          updated_at?: string
        }
        Update: {
          admin_remarks?: string | null
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          period?: number
          school_id?: string | null
          status?: string
          subject?: string | null
          substitute_teacher_id?: string | null
          teacher_id?: string
          time_slot?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_impacts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_notes: {
        Row: {
          class_id: string
          content: string
          created_at: string
          id: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          content: string
          created_at?: string
          id?: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string
          id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_teachers: {
        Row: {
          class_id: string
          created_at: string
          id: string
          invitation_status: string
          invitation_token: string | null
          invited_by: string | null
          is_class_admin: boolean
          role: Database["public"]["Enums"]["class_teacher_role"]
          role_description: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          invitation_status?: string
          invitation_token?: string | null
          invited_by?: string | null
          is_class_admin?: boolean
          role?: Database["public"]["Enums"]["class_teacher_role"]
          role_description?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          invitation_status?: string
          invitation_token?: string | null
          invited_by?: string | null
          is_class_admin?: boolean
          role?: Database["public"]["Enums"]["class_teacher_role"]
          role_description?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_name: string | null
          created_at: string
          id: string
          level: number
          max_students_per_section: number
          school_id: string | null
          section: string
          subject: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_name?: string | null
          created_at?: string
          id?: string
          level: number
          max_students_per_section?: number
          school_id?: string | null
          section: string
          subject: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_name?: string | null
          created_at?: string
          id?: string
          level?: number
          max_students_per_section?: number
          school_id?: string | null
          section?: string
          subject?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      course_lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          lesson_order: number
          lesson_type: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lesson_order: number
          lesson_type?: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lesson_order?: number
          lesson_type?: string
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          difficulty_level: number
          id: string
          is_published: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: number
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: number
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_check_audit: {
        Row: {
          action: string
          actor_id: string | null
          check_id: string
          created_at: string
          details: Json
          id: string
          question_id: string | null
          school_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          check_id: string
          created_at?: string
          details?: Json
          id?: string
          question_id?: string | null
          school_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          check_id?: string
          created_at?: string
          details?: Json
          id?: string
          question_id?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_check_audit_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "exam_paper_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_check_audit_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_check_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_check_questions: {
        Row: {
          ai_confidence: number | null
          ai_rationale: string | null
          ai_steps: Json
          ai_suggested_marks: number | null
          check_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string
          id: string
          is_flagged: boolean
          max_marks: number
          needs_review: boolean
          order_index: number
          question_no: string
          question_text: string | null
          question_type: string
          school_id: string
          student_answer: string | null
          teacher_comment: string | null
          teacher_marks: number | null
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_rationale?: string | null
          ai_steps?: Json
          ai_suggested_marks?: number | null
          check_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          id?: string
          is_flagged?: boolean
          max_marks?: number
          needs_review?: boolean
          order_index?: number
          question_no: string
          question_text?: string | null
          question_type?: string
          school_id: string
          student_answer?: string | null
          teacher_comment?: string | null
          teacher_marks?: number | null
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_rationale?: string | null
          ai_steps?: Json
          ai_suggested_marks?: number | null
          check_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          id?: string
          is_flagged?: boolean
          max_marks?: number
          needs_review?: boolean
          order_index?: number
          question_no?: string
          question_text?: string | null
          question_type?: string
          school_id?: string
          student_answer?: string | null
          teacher_comment?: string | null
          teacher_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_check_questions_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "exam_paper_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_datesheet_entries: {
        Row: {
          created_at: string
          datesheet_id: string
          end_time: string | null
          exam_date: string | null
          id: string
          is_off_day: boolean
          room: string | null
          sort_order: number
          start_time: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          datesheet_id: string
          end_time?: string | null
          exam_date?: string | null
          id?: string
          is_off_day?: boolean
          room?: string | null
          sort_order?: number
          start_time?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          datesheet_id?: string
          end_time?: string | null
          exam_date?: string | null
          id?: string
          is_off_day?: boolean
          room?: string | null
          sort_order?: number
          start_time?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_datesheet_entries_datesheet_id_fkey"
            columns: ["datesheet_id"]
            isOneToOne: false
            referencedRelation: "exam_datesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_datesheets: {
        Row: {
          class_level: number
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          school_id: string
          term_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          class_level: number
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          school_id: string
          term_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          class_level?: number
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          school_id?: string
          term_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_datesheets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_datesheets_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "exam_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_paper_checks: {
        Row: {
          agreement: number | null
          ai_summary: string | null
          answer_image_urls: Json
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          class_id: string | null
          confidence: number | null
          created_at: string
          created_by: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          identified_roll_number: string | null
          identified_student_name: string | null
          identity_confidence: number | null
          identity_confirmed: boolean
          is_flagged: boolean
          layers: Json
          mode: string
          needs_review: boolean
          obtained_marks: number | null
          per_question: Json
          published_at: string | null
          question_paper_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: string
          student_id: string
          subject: string
          teacher_note: string | null
          teacher_submitted_at: string | null
          term_id: string
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          agreement?: number | null
          ai_summary?: string | null
          answer_image_urls?: Json
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          class_id?: string | null
          confidence?: number | null
          created_at?: string
          created_by: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          identified_roll_number?: string | null
          identified_student_name?: string | null
          identity_confidence?: number | null
          identity_confirmed?: boolean
          is_flagged?: boolean
          layers?: Json
          mode?: string
          needs_review?: boolean
          obtained_marks?: number | null
          per_question?: Json
          published_at?: string | null
          question_paper_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: string
          student_id: string
          subject: string
          teacher_note?: string | null
          teacher_submitted_at?: string | null
          term_id: string
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          agreement?: number | null
          ai_summary?: string | null
          answer_image_urls?: Json
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          class_id?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          identified_roll_number?: string | null
          identified_student_name?: string | null
          identity_confidence?: number | null
          identity_confirmed?: boolean
          is_flagged?: boolean
          layers?: Json
          mode?: string
          needs_review?: boolean
          obtained_marks?: number | null
          per_question?: Json
          published_at?: string | null
          question_paper_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: string
          student_id?: string
          subject?: string
          teacher_note?: string | null
          teacher_submitted_at?: string | null
          term_id?: string
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_paper_checks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_paper_checks_question_paper_id_fkey"
            columns: ["question_paper_id"]
            isOneToOne: false
            referencedRelation: "exam_question_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_paper_checks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_paper_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_paper_checks_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "exam_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_question_papers: {
        Row: {
          answer_key: string | null
          class_level: number
          created_at: string
          created_by: string
          extracted_text: string | null
          id: string
          image_urls: Json
          school_id: string
          subject: string
          term_id: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          answer_key?: string | null
          class_level: number
          created_at?: string
          created_by: string
          extracted_text?: string | null
          id?: string
          image_urls?: Json
          school_id: string
          subject: string
          term_id: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          answer_key?: string | null
          class_level?: number
          created_at?: string
          created_by?: string
          extracted_text?: string | null
          id?: string
          image_urls?: Json
          school_id?: string
          subject?: string
          term_id?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_question_papers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_question_papers_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "exam_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_terms: {
        Row: {
          academic_year: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          is_closed: boolean
          name: string
          pass_percentage: number
          school_id: string | null
          start_date: string
          term_type: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          is_closed?: boolean
          name: string
          pass_percentage?: number
          school_id?: string | null
          start_date: string
          term_type?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          is_closed?: boolean
          name?: string
          pass_percentage?: number
          school_id?: string | null
          start_date?: string
          term_type?: string
        }
        Relationships: []
      }
      fee_invoices: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          created_by: string
          description: string
          due_date: string
          fee_structure_id: string | null
          id: string
          invoice_number: string
          period_label: string | null
          school_id: string
          status: string
          student_id: string
          updated_at: string
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          created_by: string
          description: string
          due_date: string
          fee_structure_id?: string | null
          id?: string
          invoice_number: string
          period_label?: string | null
          school_id: string
          status?: string
          student_id: string
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          fee_structure_id?: string | null
          id?: string
          invoice_number?: string
          period_label?: string | null
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Relationships: []
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          paid_on: string
          payment_method: string
          receipt_number: string
          recorded_by: string
          reference_number: string | null
          school_id: string
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          receipt_number: string
          recorded_by: string
          reference_number?: string | null
          school_id: string
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          receipt_number?: string
          recorded_by?: string
          reference_number?: string | null
          school_id?: string
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Relationships: []
      }
      fee_structures: {
        Row: {
          amount: number
          class_level: number | null
          created_at: string
          created_by: string
          fee_type: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          class_level?: number | null
          created_at?: string
          created_by: string
          fee_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          class_level?: number | null
          created_at?: string
          created_by?: string
          fee_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      grade_predictions: {
        Row: {
          class_id: string
          confidence: number
          factors: Json | null
          id: string
          predicted_at: string
          predicted_grade: string
          student_id: string
        }
        Insert: {
          class_id: string
          confidence: number
          factors?: Json | null
          id?: string
          predicted_at?: string
          predicted_grade: string
          student_id: string
        }
        Update: {
          class_id?: string
          confidence?: number
          factors?: Json | null
          id?: string
          predicted_at?: string
          predicted_grade?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_predictions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_predictions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          allow_resubmission: boolean
          assigned_date: string
          attachments: Json
          class_id: string
          concept: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          due_time: string | null
          id: string
          instructions: string | null
          max_marks: number | null
          priority: string
          school_id: string
          section: string | null
          status: string
          subject: string
          target_student_ids: string[] | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          allow_resubmission?: boolean
          assigned_date?: string
          attachments?: Json
          class_id: string
          concept?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date: string
          due_time?: string | null
          id?: string
          instructions?: string | null
          max_marks?: number | null
          priority?: string
          school_id: string
          section?: string | null
          status?: string
          subject: string
          target_student_ids?: string[] | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          allow_resubmission?: boolean
          assigned_date?: string
          attachments?: Json
          class_id?: string
          concept?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          instructions?: string | null
          max_marks?: number | null
          priority?: string
          school_id?: string
          section?: string | null
          status?: string
          subject?: string
          target_student_ids?: string[] | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          homework_id: string
          id: string
          school_id: string
          student_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          homework_id: string
          id?: string
          school_id: string
          student_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          homework_id?: string
          id?: string
          school_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_events_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_exceptions: {
        Row: {
          created_at: string
          created_by: string
          extended_due_date: string | null
          extended_due_time: string | null
          homework_id: string
          id: string
          kind: string
          note: string | null
          reason: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          extended_due_date?: string | null
          extended_due_time?: string | null
          homework_id: string
          id?: string
          kind: string
          note?: string | null
          reason?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          extended_due_date?: string | null
          extended_due_time?: string | null
          homework_id?: string
          id?: string
          kind?: string
          note?: string | null
          reason?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_exceptions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_exceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          files: Json
          homework_id: string
          id: string
          is_late: boolean
          marks: number | null
          private_note: string | null
          school_id: string
          status: string
          student_id: string
          submitted_at: string
          teacher_remark: string | null
          text_response: string | null
          updated_at: string
          version: number
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          files?: Json
          homework_id: string
          id?: string
          is_late?: boolean
          marks?: number | null
          private_note?: string | null
          school_id: string
          status?: string
          student_id: string
          submitted_at?: string
          teacher_remark?: string | null
          text_response?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          files?: Json
          homework_id?: string
          id?: string
          is_late?: boolean
          marks?: number | null
          private_note?: string | null
          school_id?: string
          status?: string
          student_id?: string
          submitted_at?: string
          teacher_remark?: string | null
          text_response?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_programs: {
        Row: {
          admission_status: string
          board_id: string
          closes_on: string | null
          country_id: string
          created_at: string
          created_by: string | null
          eligibility: string | null
          fee_amount: number | null
          fee_note: string | null
          id: string
          is_active: boolean
          merit_note: string | null
          opens_on: string | null
          program_id: string
          public_visible: boolean
          require_interview: boolean
          require_test: boolean
          require_verification: boolean
          school_id: string
          seats: number | null
          updated_at: string
        }
        Insert: {
          admission_status?: string
          board_id: string
          closes_on?: string | null
          country_id: string
          created_at?: string
          created_by?: string | null
          eligibility?: string | null
          fee_amount?: number | null
          fee_note?: string | null
          id?: string
          is_active?: boolean
          merit_note?: string | null
          opens_on?: string | null
          program_id: string
          public_visible?: boolean
          require_interview?: boolean
          require_test?: boolean
          require_verification?: boolean
          school_id: string
          seats?: number | null
          updated_at?: string
        }
        Update: {
          admission_status?: string
          board_id?: string
          closes_on?: string | null
          country_id?: string
          created_at?: string
          created_by?: string | null
          eligibility?: string | null
          fee_amount?: number | null
          fee_note?: string | null
          id?: string
          is_active?: boolean
          merit_note?: string | null
          opens_on?: string | null
          program_id?: string
          public_visible?: boolean
          require_interview?: boolean
          require_test?: boolean
          require_verification?: boolean
          school_id?: string
          seats?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_programs_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "admission_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_programs_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "admission_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "admission_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_programs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_concepts: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          prerequisite_ids: string[] | null
          school_id: string
          subject: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          prerequisite_ids?: string[] | null
          school_id: string
          subject?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          prerequisite_ids?: string[] | null
          school_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexus_concepts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_interactions: {
        Row: {
          class_id: string | null
          cognitive_load: number | null
          concept_id: string | null
          created_at: string
          duration_seconds: number | null
          engagement_depth: number | null
          flow_state: boolean | null
          id: string
          school_id: string
          social_energy: number | null
          student_id: string
        }
        Insert: {
          class_id?: string | null
          cognitive_load?: number | null
          concept_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          engagement_depth?: number | null
          flow_state?: boolean | null
          id?: string
          school_id: string
          social_energy?: number | null
          student_id: string
        }
        Update: {
          class_id?: string | null
          cognitive_load?: number | null
          concept_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          engagement_depth?: number | null
          flow_state?: boolean | null
          id?: string
          school_id?: string
          social_energy?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_interactions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexus_interactions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "nexus_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexus_interactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_mood_logs: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          intensity: number
          mood: string
          note: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          intensity: number
          mood: string
          note?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          intensity?: number
          mood?: string
          note?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_mood_class_fk"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexus_mood_student_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_teacher_feedback: {
        Row: {
          clarity: number | null
          class_id: string | null
          created_at: string
          empathy: number | null
          id: string
          innovation: number | null
          school_id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          clarity?: number | null
          class_id?: string | null
          created_at?: string
          empathy?: number | null
          id?: string
          innovation?: number | null
          school_id: string
          student_id: string
          teacher_id: string
        }
        Update: {
          clarity?: number | null
          class_id?: string | null
          created_at?: string
          empathy?: number | null
          id?: string
          innovation?: number | null
          school_id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_teacher_feedback_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexus_teacher_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          parent_id: string
          read_at: string | null
          sent_at: string
          student_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          parent_id: string
          read_at?: string | null
          sent_at?: string
          student_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          parent_id?: string
          read_at?: string | null
          sent_at?: string
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_notifications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_otp_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used?: boolean
        }
        Relationships: []
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          parent_id: string
          relationship: string
          student_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id: string
          relationship?: string
          student_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id?: string
          relationship?: string
          student_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_otp_login_at: string | null
          phone: string | null
          phone_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          last_otp_login_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_otp_login_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_records: {
        Row: {
          bonuses: number
          created_at: string
          created_by: string
          deductions: number
          gross_salary: number
          id: string
          net_salary: number
          notes: string | null
          paid_on: string | null
          period_month: number
          period_year: number
          school_id: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          bonuses?: number
          created_at?: string
          created_by: string
          deductions?: number
          gross_salary: number
          id?: string
          net_salary: number
          notes?: string | null
          paid_on?: string | null
          period_month: number
          period_year: number
          school_id: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          bonuses?: number
          created_at?: string
          created_by?: string
          deductions?: number
          gross_salary?: number
          id?: string
          net_salary?: number
          notes?: string | null
          paid_on?: string | null
          period_month?: number
          period_year?: number
          school_id?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          school_id: string | null
          staff_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          school_id?: string | null
          staff_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          school_id?: string | null
          staff_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_runs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          school_id: string
          term_id: string
          total_evaluated: number
          total_promoted: number
          total_retained: number
          triggered_by: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          school_id: string
          term_id: string
          total_evaluated?: number
          total_promoted?: number
          total_retained?: number
          triggered_by: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          school_id?: string
          term_id?: string
          total_evaluated?: number
          total_promoted?: number
          total_retained?: number
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_runs_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "exam_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          subject: string | null
          template_text: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          subject?: string | null
          template_text: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          subject?: string | null
          template_text?: string
        }
        Relationships: []
      }
      result_uploads: {
        Row: {
          class_id: string
          created_at: string
          error_message: string | null
          exam_term_id: string | null
          id: string
          image_url: string
          ocr_raw_text: string | null
          ocr_status: string
          parsed_results: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          subject: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          error_message?: string | null
          exam_term_id?: string | null
          id?: string
          image_url: string
          ocr_raw_text?: string | null
          ocr_status?: string
          parsed_results?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          subject?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          error_message?: string | null
          exam_term_id?: string | null
          id?: string
          image_url?: string
          ocr_raw_text?: string | null
          ocr_status?: string
          parsed_results?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          subject?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_settings: {
        Row: {
          admission_auto_pass: boolean
          admission_class_levels: number[]
          admission_instructions: string | null
          admission_passing_marks: number
          admission_require_interview: boolean
          admission_require_test: boolean
          admission_test_total_marks: number
          board_id: string | null
          checkin_deadline: string | null
          country_id: string | null
          created_at: string
          exam_checking_mode: string
          geofence_radius_meters: number | null
          id: string
          latitude: number | null
          longitude: number | null
          public_results_enabled: boolean
          qr_expires_at: string | null
          qr_generated_at: string | null
          qr_token: string | null
          qr_validity_minutes: number
          school_id: string | null
          school_name: string
          updated_at: string
        }
        Insert: {
          admission_auto_pass?: boolean
          admission_class_levels?: number[]
          admission_instructions?: string | null
          admission_passing_marks?: number
          admission_require_interview?: boolean
          admission_require_test?: boolean
          admission_test_total_marks?: number
          board_id?: string | null
          checkin_deadline?: string | null
          country_id?: string | null
          created_at?: string
          exam_checking_mode?: string
          geofence_radius_meters?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          public_results_enabled?: boolean
          qr_expires_at?: string | null
          qr_generated_at?: string | null
          qr_token?: string | null
          qr_validity_minutes?: number
          school_id?: string | null
          school_name?: string
          updated_at?: string
        }
        Update: {
          admission_auto_pass?: boolean
          admission_class_levels?: number[]
          admission_instructions?: string | null
          admission_passing_marks?: number
          admission_require_interview?: boolean
          admission_require_test?: boolean
          admission_test_total_marks?: number
          board_id?: string | null
          checkin_deadline?: string | null
          country_id?: string | null
          created_at?: string
          exam_checking_mode?: string
          geofence_radius_meters?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          public_results_enabled?: boolean
          qr_expires_at?: string | null
          qr_generated_at?: string | null
          qr_token?: string | null
          qr_validity_minutes?: number
          school_id?: string | null
          school_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_settings_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "admission_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_settings_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "admission_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_admin_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_admin_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_admin_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_role_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          school_id: string
          staff_role: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          school_id: string
          staff_role: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          school_id?: string
          staff_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          student_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          student_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_activity: {
        Row: {
          activity_type: string
          class_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          student_id: string
        }
        Insert: {
          activity_type: string
          class_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          student_id: string
        }
        Update: {
          activity_type?: string
          class_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activity_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_class_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          class_id: string
          id: string
          role: Database["public"]["Enums"]["student_role"]
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          class_id: string
          id?: string
          role: Database["public"]["Enums"]["student_role"]
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          class_id?: string
          id?: string
          role?: Database["public"]["Enums"]["student_role"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_class_roles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_roles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_course_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          current_lesson_id: string | null
          id: string
          progress_percentage: number
          started_at: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          current_lesson_id?: string | null
          id?: string
          progress_percentage?: number
          started_at?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          current_lesson_id?: string | null
          id?: string
          progress_percentage?: number
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_course_progress_current_lesson_id_fkey"
            columns: ["current_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_course_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exam_results: {
        Row: {
          class_id: string
          created_at: string
          grade: string | null
          id: string
          is_published: boolean | null
          obtained_marks: number
          remarks: string | null
          student_id: string
          subject: string
          teacher_id: string
          term_name: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          grade?: string | null
          id?: string
          is_published?: boolean | null
          obtained_marks?: number
          remarks?: string | null
          student_id: string
          subject: string
          teacher_id: string
          term_name: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          grade?: string | null
          id?: string
          is_published?: boolean | null
          obtained_marks?: number
          remarks?: string | null
          student_id?: string
          subject?: string
          teacher_id?: string
          term_name?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_exam_results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_grades: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          similarity_score: number | null
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          similarity_score?: number | null
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          similarity_score?: number | null
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          is_completed: boolean
          lesson_id: string
          score: number | null
          started_at: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean
          lesson_id: string
          score?: number | null
          started_at?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean
          lesson_id?: string
          score?: number | null
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_results: {
        Row: {
          class_id: string
          created_at: string
          grade: string | null
          id: string
          is_published: boolean
          obtained_marks: number
          percentage: number
          published_at: string | null
          rank: number | null
          student_id: string
          teacher_comments: string | null
          term_id: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          grade?: string | null
          id?: string
          is_published?: boolean
          obtained_marks?: number
          percentage?: number
          published_at?: string | null
          rank?: number | null
          student_id: string
          teacher_comments?: string | null
          term_id: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          grade?: string | null
          id?: string
          is_published?: boolean
          obtained_marks?: number
          percentage?: number
          published_at?: string | null
          rank?: number | null
          student_id?: string
          teacher_comments?: string | null
          term_id?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_results_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "exam_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_sessions: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          student_id: string
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          student_id: string
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_xp: {
        Row: {
          current_level: number
          id: string
          last_activity_date: string | null
          streak_days: number
          student_id: string
          total_xp: number
          updated_at: string
          xp_to_next_level: number
        }
        Insert: {
          current_level?: number
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          student_id: string
          total_xp?: number
          updated_at?: string
          xp_to_next_level?: number
        }
        Update: {
          current_level?: number
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          student_id?: string
          total_xp?: number
          updated_at?: string
          xp_to_next_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_xp_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_applicant_id: string | null
          b_form_number: string | null
          bform_document_url: string | null
          blood_group: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          date_of_birth: string | null
          elective_group: string | null
          emergency_contact: string | null
          father_monthly_income: number | null
          father_occupation: string | null
          full_name: string
          gender: string | null
          guardian_mobile: string | null
          guardian_name: string | null
          guardian_nic: string | null
          guardian_relationship: string | null
          id: string
          login_email: string | null
          nationality: string | null
          parent_email: string | null
          parent_father_name: string | null
          parent_father_nic: string | null
          parent_mobile: string | null
          parent_mother_mobile: string | null
          parent_mother_name: string | null
          parent_mother_nic: string | null
          password_text: string | null
          photo_document_url: string | null
          place_of_birth: string | null
          previous_school: string | null
          religion: string | null
          roll_number: string
          school_id: string | null
          student_id: string
          transfer_certificate_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_applicant_id?: string | null
          b_form_number?: string | null
          bform_document_url?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          date_of_birth?: string | null
          elective_group?: string | null
          emergency_contact?: string | null
          father_monthly_income?: number | null
          father_occupation?: string | null
          full_name: string
          gender?: string | null
          guardian_mobile?: string | null
          guardian_name?: string | null
          guardian_nic?: string | null
          guardian_relationship?: string | null
          id?: string
          login_email?: string | null
          nationality?: string | null
          parent_email?: string | null
          parent_father_name?: string | null
          parent_father_nic?: string | null
          parent_mobile?: string | null
          parent_mother_mobile?: string | null
          parent_mother_name?: string | null
          parent_mother_nic?: string | null
          password_text?: string | null
          photo_document_url?: string | null
          place_of_birth?: string | null
          previous_school?: string | null
          religion?: string | null
          roll_number: string
          school_id?: string | null
          student_id: string
          transfer_certificate_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_applicant_id?: string | null
          b_form_number?: string | null
          bform_document_url?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          date_of_birth?: string | null
          elective_group?: string | null
          emergency_contact?: string | null
          father_monthly_income?: number | null
          father_occupation?: string | null
          full_name?: string
          gender?: string | null
          guardian_mobile?: string | null
          guardian_name?: string | null
          guardian_nic?: string | null
          guardian_relationship?: string | null
          id?: string
          login_email?: string | null
          nationality?: string | null
          parent_email?: string | null
          parent_father_name?: string | null
          parent_father_nic?: string | null
          parent_mobile?: string | null
          parent_mother_mobile?: string | null
          parent_mother_name?: string | null
          parent_mother_nic?: string | null
          password_text?: string | null
          photo_document_url?: string | null
          place_of_birth?: string | null
          previous_school?: string | null
          religion?: string | null
          roll_number?: string
          school_id?: string | null
          student_id?: string
          transfer_certificate_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      substitution_assignments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          rating_by_regular: number | null
          rating_by_substitute: number | null
          request_id: string
          substitute_id: string
          volunteered_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rating_by_regular?: number | null
          rating_by_substitute?: number | null
          request_id: string
          substitute_id: string
          volunteered_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rating_by_regular?: number | null
          rating_by_substitute?: number | null
          request_id?: string
          substitute_id?: string
          volunteered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitution_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "substitution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      substitution_requests: {
        Row: {
          absent_teacher_id: string
          auto_generated: boolean
          class_id: string
          created_at: string
          date: string
          id: string
          impact_id: string | null
          period: number
          status: string
          time_slot: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          absent_teacher_id: string
          auto_generated?: boolean
          class_id: string
          created_at?: string
          date?: string
          id?: string
          impact_id?: string | null
          period: number
          status?: string
          time_slot?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          absent_teacher_id?: string
          auto_generated?: boolean
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          impact_id?: string | null
          period?: number
          status?: string
          time_slot?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitution_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          read_at: string | null
          recipient_id: string
          recipient_role: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type?: string
          read_at?: string | null
          recipient_id: string
          recipient_role?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          recipient_role?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
        }
        Relationships: []
      }
      teacher_checkins: {
        Row: {
          admin_remarks: string | null
          arrival_status: string
          checkin_time: string
          checkout_time: string | null
          created_at: string
          date: string
          gps_verified: boolean
          id: string
          is_locked: boolean
          location_coordinates: Json | null
          notes: string | null
          original_status: string | null
          qr_token_used: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          status: string
          teacher_id: string
        }
        Insert: {
          admin_remarks?: string | null
          arrival_status?: string
          checkin_time?: string
          checkout_time?: string | null
          created_at?: string
          date?: string
          gps_verified?: boolean
          id?: string
          is_locked?: boolean
          location_coordinates?: Json | null
          notes?: string | null
          original_status?: string | null
          qr_token_used?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          teacher_id: string
        }
        Update: {
          admin_remarks?: string | null
          arrival_status?: string
          checkin_time?: string
          checkout_time?: string | null
          created_at?: string
          date?: string
          gps_verified?: boolean
          id?: string
          is_locked?: boolean
          location_coordinates?: Json | null
          notes?: string | null
          original_status?: string | null
          qr_token_used?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_checkins_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_invitations: {
        Row: {
          created_at: string
          created_by: string
          email: string
          full_name: string
          id: string
          school_id: string
          status: string
          temp_password: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          full_name: string
          id?: string
          school_id: string
          status?: string
          temp_password: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          full_name?: string
          id?: string
          school_id?: string
          status?: string
          temp_password?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_schedules: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          period: number
          room_number: string | null
          start_time: string
          subject: string | null
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          period: number
          room_number?: string | null
          start_time: string
          subject?: string | null
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          period?: number
          room_number?: string | null
          start_time?: string
          subject?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
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
      voided_records: {
        Row: {
          id: string
          reason: string
          record_id: string
          record_type: string
          school_id: string
          voided_at: string
          voided_by: string
        }
        Insert: {
          id?: string
          reason: string
          record_id: string
          record_type: string
          school_id: string
          voided_at?: string
          voided_by: string
        }
        Update: {
          id?: string
          reason?: string
          record_id?: string
          record_type?: string
          school_id?: string
          voided_at?: string
          voided_by?: string
        }
        Relationships: []
      }
      wall_of_fame: {
        Row: {
          added_by: string
          category: string
          created_at: string
          feature_month: number
          feature_year: number
          id: string
          reason: string
          school_id: string
          student_id: string
        }
        Insert: {
          added_by: string
          category?: string
          created_at?: string
          feature_month: number
          feature_year: number
          id?: string
          reason: string
          school_id: string
          student_id: string
        }
        Update: {
          added_by?: string
          category?: string
          created_at?: string
          feature_month?: number
          feature_year?: number
          id?: string
          reason?: string
          school_id?: string
          student_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admit_applicant: { Args: { _applicant_id: string }; Returns: string }
      applicant_chat_context: {
        Args: { _b_form_number: string; _date_of_birth: string }
        Returns: {
          applicant_id: string
          full_name: string
          school_name: string
          status: string
        }[]
      }
      bulk_insert_students: {
        Args: { _class_id: string; _students: Json }
        Returns: Json
      }
      create_admission_form_version: {
        Args: {
          _copy_from?: string
          _institution_program_id?: string
          _name: string
        }
        Returns: string
      }
      current_student: {
        Args: never
        Returns: {
          class_id: string
          school_id: string
          student_id: string
        }[]
      }
      discover_institutions: {
        Args: { _program_id: string; _year?: number }
        Returns: {
          admission_status: string
          admission_success_rate: number
          admissions_total: number
          applications_per_seat: number
          applications_total: number
          attendance_rate: number
          board_name: string
          closes_on: string
          eligibility: string
          fee_amount: number
          has_data: boolean
          institution_program_id: string
          merit_note: string
          opens_on: string
          pass_rate: number
          program_name: string
          require_interview: boolean
          require_test: boolean
          school_id: string
          school_name: string
          score: number
          seats: number
          students_total: number
        }[]
      }
      ensure_my_account: {
        Args: never
        Returns: {
          account_role: Database["public"]["Enums"]["app_role"]
          account_school_id: string
          account_user_id: string
        }[]
      }
      generate_dummy_students: {
        Args: { _class_id: string; _count?: number }
        Returns: Json
      }
      get_admission_contacts: {
        Args: { _school_id: string }
        Returns: {
          email: string
          full_name: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          staff_role: string
        }[]
      }
      get_admission_process: {
        Args: { _school_id: string }
        Returns: {
          instructions: string
          passing_marks: number
          require_interview: boolean
          require_test: boolean
          test_total_marks: number
        }[]
      }
      get_exam_checking_mode: { Args: { _school_id: string }; Returns: string }
      get_institution_program_public: {
        Args: { _institution_program_id: string }
        Returns: {
          admission_status: string
          board_name: string
          closes_on: string
          country_name: string
          eligibility: string
          fee_amount: number
          fee_note: string
          form_version_id: string
          id: string
          merit_note: string
          opens_on: string
          program_name: string
          require_interview: boolean
          require_test: boolean
          require_verification: boolean
          school_id: string
          school_name: string
          seats: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_school: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      is_admission_manager: { Args: { _user_id: string }; Returns: boolean }
      is_class_admin: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      is_class_member: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      is_exam_manager: { Args: { _user_id: string }; Returns: boolean }
      list_admission_class_levels: {
        Args: { _school_id: string }
        Returns: number[]
      }
      list_admission_form_fields: {
        Args: { _school_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          field_key: string
          field_type: string
          help_text: string | null
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          options: Json
          school_id: string
          sort_order: number
          updated_at: string
          version_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admission_form_fields"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_admission_form_fields_version: {
        Args: { _version_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          field_key: string
          field_type: string
          help_text: string | null
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          options: Json
          school_id: string
          sort_order: number
          updated_at: string
          version_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admission_form_fields"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_admission_messages: {
        Args: { _b_form_number: string; _date_of_birth: string }
        Returns: {
          content: string
          created_at: string
          id: string
          sender_type: string
        }[]
      }
      list_program_combinations_public: {
        Args: { _institution_program_id: string }
        Returns: {
          code: string
          id: string
          name: string
          seats: number
          subjects: string[]
        }[]
      }
      list_program_requirements: {
        Args: { _institution_program_id: string }
        Returns: {
          description: string
          id: string
          is_required: boolean
          kind: string
          label: string
          sort_order: number
        }[]
      }
      list_public_schools: {
        Args: { _q?: string }
        Returns: {
          id: string
          latitude: number
          longitude: number
          name: string
        }[]
      }
      list_result_portal_schools: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      list_school_class_levels: {
        Args: { _school_id: string }
        Returns: number[]
      }
      list_school_programs_public: {
        Args: { _school_id: string }
        Returns: {
          admission_status: string
          board_name: string
          closes_on: string
          eligibility: string
          fee_amount: number
          institution_program_id: string
          opens_on: string
          program_name: string
          seats: number
        }[]
      }
      lookup_admission_history: {
        Args: { _b_form_number: string; _date_of_birth: string }
        Returns: {
          applicant_id: string
          applied_at: string
          desired_class_level: number
          full_name: string
          interview_scheduled_at: string
          interview_status: string
          interview_venue: string
          reference: string
          scheduled_date: string
          scheduled_time: string
          scheduled_venue: string
          school_name: string
          status: string
          status_note: string
          status_updated_at: string
          test_completed_at: string
          test_obtained_marks: number
          test_total_marks: number
        }[]
      }
      lookup_admission_timeline: {
        Args: { _b_form_number: string; _date_of_birth: string }
        Returns: {
          applicant_id: string
          created_at: string
          note: string
          status: string
        }[]
      }
      lookup_student_results: {
        Args: {
          _academic_year?: string
          _date_of_birth: string
          _father_name: string
          _full_name: string
          _level: number
          _school_id: string
          _section: string
        }
        Returns: Json
      }
      post_admission_message: {
        Args: {
          _b_form_number: string
          _content: string
          _date_of_birth: string
        }
        Returns: string
      }
      promote_teacher_to_admin: {
        Args: { _teacher_user_id: string }
        Returns: boolean
      }
      run_promotion: { Args: { _term_id: string }; Returns: Json }
      search_published_results: {
        Args: {
          p_level: number
          p_roll: string
          p_school_id: string
          p_section: string
        }
        Returns: {
          class_level: number
          class_name: string
          class_section: string
          created_at: string
          grade: string
          id: string
          obtained_marks: number
          remarks: string
          roll_number: string
          student_code: string
          student_name: string
          subject: string
          term_name: string
          total_marks: number
        }[]
      }
      seed_default_requirements: {
        Args: { _institution_program_id: string }
        Returns: number
      }
      set_admission_class_levels: {
        Args: { _levels: number[] }
        Returns: number[]
      }
      set_admission_process: {
        Args: {
          _auto_pass: boolean
          _instructions: string
          _passing_marks: number
          _require_interview: boolean
          _require_test: boolean
          _test_total_marks: number
        }
        Returns: undefined
      }
      set_exam_checking_mode: { Args: { _mode: string }; Returns: undefined }
      set_staff_roles: {
        Args: { _roles: string[]; _teacher_user_id: string }
        Returns: undefined
      }
      set_teacher_staff_role: {
        Args: { _staff_role: string; _teacher_user_id: string }
        Returns: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          school_id: string | null
          staff_role: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_admission_application:
        | {
            Args: {
              _b_form_number: string
              _date_of_birth: string
              _desired_class_level: number
              _full_name: string
              _notes: string
              _parent_email: string
              _parent_father_mobile: string
              _parent_father_name: string
              _parent_mother_mobile: string
              _parent_mother_name: string
              _school_id: string
            }
            Returns: string
          }
        | {
            Args: {
              _b_form_number: string
              _custom_fields: Json
              _date_of_birth: string
              _desired_class_level: number
              _full_name: string
              _notes: string
              _parent_email: string
              _parent_father_mobile: string
              _parent_father_name: string
              _parent_mother_mobile: string
              _parent_mother_name: string
              _school_id: string
            }
            Returns: string
          }
      submit_program_application:
        | {
            Args: {
              _b_form_number: string
              _custom_fields?: Json
              _date_of_birth: string
              _desired_class_level: number
              _full_name: string
              _institution_program_id: string
              _notes: string
              _parent_email: string
              _parent_father_mobile: string
              _parent_father_name: string
              _parent_mother_mobile: string
              _parent_mother_name: string
              _school_id: string
            }
            Returns: string
          }
        | {
            Args: {
              _b_form_number: string
              _custom_fields?: Json
              _date_of_birth: string
              _desired_class_level: number
              _extra?: Json
              _full_name: string
              _institution_program_id: string
              _notes: string
              _parent_email: string
              _parent_father_mobile: string
              _parent_father_name: string
              _parent_mother_mobile: string
              _parent_mother_name: string
              _school_id: string
            }
            Returns: string
          }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      class_teacher_role:
        | "class_admin"
        | "subject_lead"
        | "support_teacher"
        | "lab_assistant"
        | "observer"
      student_role: "topper" | "monitor" | "proctor" | "class_representative"
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
      app_role: ["admin", "teacher", "student"],
      class_teacher_role: [
        "class_admin",
        "subject_lead",
        "support_teacher",
        "lab_assistant",
        "observer",
      ],
      student_role: ["topper", "monitor", "proctor", "class_representative"],
    },
  },
} as const
