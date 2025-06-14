
export interface BillingPlan {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  type: 'recurring';
  interval: 'month';
  metadata: {
    tier_id: string;
    billing_model_type: string;
    usage_limit_transactions: string;
    usage_limit_ai_processing: string;
    overage_rate?: string;
    popular?: string;
    badge?: string;
    subtitle: string;
  };
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'Fixed Fee + Overage',
    description: 'Perfect for small teams with 1,000 included transactions monthly.',
    price: 1900,
    type: 'recurring',
    interval: 'month',
    metadata: {
      tier_id: 'starter',
      billing_model_type: 'fixed_fee_graduated',
      usage_limit_transactions: '1000',
      usage_limit_ai_processing: '100',
      overage_rate: '0.02',
      subtitle: 'Fixed Fee + Overage'
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    subtitle: 'Fixed Fee + Overage',
    description: 'Great for growing businesses with 5,000 included transactions monthly.',
    price: 4900,
    type: 'recurring',
    interval: 'month',
    metadata: {
      tier_id: 'professional',
      billing_model_type: 'fixed_fee_graduated',
      usage_limit_transactions: '5000',
      usage_limit_ai_processing: '500',
      overage_rate: '0.015',
      popular: 'true',
      subtitle: 'Fixed Fee + Overage'
    }
  },
  {
    id: 'business',
    name: 'Business',
    subtitle: 'Flat Fee',
    description: 'Unlimited transactions with predictable monthly costs.',
    price: 9900,
    type: 'recurring',
    interval: 'month',
    metadata: {
      tier_id: 'business',
      billing_model_type: 'flat_recurring',
      usage_limit_transactions: 'unlimited',
      usage_limit_ai_processing: 'unlimited',
      subtitle: 'Flat Fee'
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Per Seat',
    description: 'Scale with your team size and organizational needs.',
    price: 2500,
    type: 'recurring',
    interval: 'month',
    metadata: {
      tier_id: 'enterprise',
      billing_model_type: 'per_seat',
      usage_limit_transactions: 'unlimited',
      usage_limit_ai_processing: 'unlimited',
      subtitle: 'Per Seat'
    }
  },
  {
    id: 'trial',
    name: 'Free Trial',
    subtitle: 'Trial',
    description: 'Try all features risk-free with 500 included transactions monthly.',
    price: 0,
    type: 'recurring',
    interval: 'month',
    metadata: {
      tier_id: 'trial',
      billing_model_type: 'free_trial',
      usage_limit_transactions: '500',
      usage_limit_ai_processing: '50',
      overage_rate: '0.05',
      badge: 'Free Trial',
      subtitle: 'Trial'
    }
  }
];
