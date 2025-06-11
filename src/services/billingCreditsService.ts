
import { supabase } from '@/integrations/supabase/client';

export interface BillingCredit {
  id: string;
  customer_id: string;
  amount: number;
  remaining_balance: number;
  currency: string;
  expires_at?: string;
  created_at: string;
  metadata?: Record<string, string>;
}

export interface CreditUsage {
  id: string;
  credit_id: string;
  amount_used: number;
  invoice_id?: string;
  description: string;
  created_at: string;
}

class BillingCreditsService {
  private getApiKey(): string | null {
    return localStorage.getItem('stripe_api_key');
  }

  async checkCustomerSubscription(customerId: string): Promise<{ isSubscribed: boolean; subscriptionTier?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { isSubscribed: false };
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: { customerId, apiKey }
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return { isSubscribed: false };
      }

      return {
        isSubscribed: data.subscribed || false,
        subscriptionTier: data.subscription_tier
      };
    } catch (error) {
      console.error('Error checking subscription:', error);
      return { isSubscribed: false };
    }
  }

  async getCustomerCredits(customerId: string): Promise<{ credits?: BillingCredit[]; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { error: 'Stripe API key not configured' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-customer-credits', {
        body: { customerId, apiKey }
      });

      if (error) {
        return { error: error.message };
      }

      return { credits: data.credits || [] };
    } catch (error: any) {
      console.error('Error getting customer credits:', error);
      return { error: error.message };
    }
  }

  async applyCreditsToUsage(customerId: string, usageAmount: number, currency: string = 'usd'): Promise<{ 
    appliedAmount: number; 
    remainingUsage: number; 
    creditsUsed: CreditUsage[];
    error?: string 
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { appliedAmount: 0, remainingUsage: usageAmount, creditsUsed: [], error: 'Stripe API key not configured' };
    }

    try {
      // Check if customer is subscribed
      const { isSubscribed } = await this.checkCustomerSubscription(customerId);
      
      if (!isSubscribed) {
        console.log('Customer not subscribed, credits not applied');
        return { appliedAmount: 0, remainingUsage: usageAmount, creditsUsed: [] };
      }

      const { data, error } = await supabase.functions.invoke('apply-credits-to-usage', {
        body: { 
          customerId, 
          usageAmount, 
          currency: currency.toLowerCase(),
          apiKey 
        }
      });

      if (error) {
        return { appliedAmount: 0, remainingUsage: usageAmount, creditsUsed: [], error: error.message };
      }

      return {
        appliedAmount: data.appliedAmount || 0,
        remainingUsage: data.remainingUsage || usageAmount,
        creditsUsed: data.creditsUsed || []
      };
    } catch (error: any) {
      console.error('Error applying credits to usage:', error);
      return { appliedAmount: 0, remainingUsage: usageAmount, creditsUsed: [], error: error.message };
    }
  }

  async grantCreditsToCustomer(
    customerId: string, 
    amount: number, 
    currency: string = 'usd',
    expiresAt?: string,
    metadata?: Record<string, string>
  ): Promise<{ credit?: BillingCredit; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { error: 'Stripe API key not configured' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('grant-customer-credits', {
        body: { 
          customerId, 
          amount, 
          currency: currency.toLowerCase(),
          expiresAt,
          metadata,
          apiKey 
        }
      });

      if (error) {
        return { error: error.message };
      }

      return { credit: data.credit };
    } catch (error: any) {
      console.error('Error granting credits:', error);
      return { error: error.message };
    }
  }

  async recordUsageWithCredits(
    customerId: string,
    eventName: string,
    value: number,
    pricePerUnit: number,
    currency: string = 'usd',
    metadata?: Record<string, string>
  ): Promise<{ 
    totalCost: number;
    appliedCredits: number;
    finalCharge: number;
    error?: string 
  }> {
    try {
      const totalCost = value * pricePerUnit;
      
      // Apply credits automatically for subscribed customers
      const { appliedAmount, remainingUsage, error } = await this.applyCreditsToUsage(
        customerId, 
        totalCost, 
        currency
      );

      if (error) {
        console.error('Error applying credits:', error);
      }

      const finalCharge = remainingUsage;

      // Record the usage event
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.functions.invoke('record-usage-event', {
          body: {
            userId: session.user.id,
            eventName,
            value,
            metadata: {
              ...metadata,
              customer_id: customerId,
              original_cost: totalCost.toString(),
              credits_applied: appliedAmount.toString(),
              final_charge: finalCharge.toString(),
              currency
            }
          }
        });
      }

      return {
        totalCost,
        appliedCredits: appliedAmount,
        finalCharge
      };
    } catch (error: any) {
      console.error('Error recording usage with credits:', error);
      return {
        totalCost: 0,
        appliedCredits: 0,
        finalCharge: 0,
        error: error.message
      };
    }
  }
}

export const billingCreditsService = new BillingCreditsService();
