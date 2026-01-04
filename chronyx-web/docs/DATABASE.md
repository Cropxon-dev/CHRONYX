# Chronyx Database Documentation

This document provides comprehensive documentation of the Chronyx database schema, storage buckets, and edge functions for migration purposes.

## Database Tables

### User Management

#### `profiles`
Stores user profile information linked to auth.users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | - | Primary key, references auth.users |
| email | text | Yes | - | User's email address |
| display_name | text | Yes | - | User's display name |
| phone_number | text | Yes | - | Primary phone number |
| phone_verified | boolean | Yes | false | Phone verification status |
| email_verified | boolean | Yes | false | Email verification status |
| secondary_phone | text | Yes | - | Secondary phone number |
| secondary_email | text | Yes | - | Secondary email |
| primary_contact | text | Yes | 'email' | Preferred contact method |
| birth_date | date | Yes | - | Date of birth |
| target_age | integer | Yes | 60 | Target retirement age |
| avatar_url | text | Yes | - | Profile avatar URL |
| created_at | timestamptz | Yes | now() | Record creation timestamp |
| updated_at | timestamptz | Yes | now() | Last update timestamp |

**RLS Policies:**
- Users can view/update/insert their own profile (id = auth.uid())
- Users cannot delete profiles

---

### Subscription & Payments

#### `subscriptions`
Tracks user subscription plans.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | References auth.users |
| plan_type | text | No | - | 'free', 'pro', or 'premium' |
| status | text | No | 'active' | 'active', 'cancelled', 'expired', 'pending' |
| razorpay_order_id | text | Yes | - | Razorpay order ID |
| razorpay_payment_id | text | Yes | - | Razorpay payment ID |
| razorpay_signature | text | Yes | - | Razorpay signature |
| amount_paid | numeric | No | 0 | Amount paid |
| currency | text | No | 'INR' | Payment currency |
| payment_method | text | Yes | - | Payment method used |
| started_at | timestamptz | No | now() | Subscription start |
| expires_at | timestamptz | Yes | - | Expiration date (null = lifetime) |
| cancelled_at | timestamptz | Yes | - | Cancellation date |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `payment_history`
Records all payment transactions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | References auth.users |
| subscription_id | uuid | Yes | - | References subscriptions |
| razorpay_order_id | text | No | - | Razorpay order ID |
| razorpay_payment_id | text | Yes | - | Razorpay payment ID |
| razorpay_signature | text | Yes | - | Razorpay signature |
| amount | numeric | No | - | Transaction amount |
| currency | text | No | 'INR' | Currency code |
| status | text | No | 'pending' | 'pending', 'success', 'failed', 'refunded' |
| plan_type | text | No | - | Plan purchased |
| receipt_sent | boolean | Yes | false | Receipt email sent status |
| receipt_sent_at | timestamptz | Yes | - | Receipt sent timestamp |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

---

### Financial Management

#### `expenses`
Tracks user expenses.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| amount | numeric | No | - | Expense amount |
| category | text | No | - | Expense category |
| sub_category | text | Yes | - | Sub-category |
| expense_date | date | No | CURRENT_DATE | Date of expense |
| payment_mode | text | No | - | Payment method |
| notes | text | Yes | - | Additional notes |
| source_type | text | Yes | - | Source type (e.g., 'loan', 'insurance') |
| source_id | uuid | Yes | - | Related source ID |
| is_auto_generated | boolean | Yes | false | Auto-generated flag |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `expense_categories`
Custom expense categories.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Category name |
| user_id | uuid | Yes | - | Owner (null for defaults) |
| is_default | boolean | Yes | false | System default flag |
| created_at | timestamptz | No | now() | Record creation |

