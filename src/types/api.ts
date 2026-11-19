/**
 * The shapes the Django API returns (docs/mobile-api.md in
 * ../total-care-plan-app). Only the fields the app reads are typed.
 */

export type Role = 'CLIENT' | 'TECHNICIAN' | 'DISPATCH_COORDINATOR' | 'ACCOUNT_MANAGER' | 'ACCOUNTS' | 'ADMIN';
export type Lang = 'en' | 'ig';
export type Choice = { key: string; label: string };

export type Person = {
  id: number;
  name: string;
  first_name: string;
  phone: string;
  role: Role;
  avatar_url: string | null;
  initials: string;
};

export type User = Person & {
  username: string;
  last_name: string;
  email: string;
  phone_number: string;
  phone_verified: boolean;
  role_label: string;
  language: Lang;
  preferred_channel: 'SMS' | 'EMAIL' | string;
  is_office: boolean;
  can_use_console: boolean;
  client?: { id: number; name: string; has_plan: boolean; account_manager: Person | null } | null;
};

export type SignedIn = { token: string; user: User };

export type CodeCheck = {
  check: string;
  purpose: string;
  sent_by: 'SMS' | 'EMAIL';
  sent_to: string;
  can_email: boolean;
  resend_in: number;
};

export type Site = {
  id: number;
  name: string;
  address: string;
  address_line: string;
  area: string;
  area_label: string;
  landmark: string;
  lat: number | null;
  lng: number | null;
  pinned: boolean;
};

export type JobStatus = 'NEW' | 'ASSIGNED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'AWAITING_SIGN_OFF' | 'COMPLETED' | 'CANCELLED' | string;

export type Job = {
  id: number;
  type: string;
  type_label: string;
  status: JobStatus;
  status_label: string;
  sla_state: string;
  on_plan: boolean;
  raised_at: string;
  scheduled_for: string | null;
  sla_deadline: string | null;
  responded_at: string | null;
  completed_at: string | null;
  site: Site | null;
  client_name: string;
  technician: Person | null;
  trackable: boolean;
  description?: string;
  photos?: { id: number; url: string | null; caption: string }[];
};

export type JobRow = Job & {
  countdown?: string;
  live_sla?: string;
  area?: string;
  watch?: string;
  on_the_way?: string;
  covering?: string[];
  report_status?: string | null;
  report_status_label?: string;
};

export type TechnicianCard = {
  name: string;
  first_name: string;
  initials: string;
  photo_url: string;
  staff_id: string;
  verified: boolean;
  verification_label: string;
  arrived_at: string | null;
  status: string;
  job_id: number;
};

export type Paged<T> = { count: number; page: number; pages: number; next: number | null; results: T[] };

export type Config = {
  codes_by: 'SMS' | 'EMAIL';
  email_ready: boolean;
  support_phone: string;
  visit_fee: string;
  languages: { code: Lang; label: string }[];
  areas: { key: string; label: string; cluster: string }[];
  emergency_problems: Choice[];
  repair_jobs: (Choice & { hint: string })[];
  repair_days: Choice[];
  repair_slots: Choice[];
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  category: { id: number; name: string; slug: string };
  badge: string;
  badge_label: string;
  price: string | null;
  quote_only: boolean;
  ask_price: boolean;
  buyable: boolean;
  in_stock: boolean;
  fitting_available: boolean;
  image_url: string | null;
  description?: string;
  specs?: { label: string; value: string }[];
};

export type OrderStep = { label: string; done?: boolean; current?: boolean } | string;

export type Order = {
  id: number;
  token: string;
  number: string;
  status: string;
  status_label: string;
  is_open: boolean;
  summary: string;
  method: 'DELIVER' | 'PICKUP';
  method_label: string;
  payment: 'CARD' | 'TRANSFER';
  payment_label: string;
  area: string;
  address: string;
  landmark: string;
  fitting: boolean;
  items_total: string;
  delivery_fee: string;
  total: string;
  paid_at: string | null;
  created_at: string;
  items: { name: string; quantity: number; unit_price: string; product_id: number | null }[];
  progress: OrderStep[];
  can_pay: boolean;
};

export type StaffOrder = Order & {
  customer: { name: string; phone: string; email: string };
  staff_note: string;
  next_steps: Choice[];
  can_cancel: boolean;
  fitting_job_id: number | null;
};

export type HelpRequest = {
  token: string;
  reference: string;
  kind: 'EMERGENCY' | 'REPAIR';
  kind_label: string;
  problem: string;
  preferred_when: string;
  details: string;
  phone_confirmed: boolean;
  created_at: string;
  step: number;
  state: string;
  job_id: number | null;
  technician: TechnicianCard | null;
  track_url: string | null;
  stay_safe: { title: string; text: string }[];
};

export type PowerReport = {
  token: string;
  reference: string;
  kind: string;
  kind_label: string;
  duration: string;
  duration_label: string;
  details: string;
  meter_number: string;
  area: string;
  address: string;
  status: string;
  status_label: string;
  is_open: boolean;
  owner: Person | null;
  company_reference: string;
  created_at: string;
  pickup_by: string | null;
  reply_by: string | null;
  clock: { used: number; of: number; percent: number } | null;
  neighbours: number;
  can_confirm: boolean;
  photo_url: string | null;
  updates: { text: string; at: string }[];
};

export type Notice = {
  id: number;
  category: string;
  subject: string;
  body: string;
  sent_at: string;
  action_path: string;
  action_url: string | null;
  action_label: string;
};

/** What a failed request carries: a readable message, and form errors by field. */
export type ApiFailure = { message: string; status: number; errors?: Record<string, string[]> };
