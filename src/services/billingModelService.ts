
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
        unit_amount: item.unit_amount, // Already in cents
        currency: item.currency.toLowerCase(),
        recurring: item.type === 'recurring' && item.interval ? {
          interval: item.interval
        } : null,
        billing_scheme: item.billing_scheme || 'per_unit',
        usage_type: item.usage_type,
        aggregate_usage: item.aggregate_usage,
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

  // AI-powered data analysis and recommendations
  analyzeDataAndRecommend(rawData: any[]): {
    recommendedModel: string;
    confidence: number;
    reasoning: string;
    optimizedItems: any[];
  } {
    const analysis = this.performAIAnalysis(rawData);
    return {
      recommendedModel: analysis.modelType,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      optimizedItems: analysis.optimizedItems
    };
  }

  private performAIAnalysis(data: any[]): any {
    // Analyze pricing patterns
    const prices = data.map(item => parseFloat(item.price || item.amount || item.unit_amount || 0));
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Analyze product types
    const products = data.map(item => (item.product || item.name || '').toLowerCase());
    const hasApiLike = products.some(p => p.includes('api') || p.includes('call') || p.includes('request'));
    const hasStorage = products.some(p => p.includes('storage') || p.includes('bandwidth'));
    const hasSubscription = products.some(p => p.includes('plan') || p.includes('subscription'));
    
    // Determine optimal billing model
    let modelType = 'pay-as-you-go';
    let confidence = 70;
    let reasoning = 'Default recommendation based on common usage patterns.';
    
    if (hasSubscription && avgPrice > 10) {
      modelType = 'flat-recurring';
      confidence = 90;
      reasoning = 'Detected subscription-based products with higher price points, ideal for recurring billing.';
    } else if (hasApiLike || hasStorage || avgPrice < 1) {
      modelType = 'pay-as-you-go';
      confidence = 95;
      reasoning = 'Detected usage-based services (API calls, storage) with micro-pricing, perfect for metered billing.';
    } else if (hasSubscription && (hasApiLike || hasStorage)) {
      modelType = 'fixed-overage';
      confidence = 85;
      reasoning = 'Combination of base subscription and usage-based components detected.';
    }

    // Optimize items for Stripe format
    const optimizedItems = data.map((item, index) => {
      const price = parseFloat(item.price || item.amount || item.unit_amount || 0);
      const productName = item.product || item.name || `Service ${index + 1}`;
      
      return {
        id: `item_${index}`,
        product: productName,
        unit_amount: Math.round(price * 100), // Convert to cents
        currency: (item.currency || 'usd').toLowerCase(),
        type: this.determineBillingType(item, price),
        interval: this.determineInterval(item),
        eventName: this.generateEventName(productName),
        description: item.description || `${productName} - optimized for Stripe`,
        billing_scheme: 'per_unit',
        usage_type: this.determineBillingType(item, price) === 'metered' ? 'metered' : undefined,
        aggregate_usage: this.determineBillingType(item, price) === 'metered' ? 'sum' : undefined,
        metadata: {
          ai_optimized: 'true',
          original_price: price.toString(),
          confidence_score: confidence.toString()
        }
      };
    });

    return {
      modelType,
      confidence,
      reasoning,
      optimizedItems
    };
  }

  private determineBillingType(item: any, price: number): 'metered' | 'recurring' | 'one_time' {
    const productStr = (item.product || item.name || '').toLowerCase();
    const typeStr = (item.type || '').toLowerCase();
    
    // Explicit type indicators
    if (typeStr.includes('metered') || typeStr.includes('usage')) return 'metered';
    if (typeStr.includes('recurring') || typeStr.includes('subscription')) return 'recurring';
    
    // Product-based analysis
    if (productStr.includes('api') || productStr.includes('call') || 
        productStr.includes('storage') || productStr.includes('bandwidth') ||
        productStr.includes('processing') || price < 1) {
      return 'metered';
    }
    
    if (productStr.includes('plan') || productStr.includes('subscription') || 
        productStr.includes('monthly') || productStr.includes('yearly')) {
      return 'recurring';
    }
    
    return price >= 10 ? 'recurring' : 'metered';
  }

  private determineInterval(item: any): string | undefined {
    const intervalStr = (item.interval || '').toLowerCase();
    const descStr = (item.description || '').toLowerCase();
    
    if (intervalStr.includes('month') || descStr.includes('monthly')) return 'month';
    if (intervalStr.includes('year') || descStr.includes('yearly')) return 'year';
    if (intervalStr.includes('week') || descStr.includes('weekly')) return 'week';
    
    return undefined;
  }

  private generateEventName(productName: string): string {
    return productName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }
}

export const billingModelService = new BillingModelService();