#### `income_sources`
Income source definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| source_name | text | No | - | Source name |
| category | text | No | - | Income category |
| frequency | text | No | - | Payment frequency |
| is_active | boolean | Yes | true | Active status |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `income_entries`
Individual income records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| income_source_id | uuid | Yes | - | References income_sources |
| amount | numeric | No | - | Income amount |
| income_date | date | No | CURRENT_DATE | Date received |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `budget_limits`
Monthly budget limits by category.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| category | text | No | - | Budget category |
| monthly_limit | numeric | No | - | Monthly limit amount |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `savings_goals`
User savings goals.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| goal_name | text | No | - | Goal name |
| target_amount | numeric | No | - | Target amount |
| current_amount | numeric | No | 0 | Current saved amount |
| category | text | No | 'general' | Goal category |
| deadline | date | Yes | - | Target deadline |
| is_active | boolean | No | true | Active status |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

---

### Loan Management

#### `loans`
Loan records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| bank_name | text | No | - | Bank/lender name |
| bank_logo_url | text | Yes | - | Bank logo URL |
| loan_type | text | No | - | Type of loan |
| loan_account_number | text | No | - | Account number |
| principal_amount | numeric | No | - | Principal amount |
| interest_rate | numeric | No | - | Annual interest rate |
| tenure_months | integer | No | - | Loan tenure in months |
| emi_amount | numeric | No | - | Monthly EMI amount |
| start_date | date | No | - | Loan start date |
| status | text | Yes | 'active' | Loan status |
| repayment_mode | text | Yes | 'Auto Debit' | Repayment mode |
| country | text | No | 'India' | Country |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | Yes | now() | Record creation |
| updated_at | timestamptz | Yes | now() | Last update |

#### `emi_schedule`
EMI payment schedule.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| loan_id | uuid | No | - | References loans |
| emi_month | integer | No | - | EMI month number |
| emi_date | date | No | - | Due date |
| emi_amount | numeric | No | - | EMI amount |
| principal_component | numeric | No | - | Principal portion |
| interest_component | numeric | No | - | Interest portion |
| remaining_principal | numeric | No | - | Outstanding principal |
| payment_status | text | Yes | 'Pending' | Payment status |
| paid_date | date | Yes | - | Actual payment date |
| payment_method | text | Yes | - | Payment method used |
| is_adjusted | boolean | Yes | false | Adjusted EMI flag |
| adjustment_event_id | uuid | Yes | - | Related adjustment event |
| created_at | timestamptz | Yes | now() | Record creation |

#### `emi_events`
Loan events (part payments, foreclosures).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| loan_id | uuid | No | - | References loans |
| event_type | text | No | - | Event type |
| event_date | date | No | - | Event date |
| amount | numeric | No | - | Amount involved |
| applied_to_emi_id | uuid | Yes | - | Applied to EMI |
| reduction_type | text | Yes | - | Reduction type |
| new_emi_amount | numeric | Yes | - | New EMI amount |
| new_tenure_months | integer | Yes | - | New tenure |
| interest_saved | numeric | Yes | 0 | Interest saved |
| mode | text | Yes | - | Payment mode |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | Yes | now() | Record creation |

#### `emi_reminders`
EMI reminder records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| emi_id | uuid | No | - | References emi_schedule |
| reminder_type | text | No | - | Reminder type |
| email_sent_to | text | No | - | Recipient email |
| sent_at | timestamptz | No | now() | Sent timestamp |

#### `loan_documents`
Loan-related documents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| loan_id | uuid | No | - | References loans |
| emi_id | uuid | Yes | - | Related EMI |
| file_name | text | No | - | File name |
| file_url | text | No | - | File URL |
| file_type | text | No | - | MIME type |
| document_type | text | Yes | 'other' | Document type |
| uploaded_at | timestamptz | Yes | now() | Upload timestamp |

#### `custom_banks`
User-defined banks.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| name | text | No | - | Short name |
| full_name | text | No | - | Full name |
| logo_url | text | Yes | - | Logo URL |
| color | text | No | '#6366f1' | Brand color |
| country | text | No | 'Other' | Country |
| created_at | timestamptz | No | now() | Record creation |

---

### Insurance Management

