/** ElectriKa marketplace shapes, as /api/market/ sends them (docs/mobile-api.md). */

export type Paged<T> = { count: number; page: number; pages: number; next: number | null; results: T[] };

export type Category = {
  id: number;
  slug: string;
  name: string;
  icon: string;
  description: string;
  spec_fields?: SpecField[];
};

export type SpecField = {
  key: string;
  label: string;
  unit: string;
  kind: 'TEXT' | 'NUMBER' | 'CHOICE';
  choices: string[];
  required: boolean;
  filterable: boolean;
};

export type VendorCard = {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
  state: string;
  city: string;
  verified: boolean;
  status: string;
  status_label: string;
  storefront_url: string;
  favourite: boolean;
  member_since: string;
};

export type VendorPublic = VendorCard & {
  description: string;
  cover_url: string | null;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  whatsapp_link: string;
  categories: { slug: string; name: string }[];
  verification_note: string;
};

export type ListingCard = {
  id: number;
  slug: string;
  title: string;
  price: string;
  negotiable: boolean;
  condition: string;
  condition_label: string;
  image_url: string | null;
  category: { slug: string; name: string };
  brand: string;
  model_number: string;
  state: string;
  city: string;
  available: boolean;
  vendor: { slug: string; name: string; verified: boolean };
  sold_by: string;
  favourite: boolean;
  url: string;
  sponsored?: boolean;
  promotion_id?: number;
  sponsored_label?: string;
};

export type ListingDetail = Omit<ListingCard, 'vendor'> & {
  description: string;
  manufacturer: string;
  warranty: string;
  stock: number;
  images: { id: number; url: string }[];
  specs: { label: string; value: string }[];
  vendor: VendorPublic;
  views: number;
  payment_notice: string;
  safety_tips: string[];
  more_from_vendor: ListingCard[];
  similar: ListingCard[];
  ads: Ad[];
  conversation_id?: number | null;
  is_mine?: boolean;
};

export type MyListing = ListingDetail & {
  status: string;
  status_label: string;
  moderation_note: string;
  specs_values: Record<string, string>;
  category_id: number;
  brand_name: string;
  enquiries: number;
  available_flag: boolean;
  created_at: string;
  updated_at: string;
};

export type Ad = {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  placement: string;
  target_url: string;
  listing_slug: string | null;
  vendor_slug: string | null;
  category_slug: string | null;
  external: boolean;
  advertiser: string;
  label: string;
};

export type Offer = {
  id: number;
  amount: string;
  quantity: number;
  note: string;
  side: Side;
  status: string;
  status_label: string;
  expires_at: string;
  counter_to: number | null;
  created_at: string;
  responded_at: string | null;
  can_respond: boolean;
  can_withdraw: boolean;
};

export type Side = 'BUYER' | 'VENDOR';

export type Message = {
  id: number;
  conversation: number;
  side: Side;
  mine: boolean;
  kind: 'TEXT' | 'IMAGE' | 'OFFER' | 'SYSTEM';
  body: string;
  image_url: string | null;
  offer: Offer | null;
  created_at: string;
};

export type Conversation = {
  id: number;
  side: Side;
  vendor: VendorCard;
  buyer: { id: number; name: string };
  listing: null | {
    id: number | null;
    slug: string | null;
    title: string;
    price: string | null;
    current_price: string | null;
    image_url: string | null;
    negotiable: boolean;
  };
  last_message_at: string;
  last_message: string;
  unread: number;
  other_read_at: string | null;
  archived: boolean;
  agreed_price: string | null;
  agreed_quantity: number | null;
  online: boolean | null;
  payment_notice: string;
};

export type ConversationDetail = Conversation & {
  messages: Message[];
  has_more: boolean;
  blocked_by: Side[];
  open_offer: Offer | null;
  offers: Offer[];
};

export type Plan = {
  id: number;
  code: string;
  name: string;
  tagline: string;
  monthly_price: string;
  annual_price: string;
  trial_days: number;
  listing_limit: number | null;
  staff_seats: number;
  is_free: boolean;
  verified_badge: boolean;
  advanced_analytics: boolean;
  can_promote: boolean;
  support_level: string;
  features: string[];
};

export type Subscription = {
  id: number;
  plan: Plan;
  billing: 'MONTHLY' | 'ANNUAL';
  billing_label: string;
  status: string;
  status_label: string;
  trial: boolean;
  starts_at: string | null;
  ends_at: string | null;
  amount: string;
  ending: boolean;
};

export type Payment = {
  id: number;
  kind: string;
  kind_label: string;
  description: string;
  amount: string;
  status: string;
  status_label: string;
  reference: string;
  paid_at: string | null;
  created_at: string;
};

export type MyStore = VendorPublic & {
  show_phone: boolean;
  show_email: boolean;
  show_whatsapp: boolean;
  category_ids: number[];
  status_note: string;
  subscription: Subscription | null;
  plan: Plan | null;
  is_owner: boolean;
  active_listings: number;
  can_add_listing: boolean;
  documents: { id: number; kind: string; kind_label: string; note: string; url: string; uploaded_at: string }[];
};

export type Dashboard = {
  listings: { active: number; pending: number; rejected: number; drafts: number; archived: number; suspended: number };
  listing_limit: number | null;
  views: number;
  store_visits: number;
  enquiries: number;
  conversations: number;
  unread: number;
  active_promotions: number;
  days: number;
  daily?: { day: string; views: number; visits: number }[];
  top_listings?: { id: number; title: string; slug: string; views: number; enquiries: number }[];
  store: MyStore;
};

export type MarketConfig = {
  payment_notice: string;
  safety_tips: string[];
  states: string[];
  conditions: { value: string; label: string }[];
  listing_report_reasons: { value: string; label: string }[];
  chat_report_reasons: { value: string; label: string }[];
  document_kinds: { value: string; label: string }[];
  sorts: { value: string; label: string }[];
  offer_hours: number;
};

/** A paid service started: open Paystack at checkout_url. */
export type Checkout = { checkout_url?: string; return_url?: string | null; payment?: Payment };
