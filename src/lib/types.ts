export const ORANGE_CASH_NUMBER = '01207782741';

export type SubscriptionTier = 'starter' | 'pro';
export type SubscriptionStatus = 'active' | 'inactive' | 'expired' | 'cancelled';

export interface Subscription {
  id: string;
  user_id?: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  sender_mobile?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export type TransactionStatus = 'pending' | 'verified' | 'rejected';

export interface Transaction {
  id: string;
  user_id?: string | null;
  subscription_id?: string | null;
  sender_mobile: string;
  receipt_code: string;
  amount: number | string;
  status: TransactionStatus;
  tier: SubscriptionTier;
  created_at: string;
  reviewed_at?: string | null;
}

export interface Project {
  id: string;
  name: string;
  prompt: string;
  code: string;
  template_type: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_label: string;
  prompt: string;
  code: string;
  created_at: string;
}

/**
 * One turn of the builder conversation (Bolt.new-style chat column).
 * Assistant turns may carry a live `status` while generation is running.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: string;
  isError?: boolean;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
  category: 'e-commerce' | 'landing-page' | 'dashboard' | 'blank';
}

export interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  expires_at?: string | null;
  is_active: boolean;
}

export interface Notification {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Product grid with cart, checkout flow, and product details',
    icon: 'ShoppingBag',
    prompt: 'Create a modern e-commerce store with a product grid, shopping cart, product cards with prices, and a checkout button',
    category: 'e-commerce',
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Hero section, features, testimonials, and CTA',
    icon: 'Rocket',
    prompt: 'Create a beautiful landing page with a hero section, feature highlights, testimonials, and a call-to-action button',
    category: 'landing-page',
  },
  {
    id: 'dashboard',
    name: 'Analytics Dashboard',
    description: 'Stats cards, charts, data table, and sidebar',
    icon: 'LayoutDashboard',
    prompt: 'Create an analytics dashboard with stat cards, a bar chart, a data table, and a sidebar navigation',
    category: 'dashboard',
  },
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch with your own prompt',
    icon: 'Sparkles',
    prompt: '',
    category: 'blank',
  },
];

export const PRICING = {
  starter: { price: 99, currency: 'EGP', name: 'Starter', label: 'الباقة المبتدئة' },
  pro: { price: 199, currency: 'EGP', name: 'PRO', label: 'الباقة الاحترافية' },
} as const;