#### `insurances`
Insurance policies.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| policy_name | text | No | - | Policy name |
| provider | text | No | - | Insurance provider |
| policy_number | text | No | - | Policy number |
| policy_type | text | No | - | Policy type |
| insured_type | text | No | 'self' | Who is insured |
| insured_member_id | uuid | Yes | - | References family_members |
| vehicle_registration | text | Yes | - | Vehicle reg (for motor) |
| sum_assured | numeric | No | - | Sum assured |
| premium_amount | numeric | No | - | Premium amount |
| start_date | date | No | - | Policy start date |
| renewal_date | date | No | - | Next renewal date |
| status | text | No | 'active' | Policy status |
| reminder_days | integer[] | Yes | {30,7,1} | Reminder days before renewal |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `insurance_claims`
Insurance claims.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| insurance_id | uuid | No | - | References insurances |
| insured_member_id | uuid | Yes | - | References family_members |
| claim_type | text | No | - | Type of claim |
| claim_date | date | No | - | Claim date |
| claimed_amount | numeric | No | - | Amount claimed |
| approved_amount | numeric | Yes | - | Approved amount |
| settled_amount | numeric | Yes | - | Settled amount |
| status | text | No | 'Filed' | Claim status |
| claim_reference_no | text | Yes | - | Reference number |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `insurance_documents`
Insurance policy documents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| insurance_id | uuid | No | - | References insurances |
| file_name | text | No | - | File name |
| file_url | text | No | - | File URL |
| file_type | text | No | - | MIME type |
| document_type | text | No | 'policy' | Document type |
| year | integer | Yes | - | Policy year |
| uploaded_at | timestamptz | No | now() | Upload timestamp |

#### `insurance_claim_documents`
Claim-related documents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| claim_id | uuid | No | - | References insurance_claims |
| file_name | text | No | - | File name |
| file_url | text | No | - | File URL |
| file_type | text | No | - | MIME type |
| document_type | text | No | 'other' | Document type |
| uploaded_at | timestamptz | No | now() | Upload timestamp |

#### `insurance_reminders`
Insurance reminder records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| insurance_id | uuid | No | - | References insurances |
| reminder_days_before | integer | No | - | Days before renewal |
| email_sent_to | text | No | - | Recipient email |
| sent_at | timestamptz | No | now() | Sent timestamp |

---

### Family & Contacts

#### `family_members`
Family member records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| full_name | text | No | - | Full name |
| relation | text | No | - | Relationship |
| date_of_birth | date | Yes | - | Date of birth |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

---

### Documents & Memories

#### `documents`
General documents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| title | text | No | - | Document title |
| document_type | text | No | - | Document type |
| category | text | No | - | Category |
| file_url | text | No | - | File URL |
| thumbnail_url | text | Yes | - | Thumbnail URL |
| issue_date | date | Yes | - | Issue date |
| expiry_date | date | Yes | - | Expiry date |
| notes | text | Yes | - | Additional notes |
| is_locked | boolean | Yes | false | Password protected |
| sort_order | integer | Yes | 0 | Sort order |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `memories`
Photo/video memories.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| folder_id | uuid | Yes | - | References memory_folders |
| collection_id | uuid | Yes | - | References memory_collections |
| title | text | Yes | - | Memory title |
| description | text | Yes | - | Description |
| file_name | text | No | - | File name |
| file_url | text | No | - | File URL |
| thumbnail_url | text | Yes | - | Thumbnail URL |
| media_type | text | No | - | Media type |
| file_size | integer | Yes | - | File size in bytes |
| created_date | date | No | CURRENT_DATE | Memory date |
| is_locked | boolean | Yes | false | Password protected |
| uploaded_at | timestamptz | No | now() | Upload timestamp |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `memory_folders`
Memory organization folders.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| parent_folder_id | uuid | Yes | - | Parent folder |
| name | text | No | - | Folder name |
| icon | text | Yes | 'Default' | Folder icon |
| color | text | Yes | 'bg-accent/30' | Folder color |
| is_locked | boolean | Yes | false | Password protected |
| lock_hash | text | Yes | - | Password hash |
| sort_order | integer | Yes | 0 | Sort order |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `memory_collections`
Memory collections/albums.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| folder_id | uuid | Yes | - | Parent folder |
| name | text | No | - | Collection name |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

---

### Study Tracker

