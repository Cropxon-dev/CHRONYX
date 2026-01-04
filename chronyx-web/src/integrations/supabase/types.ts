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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achieved_at: string
          category: string
          created_at: string | null
          description: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          module: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          module: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_limits: {
        Row: {
          category: string
          created_at: string
          id: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          monthly_limit: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_banks: {
        Row: {
          color: string
          country: string
          created_at: string
          full_name: string
          id: string
          logo_url: string | null
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          logo_url?: string | null
          name: string
          user_id: string
        }
        Update: {
          color?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          logo_url?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string
          document_type: string
          expiry_date: string | null
          file_url: string
          id: string
          is_locked: boolean | null
          issue_date: string | null
          notes: string | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          document_type: string
          expiry_date?: string | null
          file_url: string
          id?: string
          is_locked?: boolean | null
          issue_date?: string | null
          notes?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          document_type?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          is_locked?: boolean | null
          issue_date?: string | null
          notes?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      education_documents: {
        Row: {
          created_at: string
          document_type: string
          education_id: string
          file_url: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          education_id: string
          file_url: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          education_id?: string
          file_url?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_documents_education_id_fkey"
            columns: ["education_id"]
            isOneToOne: false
            referencedRelation: "education_records"
            referencedColumns: ["id"]
          },
        ]
      }
      education_records: {
        Row: {
          course: string | null
          created_at: string
          degree: string
          end_year: number | null
          id: string
          institution: string
          notes: string | null
          start_year: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course?: string | null
          created_at?: string
          degree: string
          end_year?: number | null
          id?: string
          institution: string
          notes?: string | null
          start_year?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course?: string | null
          created_at?: string
          degree?: string
          end_year?: number | null
          id?: string
          institution?: string
          notes?: string | null
          start_year?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emi_events: {
        Row: {
          amount: number
          applied_to_emi_id: string | null
          created_at: string | null
          event_date: string
          event_type: string
          id: string
          interest_saved: number | null
          loan_id: string
          mode: string | null
          new_emi_amount: number | null
          new_tenure_months: number | null
          notes: string | null
          reduction_type: string | null
        }
        Insert: {
          amount: number
          applied_to_emi_id?: string | null
          created_at?: string | null
          event_date: string
          event_type: string
          id?: string
          interest_saved?: number | null
          loan_id: string
          mode?: string | null
          new_emi_amount?: number | null
          new_tenure_months?: number | null
          notes?: string | null
          reduction_type?: string | null
        }
        Update: {
          amount?: number
          applied_to_emi_id?: string | null
          created_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          interest_saved?: number | null
          loan_id?: string
          mode?: string | null
          new_emi_amount?: number | null
          new_tenure_months?: number | null
          notes?: string | null
          reduction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emi_events_applied_to_emi_id_fkey"
            columns: ["applied_to_emi_id"]
            isOneToOne: false
            referencedRelation: "emi_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emi_events_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      emi_reminders: {
        Row: {
          email_sent_to: string
          emi_id: string
          id: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          email_sent_to: string
          emi_id: string
          id?: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          email_sent_to?: string
          emi_id?: string
          id?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emi_reminders_emi_id_fkey"
            columns: ["emi_id"]
            isOneToOne: false
            referencedRelation: "emi_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      emi_schedule: {
        Row: {
          adjustment_event_id: string | null
          created_at: string | null
          emi_amount: number
          emi_date: string
          emi_month: number
          id: string
          interest_component: number
          is_adjusted: boolean | null
          loan_id: string
          paid_date: string | null
          payment_method: string | null
          payment_status: string | null
          principal_component: number
          remaining_principal: number
        }
        Insert: {
          adjustment_event_id?: string | null
          created_at?: string | null
          emi_amount: number
          emi_date: string
          emi_month: number
          id?: string
          interest_component: number
          is_adjusted?: boolean | null
          loan_id: string
          paid_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          principal_component: number
          remaining_principal: number
        }
        Update: {
          adjustment_event_id?: string | null
          created_at?: string | null
          emi_amount?: number
          emi_date?: string
          emi_month?: number
          id?: string
          interest_component?: number
          is_adjusted?: boolean | null
          loan_id?: string
          paid_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          principal_component?: number
          remaining_principal?: number
        }
        Relationships: [
          {
            foreignKeyName: "emi_schedule_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          is_auto_generated: boolean | null
          notes: string | null
          payment_mode: string
          source_id: string | null
          source_type: string | null
          sub_category: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          expense_date?: string
          id?: string
          is_auto_generated?: boolean | null
          notes?: string | null
          payment_mode: string
          source_id?: string | null
          source_type?: string | null
          sub_category?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_auto_generated?: boolean | null
          notes?: string | null
          payment_mode?: string
          source_id?: string | null
          source_type?: string | null
          sub_category?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          notes: string | null
          relation: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          id?: string
          notes?: string | null
          relation: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          relation?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          income_date: string
          income_source_id: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          income_date?: string
          income_source_id?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          income_date?: string
          income_source_id?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_entries_income_source_id_fkey"
            columns: ["income_source_id"]
            isOneToOne: false
            referencedRelation: "income_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      income_sources: {
        Row: {
          category: string
          created_at: string
          frequency: string
          id: string
          is_active: boolean | null
          notes: string | null
          source_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          frequency: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      insurance_claim_documents: {
        Row: {
          claim_id: string
          document_type: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          uploaded_at: string
        }
        Insert: {
          claim_id: string
          document_type?: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          claim_id?: string
          document_type?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          approved_amount: number | null
          claim_date: string
          claim_reference_no: string | null
          claim_type: string
          claimed_amount: number
          created_at: string
          id: string
          insurance_id: string
          insured_member_id: string | null
          notes: string | null
          settled_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          claim_date: string
          claim_reference_no?: string | null
          claim_type: string
          claimed_amount: number
          created_at?: string
          id?: string
          insurance_id: string
          insured_member_id?: string | null
          notes?: string | null
          settled_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          claim_date?: string
          claim_reference_no?: string | null
          claim_type?: string
          claimed_amount?: number
          created_at?: string
          id?: string
          insurance_id?: string
          insured_member_id?: string | null
          notes?: string | null
          settled_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_insurance_id_fkey"
            columns: ["insurance_id"]
            isOneToOne: false
            referencedRelation: "insurances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_insured_member_id_fkey"
            columns: ["insured_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_documents: {
        Row: {
          document_type: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          insurance_id: string
          uploaded_at: string
          year: number | null
        }
        Insert: {
          document_type?: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          insurance_id: string
          uploaded_at?: string
          year?: number | null
        }
        Update: {
          document_type?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          insurance_id?: string
          uploaded_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_documents_insurance_id_fkey"
            columns: ["insurance_id"]
            isOneToOne: false
            referencedRelation: "insurances"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_reminders: {
        Row: {
          email_sent_to: string
          id: string
          insurance_id: string
          reminder_days_before: number
          sent_at: string
        }
        Insert: {
          email_sent_to: string
          id?: string
          insurance_id: string
          reminder_days_before: number
          sent_at?: string
        }
        Update: {
          email_sent_to?: string
          id?: string
          insurance_id?: string
          reminder_days_before?: number
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_reminders_insurance_id_fkey"
            columns: ["insurance_id"]
            isOneToOne: false
            referencedRelation: "insurances"
            referencedColumns: ["id"]
          },
        ]
      }
      insurances: {
        Row: {
          created_at: string
          id: string
          insured_member_id: string | null
          insured_type: string
          notes: string | null
          policy_name: string
          policy_number: string
          policy_type: string
          premium_amount: number
          provider: string
          reminder_days: number[] | null
          renewal_date: string
          start_date: string
          status: string
          sum_assured: number
          updated_at: string
          user_id: string
          vehicle_registration: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insured_member_id?: string | null
          insured_type?: string
          notes?: string | null
          policy_name: string
          policy_number: string
          policy_type: string
          premium_amount: number
          provider: string
          reminder_days?: number[] | null
          renewal_date: string
          start_date: string
          status?: string
          sum_assured: number
          updated_at?: string
          user_id: string
          vehicle_registration?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insured_member_id?: string | null
          insured_type?: string
          notes?: string | null
          policy_name?: string
          policy_number?: string
          policy_type?: string
          premium_amount?: number
          provider?: string
          reminder_days?: number[] | null
          renewal_date?: string
          start_date?: string
          status?: string
          sum_assured?: number
          updated_at?: string
          user_id?: string
          vehicle_registration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurances_insured_member_id_fkey"
            columns: ["insured_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_documents: {
        Row: {
          document_type: string | null
          emi_id: string | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          loan_id: string
          uploaded_at: string | null
        }
        Insert: {
          document_type?: string | null
          emi_id?: string | null
          file_name: string
          file_type: string
          file_url: string
          id?: string
          loan_id: string
          uploaded_at?: string | null
        }
        Update: {
          document_type?: string | null
          emi_id?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          loan_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_documents_emi_id_fkey"
            columns: ["emi_id"]
            isOneToOne: false
            referencedRelation: "emi_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_documents_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          bank_logo_url: string | null
          bank_name: string
          country: string
          created_at: string | null
          emi_amount: number
          id: string
          interest_rate: number
          loan_account_number: string
          loan_type: string
          notes: string | null
          principal_amount: number
          repayment_mode: string | null
          start_date: string
          status: string | null
          tenure_months: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_logo_url?: string | null
          bank_name: string
          country?: string
          created_at?: string | null
          emi_amount: number
          id?: string
          interest_rate: number
          loan_account_number: string
          loan_type: string
          notes?: string | null
          principal_amount: number
          repayment_mode?: string | null
          start_date: string
          status?: string | null
          tenure_months: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_logo_url?: string | null
          bank_name?: string
          country?: string
          created_at?: string | null
          emi_amount?: number
          id?: string
          interest_rate?: number
          loan_account_number?: string
          loan_type?: string
          notes?: string | null
          principal_amount?: number
          repayment_mode?: string | null
          start_date?: string
          status?: string | null
          tenure_months?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          collection_id: string | null
          created_at: string
          created_date: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          folder_id: string | null
          id: string
          is_locked: boolean | null
          media_type: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          created_date?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          folder_id?: string | null
          id?: string
          is_locked?: boolean | null
          media_type: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          created_date?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          folder_id?: string | null
          id?: string
          is_locked?: boolean | null
          media_type?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "memory_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "memory_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_collections: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_collections_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "memory_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_folders: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_locked: boolean | null
          lock_hash: string | null
          name: string
          parent_folder_id: string | null
          sort_order: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_locked?: boolean | null
          lock_hash?: string | null
          name: string
          parent_folder_id?: string | null
          sort_order?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_locked?: boolean | null
          lock_hash?: string | null
          name?: string
          parent_folder_id?: string | null
          sort_order?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "memory_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          plan_type: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          receipt_sent: boolean | null
          receipt_sent_at: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          plan_type: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          receipt_sent?: boolean | null
          receipt_sent_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          plan_type?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          receipt_sent?: boolean | null
          receipt_sent_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          email_verified: boolean | null
          id: string
          phone_number: string | null
          phone_verified: boolean | null
          primary_contact: string | null
          secondary_email: string | null
          secondary_phone: string | null
          target_age: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          id: string
          phone_number?: string | null
          phone_verified?: boolean | null
          primary_contact?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          target_age?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          id?: string
          phone_number?: string | null
          phone_verified?: boolean | null
          primary_contact?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          target_age?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          annual_amount: number | null
          bonus: number | null
          created_at: string
          effective_date: string | null
          id: string
          monthly_amount: number | null
          notes: string | null
          salary_type: string
          updated_at: string
          user_id: string
          variable_pay: number | null
          work_history_id: string
        }
        Insert: {
          annual_amount?: number | null
          bonus?: number | null
          created_at?: string
          effective_date?: string | null
          id?: string
          monthly_amount?: number | null
          notes?: string | null
          salary_type?: string
          updated_at?: string
          user_id: string
          variable_pay?: number | null
          work_history_id: string
        }
        Update: {
          annual_amount?: number | null
          bonus?: number | null
          created_at?: string
          effective_date?: string | null
          id?: string
          monthly_amount?: number | null
          notes?: string | null
          salary_type?: string
          updated_at?: string
          user_id?: string
          variable_pay?: number | null
          work_history_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_work_history_id_fkey"
            columns: ["work_history_id"]
            isOneToOne: false
            referencedRelation: "work_history"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          category: string
          created_at: string
          current_amount: number
          deadline: string | null
          goal_name: string
          id: string
          is_active: boolean
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          goal_name: string
          id?: string
          is_active?: boolean
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          goal_name?: string
          id?: string
          is_active?: boolean
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_profiles: {
        Row: {
          connection_type: string
          created_at: string
          custom_name: string | null
          id: string
          last_post_date: string | null
          last_sync_at: string | null
          logo_url: string | null
          notes_encrypted: string | null
          platform: string
          profile_url: string | null
          sort_order: number | null
          status: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          connection_type?: string
          created_at?: string
          custom_name?: string | null
          id?: string
          last_post_date?: string | null
          last_sync_at?: string | null
          logo_url?: string | null
          notes_encrypted?: string | null
          platform: string
          profile_url?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          connection_type?: string
          created_at?: string
          custom_name?: string | null
          id?: string
          last_post_date?: string | null
          last_sync_at?: string | null
          logo_url?: string | null
          notes_encrypted?: string | null
          platform?: string
          profile_url?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      study_goals: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string
          subject: string
          target_hours_weekly: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          subject: string
          target_hours_weekly?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          subject?: string
          target_hours_weekly?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_logs: {
        Row: {
          created_at: string | null
          date: string
          duration: number
          focus_level: string | null
          id: string
          is_timer_session: boolean | null
          linked_topic_id: string | null
          notes: string | null
          planned_duration: number | null
          subject: string
          timer_ended_at: string | null
          timer_started_at: string | null
          topic: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          duration: number
          focus_level?: string | null
          id?: string
          is_timer_session?: boolean | null
          linked_topic_id?: string | null
          notes?: string | null
          planned_duration?: number | null
          subject: string
          timer_ended_at?: string | null
          timer_started_at?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          duration?: number
          focus_level?: string | null
          id?: string
          is_timer_session?: boolean | null
          linked_topic_id?: string | null
          notes?: string | null
          planned_duration?: number | null
          subject?: string
          timer_ended_at?: string | null
          timer_started_at?: string | null
          topic?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_linked_topic_id_fkey"
            columns: ["linked_topic_id"]
            isOneToOne: false
            referencedRelation: "syllabus_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_colors: {
        Row: {
          color: string
          created_at: string | null
          id: string
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_paid: number
          cancelled_at: string | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          payment_method: string | null
          plan_type: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          plan_type: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          plan_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      syllabus_documents: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          notes: string | null
          progress_percentage: number
          sort_order: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number
          file_type: string
          file_url: string
          id?: string
          notes?: string | null
          progress_percentage?: number
          sort_order?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          progress_percentage?: number
          sort_order?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      syllabus_modules: {
        Row: {
          created_at: string
          id: string
          module_name: string
          module_order: number | null
          notes: string | null
          phase_id: string
          source_page: string | null
          status: string | null
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_name: string
          module_order?: number | null
          notes?: string | null
          phase_id: string
          source_page?: string | null
          status?: string | null
          time_spent_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_name?: string
          module_order?: number | null
          notes?: string | null
          phase_id?: string
          source_page?: string | null
          status?: string | null
          time_spent_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_modules_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "syllabus_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_phases: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          phase_name: string
          phase_order: number | null
          source_page: string | null
          status: string | null
          syllabus_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          phase_name: string
          phase_order?: number | null
          source_page?: string | null
          status?: string | null
          syllabus_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          phase_name?: string
          phase_order?: number | null
          source_page?: string | null
          status?: string | null
          syllabus_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      syllabus_topics: {
        Row: {
          chapter_name: string
          completed_at: string | null
          created_at: string | null
          ease_factor: number | null
          estimated_hours: number | null
          id: string
          interval_days: number | null
          is_completed: boolean | null
          module_id: string | null
          next_review_date: string | null
          notes: string | null
          priority: number | null
          review_count: number | null
          sort_order: number | null
          source_page: string | null
          status: string | null
          subject: string
          time_spent_minutes: number | null
          topic_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_name: string
          completed_at?: string | null
          created_at?: string | null
          ease_factor?: number | null
          estimated_hours?: number | null
          id?: string
          interval_days?: number | null
          is_completed?: boolean | null
          module_id?: string | null
          next_review_date?: string | null
          notes?: string | null
          priority?: number | null
          review_count?: number | null
          sort_order?: number | null
          source_page?: string | null
          status?: string | null
          subject: string
          time_spent_minutes?: number | null
          topic_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_name?: string
          completed_at?: string | null
          created_at?: string | null
          ease_factor?: number | null
          estimated_hours?: number | null
          id?: string
          interval_days?: number | null
          is_completed?: boolean | null
          module_id?: string | null
          next_review_date?: string | null
          notes?: string | null
          priority?: number | null
          review_count?: number | null
          sort_order?: number | null
          source_page?: string | null
          status?: string | null
          subject?: string
          time_spent_minutes?: number | null
          topic_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_topics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "syllabus_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          default_priority: string | null
          description: string | null
          icon: string | null
          id: string
          is_recurring: boolean | null
          name: string
          recurrence_days: number[] | null
          recurrence_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_priority?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_recurring?: boolean | null
          name: string
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_priority?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_recurring: boolean | null
          parent_recurring_id: string | null
          priority: string | null
          recurrence_days: number[] | null
          recurrence_type: string | null
          status: string
          text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          is_recurring?: boolean | null
          parent_recurring_id?: string | null
          priority?: string | null
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          status?: string
          text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_recurring?: boolean | null
          parent_recurring_id?: string | null
          priority?: string | null
          recurrence_days?: number[] | null
          recurrence_type?: string | null
          status?: string
          text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_parent_recurring_id_fkey"
            columns: ["parent_recurring_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_study_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          subject: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          subject: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          subject?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_study_schedule_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "syllabus_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      work_documents: {
        Row: {
          created_at: string
          document_type: string
          file_url: string
          id: string
          title: string
          user_id: string
          work_history_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_url: string
          id?: string
          title: string
          user_id: string
          work_history_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          title?: string
          user_id?: string
          work_history_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_documents_work_history_id_fkey"
            columns: ["work_history_id"]
            isOneToOne: false
            referencedRelation: "work_history"
            referencedColumns: ["id"]
          },
        ]
      }
      work_history: {
        Row: {
          company_name: string
          created_at: string
          employment_type: string
          end_date: string | null
          id: string
          is_current: boolean | null
          notes: string | null
          role: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          employment_type?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          role: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          employment_type?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          role?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
