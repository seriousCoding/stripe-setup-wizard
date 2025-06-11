
import { supabase } from '@/integrations/supabase/client';
import { BillingModel, BillingItem } from './stripeService';

export class BillingModelService {
  async saveBillingModel(model: Omit<BillingModel, 'id' | 'created_at' | 'user_id'>): Promise<{ model?: BillingModel; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'Not authenticated' };
      }

      const billingModel: BillingModel = {
        id: `bm_${Date.now()}`,
        created_at: new Date().toISOString(),
        user_id: session.user.id,
        ...model
      };

      // Store in localStorage for now (in a real app, you'd save to Supabase)
      const existingModels = this.getStoredModels();
      const updatedModels = [...existingModels, billingModel];
      localStorage.setItem('billing_models', JSON.stringify(updatedModels));

      console.log('Saved billing model:', billingModel);
      return { model: billingModel };
    } catch (error: any) {
      console.error('Error saving billing model:', error);
      return { error: error.message };
    }
  }

  async getBillingModels(): Promise<{ models?: BillingModel[]; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'Not authenticated' };
      }

      const models = this.getStoredModels().filter(
        model => model.user_id === session.user.id
      );

      return { models };
    } catch (error: any) {
      console.error('Error getting billing models:', error);
      return { error: error.message };
    }
  }

  async deleteBillingModel(modelId: string): Promise<{ error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: 'Not authenticated' };
      }

      const existingModels = this.getStoredModels();
      const updatedModels = existingModels.filter(
        model => model.id !== modelId || model.user_id !== session.user.id
      );
      localStorage.setItem('billing_models', JSON.stringify(updatedModels));

      return {};
    } catch (error: any) {
      console.error('Error deleting billing model:', error);
      return { error: error.message };
    }
  }

  private getStoredModels(): BillingModel[] {
    try {
      const stored = localStorage.getItem('billing_models');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  generateStripeConfiguration(model: Pick<BillingModel, 'items'>): any {
    const config = {
      products: model.items.map(item => ({
        name: item.product,
        description: item.description || `${item.product} - ${item.type} billing`,
        type: item.type === 'metered' ? 'service' : 'good',
        metadata: {
          eventName: item.eventName || item.product.toLowerCase().replace(/\s+/g, '_'),
          billingType: item.type
        }
      })),
      prices: model.items.map(item => ({
        unit_amount: Math.round(item.price * 100), // Convert to cents
        currency: item.currency.toLowerCase(),
        recurring: item.type === 'recurring' && item.interval ? {
          interval: item.interval
        } : null,
        billing_scheme: item.type === 'metered' ? 'per_unit' : 'per_unit',
        metadata: {
          eventName: item.eventName,
          description: item.description
        }
      })),
      meters: model.items
        .filter(item => item.type === 'metered')
        .map(item => ({
          display_name: item.product,
          event_name: item.eventName || item.product.toLowerCase().replace(/\s+/g, '_')
        }))
    };

    return config;
  }
}

export const billingModelService = new BillingModelService();