#### `study_logs`
Study session records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| subject | text | No | - | Subject studied |
| topic | text | Yes | - | Specific topic |
| duration | integer | No | - | Duration in minutes |
| date | date | No | CURRENT_DATE | Study date |
| focus_level | text | Yes | 'medium' | Focus level |
| notes | text | Yes | - | Session notes |
| is_timer_session | boolean | Yes | false | Timer-based session |
| timer_started_at | timestamptz | Yes | - | Timer start |
| timer_ended_at | timestamptz | Yes | - | Timer end |
| planned_duration | integer | Yes | - | Planned duration |
| linked_topic_id | uuid | Yes | - | Linked syllabus topic |
| created_at | timestamptz | Yes | now() | Record creation |
| updated_at | timestamptz | Yes | now() | Last update |

#### `study_goals`
Study goals.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| subject | text | No | - | Subject |
| target_hours_weekly | integer | No | 10 | Weekly target hours |
| start_date | date | No | CURRENT_DATE | Goal start date |
| end_date | date | Yes | - | Goal end date |
| is_active | boolean | Yes | true | Active status |
| created_at | timestamptz | Yes | now() | Record creation |
| updated_at | timestamptz | Yes | now() | Last update |

#### `subject_colors`
Subject color assignments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| subject | text | No | - | Subject name |
| color | text | No | '#6366f1' | Assigned color |
| created_at | timestamptz | Yes | now() | Record creation |
| updated_at | timestamptz | Yes | now() | Last update |

---

### Work & Education History

#### `work_history`
Employment history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| company | text | No | - | Company name |
| position | text | No | - | Job title |
| start_date | date | Yes | - | Start date |
| end_date | date | Yes | - | End date (null = current) |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `salary_records`
Salary records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| work_history_id | uuid | No | - | References work_history |
| salary_type | text | No | 'monthly' | Salary type |
| monthly_amount | numeric | Yes | - | Monthly salary |
| annual_amount | numeric | Yes | - | Annual salary |
| effective_date | date | Yes | - | Effective date |
| bonus | numeric | Yes | 0 | Bonus amount |
| variable_pay | numeric | Yes | 0 | Variable pay |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `education_records`
Education history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| institution | text | No | - | Institution name |
| degree | text | No | - | Degree obtained |
| course | text | Yes | - | Course/major |
| start_year | integer | Yes | - | Start year |
| end_year | integer | Yes | - | End year |
| notes | text | Yes | - | Additional notes |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `education_documents`
Education-related documents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| education_id | uuid | No | - | References education_records |
| title | text | No | - | Document title |
| document_type | text | No | - | Document type |
| file_url | text | No | - | File URL |
| created_at | timestamptz | No | now() | Record creation |

---

### Social & Activity

#### `social_profiles`
Social media profiles.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| platform | text | No | - | Platform name |
| username | text | Yes | - | Username/handle |
| profile_url | text | Yes | - | Profile URL |
| custom_name | text | Yes | - | Custom display name |
| logo_url | text | Yes | - | Platform logo |
| status | text | Yes | 'active' | Profile status |
| connection_type | text | No | 'manual' | Connection type |
| last_post_date | date | Yes | - | Last activity date |
| last_sync_at | timestamptz | Yes | - | Last sync timestamp |
| notes_encrypted | text | Yes | - | Encrypted notes |
| sort_order | integer | Yes | 0 | Sort order |
| created_at | timestamptz | No | now() | Record creation |
| updated_at | timestamptz | No | now() | Last update |

#### `activity_logs`
User activity tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| module | text | No | - | App module |
| action | text | No | - | Action performed |
| created_at | timestamptz | Yes | now() | Record creation |

#### `achievements`
User achievements.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Owner user ID |
| title | text | No | - | Achievement title |
| description | text | Yes | - | Description |
| category | text | No | - | Category |
| achieved_at | date | No | CURRENT_DATE | Date achieved |
| created_at | timestamptz | Yes | now() | Record creation |

---

## Database Functions

