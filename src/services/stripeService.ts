import { supabase } from '@/integrations/supabase/client';
import { billingCreditsService } from './billingCreditsService';

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
  recurring?: {
    interval: 'month' | 'year' | 'week' | 'day';
    interval_count?: number;
  };
  billing_scheme?: 'per_unit' | 'tiered';
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
  unit_amount: number; // Amount in cents (Stripe format)
  currency: string;
  type: 'metered' | 'recurring' | 'one_time';
  interval?: string;
  eventName?: string;
  description?: string;
  billing_scheme?: 'per_unit' | 'tiered';
  usage_type?: 'metered' | 'licensed';
  aggregate_usage?: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  metadata?: Record<string, string>;
}

class StripeService {
  private getApiKey(): string | null {
    return localStorage.getItem('stripe_api_key');
  }

  async createProduct(data: {
    name: string;
    description?: string;
    type?: 'service' | 'good';
    metadata?: Record<string, string>;
  }): Promise<{ product?: any; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { error: 'Stripe API key not configured' };
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('create-stripe-product', {
        body: { 
          ...data, 
          apiKey,
          type: data.type || 'service',
          metadata: {
            created_via: 'stripe_setup_pilot',
            ...data.metadata
          }
        }
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
      interval_count?: number;
    };
    billing_scheme?: 'per_unit' | 'tiered';
    usage_type?: 'metered' | 'licensed';
    aggregate_usage?: 'sum' | 'last_during_period' | 'last_ever' | 'max';
    metadata?: Record<string, string>;
  }): Promise<{ price?: any; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { error: 'Stripe API key not configured' };
    }

    try {
      // Ensure unit_amount is an integer (Stripe requirement)
      const unit_amount = Math.round(data.unit_amount);
      
      // Ensure currency is lowercase (Stripe requirement)
      const currency = data.currency.toLowerCase();

      const priceData = {
        ...data,
        unit_amount,
        currency,
        apiKey,
        metadata: {
          created_via: 'stripe_setup_pilot',
          ...data.metadata
        }
      };

      const { data: result, error } = await supabase.functions.invoke('create-stripe-price', {
        body: priceData
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
    customer_mapping?: {
      event_payload_key: string;
      type: 'by_id' | 'by_email';
    };
    default_aggregation?: {
      formula: 'sum' | 'count' | 'last_during_period' | 'last_ever' | 'max';
    };
    value_settings?: {
      event_payload_key: string;
    };
  }): Promise<{ meter?: any; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { error: 'Stripe API key not configured' };
    }

    try {
      const meterData = {
        display_name: data.display_name,
        event_name: data.event_name,
        customer_mapping: data.customer_mapping || {
          event_payload_key: 'customer_id',
          type: 'by_id'
        },
        default_aggregation: data.default_aggregation || {
          formula: 'sum'
        },
        value_settings: data.value_settings || {
          event_payload_key: 'value'
        },
        apiKey
      };

      const { data: result, error } = await supabase.functions.invoke('create-stripe-meter', {
        body: meterData
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
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { error: 'Stripe API key not configured' };
    }

    try {
      // Validate and format billing model data according to Stripe requirements
      const formattedBillingModel = {
        ...billingModel,
        items: billingModel.items.map((item: any) => ({
          ...item,
          // Ensure unit_amount is in cents and is an integer
          unit_amount: Math.round(item.unit_amount || (item.price * 100)),
          // Ensure currency is lowercase
          currency: (item.currency || 'usd').toLowerCase(),
          // Ensure proper event naming for metered items
          eventName: item.eventName || this.generateEventName(item.product),
          // Add required metadata
          metadata: {
            billing_model_type: billingModel.type,
            created_via: 'stripe_setup_pilot',
            auto_apply_credits: 'true', // Enable automatic credit application
            ...item.metadata
          }
        }))
      };

      const { data: result, error } = await supabase.functions.invoke('deploy-billing-model', {
        body: { billingModel: formattedBillingModel, apiKey }
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

  private generateEventName(productName: string): string {
    return productName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50); // Stripe event names should be reasonably short
  }

  async listProducts(): Promise<{ products?: StripeProduct[]; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { error: 'Stripe API key not configured' };
    }

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
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { connected: false, error: 'No API key provided' };
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('check-stripe-connection', {
        body: { apiKey }
      });

      if (error) {
        return { connected: false, error: error.message };
      }

      return { connected: result.connected };
    } catch (error: any) {
      console.error('Error checking connection:', error);
      return { connected: false, error: error.message };
    }
  }

  // New method to record usage with automatic credit application
  async recordUsageWithCredits(
    customerId: string,
    eventName: string,
    value: number,
    pricePerUnit: number,
    currency: string = 'usd',
    metadata?: Record<string, string>
  ): Promise<{ 
    success: boolean;
    totalCost: number;
    appliedCredits: number;
    finalCharge: number;
    error?: string 
  }> {
    try {
      const result = await billingCreditsService.recordUsageWithCredits(
        customerId,
        eventName,
        value,
        pricePerUnit,
        currency,
        metadata
      );

      if (result.error) {
        return {
          success: false,
          totalCost: 0,
          appliedCredits: 0,
          finalCharge: 0,
          error: result.error
        };
      }

      return {
        success: true,
        totalCost: result.totalCost,
        appliedCredits: result.appliedCredits,
        finalCharge: result.finalCharge
      };
    } catch (error: any) {
      console.error('Error recording usage with credits:', error);
      return {
        success: false,
        totalCost: 0,
        appliedCredits: 0,
        finalCharge: 0,
        error: error.message
      };
    }
  }

  // Utility method to validate Stripe data format
  validateBillingItem(item: BillingItem): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!item.product || item.product.trim() === '') {
      errors.push('Product name is required');
    }
    
    if (!item.unit_amount || item.unit_amount <= 0) {
      errors.push('Unit amount must be greater than 0');
    }
    
    if (!item.currency || !['usd', 'eur', 'gbp'].includes(item.currency.toLowerCase())) {
      errors.push('Valid currency is required (USD, EUR, GBP)');
    }
    
    if (item.type === 'metered' && !item.eventName) {
      errors.push('Event name is required for metered billing');
    }
    
    if (item.type === 'recurring' && !item.interval) {
      errors.push('Interval is required for recurring billing');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const stripeService = new StripeService();
