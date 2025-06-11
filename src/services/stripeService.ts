
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
  async createProduct(data: {
    name: string;
    description?: string;
    type?: 'service' | 'good';
  }): Promise<{ product?: any; error?: string }> {
    try {
      const { data: result, error } = await supabase.functions.invoke('create-stripe-product', {
        body: data
      });

      if (error) {
        console.error('Error creating product:', error);
        return { error: error.message };
      }

      return { product: result.product };
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
      const { data: result, error } = await supabase.functions.invoke('create-stripe-price', {
        body: data
      });

      if (error) {
        console.error('Error creating price:', error);
        return { error: error.message };
      }

      return { price: result.price };
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
      const { data: result, error } = await supabase.functions.invoke('create-stripe-meter', {
        body: data
      });

      if (error) {
        console.error('Error creating meter:', error);
        return { error: error.message };
      }

      return { meter: result.meter };
    } catch (error: any) {
      console.error('Error creating meter:', error);
      return { error: error.message };
    }
  }

  async deployBillingModel(billingModel: any): Promise<{ results?: any; error?: string }> {
    try {
      const { data: result, error } = await supabase.functions.invoke('deploy-billing-model', {
        body: { billingModel }
      });

      if (error) {
        console.error('Error deploying billing model:', error);
        return { error: error.message };
      }

      return { results: result };
    } catch (error: any) {
      console.error('Error deploying billing model:', error);
      return { error: error.message };
    }
  }

  async listProducts(): Promise<{ products?: StripeProduct[]; error?: string }> {
    try {
      // For now, return empty array since we'd need another edge function to list products
      // In a real implementation, you'd create a list-stripe-products edge function
      return { products: [] };
    } catch (error: any) {
      console.error('Error listing products:', error);
      return { error: error.message };
    }
  }

  async checkConnection(): Promise<{ connected?: boolean; error?: string }> {
    try {
      const { data: result, error } = await supabase.functions.invoke('check-stripe-connection');

      if (error) {
        return { connected: false, error: error.message };
      }

      return { connected: result.connected };
    } catch (error: any) {
      console.error('Error checking connection:', error);
      return { connected: false, error: error.message };
    }
  }
}

export const stripeService = new StripeService();