### `handle_new_user()`
Trigger function that creates a profile entry when a new user signs up.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;
```

### `update_updated_at_column()`
Trigger function to auto-update `updated_at` timestamps.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

## Storage Buckets

| Bucket Name | Public | Description |
|-------------|--------|-------------|
| `syllabus` | No | Study syllabus PDF files |
| `insurance-documents` | No | Insurance policy and claim documents |
| `loan-documents` | Yes | Loan-related documents |
| `memories` | No | User photos and videos |
| `documents` | No | General user documents |
| `vyom` | Yes | Public app assets |
| `chronyx` | Yes | Public app assets |

---

## Edge Functions

### Authentication & OTP

#### `send-email-otp`
Sends OTP via email for verification.
- **JWT Required:** No
- **Secrets:** `RESEND_API_KEY`

#### `send-sms-otp`
Sends OTP via SMS using Twilio.
- **JWT Required:** No
- **Secrets:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### Payment Processing

#### `create-razorpay-order`
Creates a Razorpay order for subscription payments.
- **JWT Required:** No
- **Secrets:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- **Input:** `{ amount, currency, plan_type, user_id, user_email }`
- **Output:** `{ order_id, amount, currency }`

#### `verify-razorpay-payment`
Verifies Razorpay payment signature.
- **JWT Required:** No
- **Secrets:** `RAZORPAY_KEY_SECRET`
- **Input:** `{ order_id, payment_id, signature }`
- **Output:** `{ verified: boolean }`

#### `send-payment-receipt`
Sends payment confirmation email with receipt.
- **JWT Required:** No
- **Secrets:** `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Input:** Payment details including user info, amount, plan type

### Loan Management

#### `generate-emi-schedule`
Generates EMI schedule for a loan.
- **JWT Required:** No
- **Input:** Loan ID and parameters
- **Output:** Generated EMI schedule

#### `mark-emi-paid`
Marks an EMI as paid.
- **JWT Required:** No
- **Input:** EMI ID, payment details

#### `apply-part-payment`
Applies a part payment to a loan.
- **JWT Required:** No
- **Input:** Loan ID, amount, reduction type

#### `apply-foreclosure`
Processes loan foreclosure.
- **JWT Required:** No
- **Input:** Loan ID, foreclosure details

#### `recalc-loan-summary`
Recalculates loan summary after changes.
- **JWT Required:** No
- **Input:** Loan ID

#### `send-emi-reminders`
Sends EMI due date reminders.
- **JWT Required:** No
- **Secrets:** `RESEND_API_KEY`

### Insurance

#### `send-insurance-reminders`
Sends insurance renewal reminders.
- **JWT Required:** No
- **Secrets:** `RESEND_API_KEY`

#### `auto-link-insurance-expense`
Auto-creates expense entries for insurance premiums.
- **JWT Required:** No

### User Management

#### `send-welcome-email`
Sends welcome email to new users.
- **JWT Required:** No
- **Secrets:** `RESEND_API_KEY`

#### `check-social-profiles`
Verifies social profile URLs.
- **JWT Required:** No

---

## Secrets Required

| Secret Name | Description |
|-------------|-------------|
| `RAZORPAY_KEY_ID` | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret |
| `RESEND_API_KEY` | Resend email service API key |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for SMS |
| `SUPABASE_URL` | Supabase project URL (auto-configured) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (auto-configured) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (auto-configured) |
| `SUPABASE_DB_URL` | Supabase database URL (auto-configured) |

---

## Migration Notes

When migrating to your own Supabase project:

1. **Create tables in order** - Start with tables that have no foreign keys, then create dependent tables
2. **Run functions first** - Create the `handle_new_user` and `update_updated_at_column` functions before creating triggers
3. **Create triggers** - Set up the `on_auth_user_created` trigger for automatic profile creation
4. **Enable RLS** - Enable Row Level Security on all tables
5. **Create policies** - Apply the RLS policies for each table
6. **Create buckets** - Set up storage buckets with appropriate public/private settings
7. **Deploy edge functions** - Copy edge functions to your project
8. **Configure secrets** - Add all required secrets in the Supabase dashboard
9. **Update client config** - Update the Supabase URL and anon key in your application

---

*Last updated: January 2026*
