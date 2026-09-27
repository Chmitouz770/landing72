/**
 * Types de la base Supabase (miroir de supabase/migrations).
 *
 * Quand le schéma évolue, régénérer avec `npm run db:types` (Supabase CLI)
 * ou mettre à jour ce fichier à la main.
 */

type Timestamp = string;

type FK<Name extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Name;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ['id'];
};

export type Gender = 'male' | 'female';
export type ListingKind = 'offer' | 'request';
export type StudyLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';
export type StudyFormat = 'in_person' | 'video' | 'both';
export type Audience = 'men' | 'women' | 'all';
export type ListingStatus = 'active' | 'paused' | 'closed';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type SessionMode = 'video' | 'in_person';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type DonationKind = 'one_time' | 'monthly';
export type ReportReason = 'inappropriate' | 'spam' | 'safety' | 'other';

type ProfileRow = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  gender: Gender | null;
  city: string | null;
  country: string | null;
  languages: string[];
  wants_to_learn: boolean;
  wants_to_teach: boolean;
  onboarded_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type TopicRow = {
  id: string;
  name_fr: string;
  name_en: string;
  name_he: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

type ListingRow = {
  id: string;
  owner_id: string;
  kind: ListingKind;
  topic_id: string;
  title: string;
  description: string | null;
  level: StudyLevel;
  format: StudyFormat;
  audience: Audience;
  languages: string[];
  city: string | null;
  availability: string | null;
  status: ListingStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type ConnectionRow = {
  id: string;
  listing_id: string | null;
  teacher_id: string;
  student_id: string;
  requested_by: string;
  status: ConnectionStatus;
  intro_message: string | null;
  responded_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type MessageRow = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at: Timestamp;
};

type StudySessionRow = {
  id: string;
  connection_id: string;
  created_by: string;
  starts_at: Timestamp;
  duration_minutes: number;
  mode: SessionMode;
  location: string | null;
  room_name: string;
  status: SessionStatus;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type SubscriptionRow = {
  id: string;
  user_id: string | null;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  current_period_end: Timestamp | null;
  cancel_at_period_end: boolean;
  dedication: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type DonationRow = {
  id: string;
  user_id: string | null;
  kind: DonationKind;
  amount_cents: number;
  currency: string;
  status: 'paid' | 'refunded';
  dedication: string | null;
  stripe_checkout_session_id: string | null;
  stripe_invoice_id: string | null;
  stripe_subscription_id: string | null;
  created_at: Timestamp;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  listing_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: 'open' | 'reviewed' | 'dismissed';
  created_at: Timestamp;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'display_name'>;
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      topics: {
        Row: TopicRow;
        Insert: TopicRow;
        Update: Partial<TopicRow>;
        Relationships: [];
      };
      listings: {
        Row: ListingRow;
        Insert: Partial<ListingRow> &
          Pick<ListingRow, 'owner_id' | 'kind' | 'topic_id' | 'title'>;
        Update: Partial<Omit<ListingRow, 'id' | 'owner_id' | 'created_at'>>;
        Relationships: [
          FK<'listings_owner_id_fkey', 'owner_id', 'profiles'>,
          FK<'listings_topic_id_fkey', 'topic_id', 'topics'>,
        ];
      };
      connections: {
        Row: ConnectionRow;
        Insert: never;
        Update: never;
        Relationships: [
          FK<'connections_listing_id_fkey', 'listing_id', 'listings'>,
          FK<'connections_teacher_id_fkey', 'teacher_id', 'profiles'>,
          FK<'connections_student_id_fkey', 'student_id', 'profiles'>,
          FK<'connections_requested_by_fkey', 'requested_by', 'profiles'>,
        ];
      };
      messages: {
        Row: MessageRow;
        Insert: Pick<MessageRow, 'connection_id' | 'sender_id' | 'body'> & Partial<MessageRow>;
        Update: never;
        Relationships: [
          FK<'messages_connection_id_fkey', 'connection_id', 'connections'>,
          FK<'messages_sender_id_fkey', 'sender_id', 'profiles'>,
        ];
      };
      study_sessions: {
        Row: StudySessionRow;
        Insert: Partial<StudySessionRow> &
          Pick<StudySessionRow, 'connection_id' | 'created_by' | 'starts_at'>;
        Update: Partial<
          Pick<StudySessionRow, 'starts_at' | 'duration_minutes' | 'mode' | 'location' | 'status' | 'notes'>
        >;
        Relationships: [
          FK<'study_sessions_connection_id_fkey', 'connection_id', 'connections'>,
          FK<'study_sessions_created_by_fkey', 'created_by', 'profiles'>,
        ];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      donations: {
        Row: DonationRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: Timestamp };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: ReportRow;
        Insert: Pick<ReportRow, 'reason'> &
          Partial<Pick<ReportRow, 'reported_user_id' | 'listing_id' | 'details' | 'reporter_id'>>;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      request_connection: {
        Args: { p_listing_id: string; p_message?: string | null };
        Returns: ConnectionRow;
      };
      block_user: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      respond_connection: {
        Args: { p_connection_id: string; p_action: 'accept' | 'decline' | 'cancel' };
        Returns: ConnectionRow;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database['public']['Tables'];
export type Tables<T extends keyof PublicTables> = PublicTables[T]['Row'];

export type Profile = Tables<'profiles'>;
export type Topic = Tables<'topics'>;
export type Listing = Tables<'listings'>;
export type Connection = Tables<'connections'>;
export type Message = Tables<'messages'>;
export type StudySession = Tables<'study_sessions'>;
export type Subscription = Tables<'subscriptions'>;
export type Donation = Tables<'donations'>;
