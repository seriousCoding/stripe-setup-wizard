
import { supabase } from '@/integrations/supabase/client';

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  active: boolean;
  prices: StripePrice[];
  created: number;
}

export interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  type: 'one_time' | 'recurring';
  interval?: 'month' | 'year' | 'week' | 'day';
  product: string;
  active: boolean;
}

export interface BillingModel {
  id: string;
  name: string;
  description: string;
  type: 'pay-as-you-go' | 'flat-recurring' | 'fixed-overage' | 'per-seat';
  items: BillingItem[];
  created_at: string;
  user_id: string;
}

export interface BillingItem {
  id: string;
  product: string;
  price: number;
  currency: string;
  type: 'metered' | 'recurring' | 'one-time';
  interval?: string;
  eventName?: string;
  description?: string;
}

class StripeService {
  private baseUrl = 'https://api.stripe.com/v1';
  
  async createProduct(data: {
    name: string;
    description?: string;
    type?: 'service' | 'good';
  }): Promise<{ product?: any; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { error: 'Not authenticated' };
      }

      // In a real app, this would call your backend or edge function
      // For now, we'll simulate the response
      const mockProduct = {
        id: `prod_${Date.now()}`,
        object: 'product',
        name: data.name,
        description: data.description || '',
        type: data.type || 'service',
        active: true,
        created: Math.floor(Date.now() / 1000),
        attributes: [],
        images: [],
        livemode: false,
        metadata: {},
        package_dimensions: null,
        shippable: null,
        statement_descriptor: null,
        tax_code: null,
        unit_label: null,
        updated: Math.floor(Date.now() / 1000),
        url: null
      };

      console.log('Created Stripe product:', mockProduct);
      return { product: mockProduct };
    } catch (error: any) {
      console.error('Error creating product:', error);
      return { error: error.message };
    }
  }

  async createPrice(data: {
    product: string;
    unit_amount: number;
    currency: string;
    recurring?: {
      interval: 'month' | 'year' | 'week' | 'day';
    };
    billing_scheme?: 'per_unit' | 'tiered';
  }): Promise<{ price?: any; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { error: 'Not authenticated' };
      }

      // Simulate Stripe price creation
      const mockPrice = {
        id: `price_${Date.now()}`,
        object: 'price',
        active: true,
        billing_scheme: data.billing_scheme || 'per_unit',
        created: Math.floor(Date.now() / 1000),
        currency: data.currency.toLowerCase(),
        livemode: false,
        lookup_key: null,
        metadata: {},
        nickname: null,
        product: data.product,
        recurring: data.recurring || null,
        tax_behavior: 'unspecified',
        tiers_mode: null,
        transform_quantity: null,
        type: data.recurring ? 'recurring' : 'one_time',
        unit_amount: data.unit_amount
      };

      console.log('Created Stripe price:', mockPrice);
      return { price: mockPrice };
    } catch (error: any) {
      console.error('Error creating price:', error);
      return { error: error.message };
    }
  }

  async createMeter(data: {
    display_name: string;
    event_name: string;
  }): Promise<{ meter?: any; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { error: 'Not authenticated' };
      }

      // Simulate Stripe meter creation
      const mockMeter = {
        id: `mtr_${Date.now()}`,
        object: 'billing.meter',
        created: Math.floor(Date.now() / 1000),
        display_name: data.display_name,
        event_name: data.event_name,
        event_time_window: 'hour',
        status: 'active',
        customer_mapping: {
          event_payload_key: 'customer_id',
          type: 'by_id'
        },
        default_aggregation: {
          formula: 'sum'
        },
        value_settings: {
          event_payload_key: 'value'
        }
      };

      console.log('Created Stripe meter:', mockMeter);
      return { meter: mockMeter };
    } catch (error: any) {
      console.error('Error creating meter:', error);
      return { error: error.message };
    }
  }

  async listProducts(): Promise<{ products?: StripeProduct[]; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { error: 'Not authenticated' };
      }

      // Mock products for demonstration
      const mockProducts: StripeProduct[] = [
        {
          id: 'prod_1',
          name: 'API Service Pro',
          description: 'Professional API access with advanced features',
          active: true,
          created: 1640995200,
          prices: [
            {
              id: 'price_1',
              unit_amount: 2999,
              currency: 'usd',
              type: 'recurring',
              interval: 'month',
              product: 'prod_1',
              active: true
            }
          ]
        },
        {
          id: 'prod_2',
          name: 'Storage Plan',
          description: 'Scalable cloud storage solution',
          active: true,
          created: 1640908800,
          prices: [
            {
              id: 'price_2',
              unit_amount: 999,
              currency: 'usd',
              type: 'recurring',
              interval: 'month',
              product: 'prod_2',
              active: true
            }
          ]
        }
      ];

      return { products: mockProducts };
    } catch (error: any) {
      console.error('Error listing products:', error);
      return { error: error.message };
    }
  }
}

export const stripeService = new StripeService();
