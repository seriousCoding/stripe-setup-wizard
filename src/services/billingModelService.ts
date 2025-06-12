
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

  // Enhanced AI-powered data analysis and recommendations
  analyzeDataAndRecommend(rawData: any[]): {
    recommendedModel: string;
    confidence: number;
    reasoning: string;
    optimizedItems: any[];
    detectedPatterns: string[];
    suggestedMeteringStrategy: string;
  } {
    const analysis = this.performAdvancedAIAnalysis(rawData);
    return {
      recommendedModel: analysis.modelType,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      optimizedItems: analysis.optimizedItems,
      detectedPatterns: analysis.detectedPatterns,
      suggestedMeteringStrategy: analysis.meteringStrategy
    };
  }

  private performAdvancedAIAnalysis(data: any[]): any {
    console.log('Performing AI analysis on data:', data);

    // Extract and analyze pricing patterns
    const prices = data.map(item => {
      const priceField = item.price || item.amount || item['Per Unit Rate (USD)'] || item.unit_amount || 0;
      return typeof priceField === 'string' ? 
        parseFloat(priceField.replace(/[$,]/g, '')) : parseFloat(priceField) || 0;
    });
    
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceVariance = this.calculateVariance(prices);
    
    // Analyze product/service types and naming patterns
    const products = data.map(item => 
      (item.product || item.name || item['Metric Description'] || '').toLowerCase()
    );
    
    // Detect usage-based indicators
    const usageIndicators = [
      'api', 'call', 'request', 'transaction', 'usage', 'storage', 'bandwidth', 
      'processing', 'compute', 'cpu', 'memory', 'gb', 'mb', 'hour', 'minute',
      'backup', 'transfer', 'network', 'execution', 'job', 'query'
    ];
    
    const meteredKeywords = products.filter(p => 
      usageIndicators.some(indicator => p.includes(indicator))
    ).length;
    
    // Detect subscription indicators
    const subscriptionIndicators = ['plan', 'subscription', 'monthly', 'yearly', 'tier', 'package'];
    const subscriptionKeywords = products.filter(p => 
      subscriptionIndicators.some(indicator => p.includes(indicator))
    ).length;

    // Analyze unit patterns
    const units = data.map(item => (item.Unit || item.unit || '').toLowerCase());
    const timeBasedUnits = units.filter(u => 
      u.includes('hour') || u.includes('day') || u.includes('month') || u.includes('minute')
    ).length;
    
    const volumeBasedUnits = units.filter(u => 
      u.includes('gb') || u.includes('mb') || u.includes('request') || u.includes('call')
    ).length;

    // Detect if data has meter names (strong indicator of metered billing)
    const hasMeterNames = data.some(item => 
      item['Meter Name'] || item.meter_name || item.event_name
    );

    // Determine optimal billing model
    let modelType = 'pay-as-you-go';
    let confidence = 70;
    let reasoning = 'Default recommendation based on common patterns.';
    let meteringStrategy = 'usage-based';
    const detectedPatterns: string[] = [];
    
    // Analysis logic
    if (hasMeterNames || meteredKeywords / data.length > 0.7) {
      modelType = 'pay-as-you-go';
      confidence = 95;
      reasoning = 'Strong indicators of metered billing detected: meter names, usage-based terminology, and micro-pricing patterns.';
      meteringStrategy = 'pure-usage-based';
      detectedPatterns.push('Meter names detected', 'Usage-based terminology prevalent', 'Micro-pricing structure');
    } else if (subscriptionKeywords / data.length > 0.6 && avgPrice > 10) {
      if (meteredKeywords > 0) {
        modelType = 'fixed-overage';
        confidence = 90;
        reasoning = 'Hybrid model detected: subscription plans with usage components. Perfect for base fee + overages.';
        meteringStrategy = 'base-plus-usage';
        detectedPatterns.push('Subscription plans detected', 'Usage components present', 'Hybrid pricing structure');
      } else {
        modelType = 'flat-recurring';
        confidence = 88;
        reasoning = 'Subscription-based products with fixed pricing detected. Ideal for predictable recurring revenue.';
        meteringStrategy = 'subscription-only';
        detectedPatterns.push('Subscription plans dominant', 'Fixed pricing structure', 'Recurring revenue model');
      }
    } else if (avgPrice < 1 && priceVariance < 0.1) {
      modelType = 'pay-as-you-go';
      confidence = 92;
      reasoning = 'Micro-pricing with low variance suggests pure usage-based billing model.';
      meteringStrategy = 'micro-usage';
      detectedPatterns.push('Micro-pricing detected', 'Low price variance', 'Usage-based pattern');
    } else if (timeBasedUnits / data.length > 0.5) {
      modelType = 'pay-as-you-go';
      confidence = 85;
      reasoning = 'Time-based units (hours, days) indicate resource consumption billing.';
      meteringStrategy = 'time-based-usage';
      detectedPatterns.push('Time-based units prevalent', 'Resource consumption model');
    }

    // Additional pattern analysis
    if (minPrice === 0 && maxPrice > 0) {
      detectedPatterns.push('Freemium pricing detected');
    }
    if (priceVariance > 1) {
      detectedPatterns.push('High price variance - multiple tiers');
    }
    if (volumeBasedUnits / data.length > 0.4) {
      detectedPatterns.push('Volume-based billing components');
    }

    // Optimize items for Stripe format with enhanced intelligence
    const optimizedItems = data.map((item, index) => {
      const price = prices[index];
      const productName = item.product || item.name || item['Metric Description'] || `Service ${index + 1}`;
      const meterName = item['Meter Name'] || item.meter_name;
      const unit = item.Unit || item.unit;
      
      const optimizedItem = {
        id: `item_${index}`,
        product: productName,
        unit_amount: Math.round(price * 100), // Convert to cents
        currency: (item.currency || 'usd').toLowerCase(),
        type: this.intelligentTypeDetection(item, price, productName),
        interval: this.determineInterval(item),
        eventName: meterName || this.generateIntelligentEventName(productName),
        description: item.description || item['Metric Description'] || `${productName} - AI optimized for Stripe`,
        billing_scheme: 'per_unit',
        usage_type: this.intelligentTypeDetection(item, price, productName) === 'metered' ? 'metered' : undefined,
        aggregate_usage: this.intelligentTypeDetection(item, price, productName) === 'metered' ? 'sum' : undefined,
        metadata: {
          ai_optimized: 'true',
          original_price: price.toString(),
          confidence_score: confidence.toString(),
          detected_patterns: detectedPatterns.join(', '),
          unit_type: unit || 'units',
          meter_name: meterName || '',
          billing_strategy: meteringStrategy
        }
      };

      // Add Stripe-specific enhancements
      if (optimizedItem.type === 'metered') {
        optimizedItem.metadata.meter_aggregation = this.determineAggregation(unit);
        optimizedItem.metadata.pricing_tier = this.determinePricingTier(price);
      }

      return optimizedItem;
    });

    return {
      modelType,
      confidence,
      reasoning,
      optimizedItems,
      detectedPatterns,
      meteringStrategy,
      priceAnalysis: {
        avgPrice,
        minPrice,
        maxPrice,
        priceVariance
      }
    };
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  private intelligentTypeDetection(item: any, price: number, productName: string): 'metered' | 'recurring' | 'one_time' {
    const productStr = productName.toLowerCase();
    const typeStr = (item.type || '').toLowerCase();
    
    // Explicit type indicators
    if (typeStr.includes('metered') || typeStr.includes('usage')) return 'metered';
    if (typeStr.includes('recurring') || typeStr.includes('subscription')) return 'recurring';
    
    // Meter name presence is strong indicator
    if (item['Meter Name'] || item.meter_name) return 'metered';
    
    // Unit-based detection
    const unit = (item.Unit || item.unit || '').toLowerCase();
    if (unit.includes('hour') || unit.includes('gb') || unit.includes('request') || 
        unit.includes('call') || unit.includes('job') || unit.includes('day')) {
      return 'metered';
    }
    
    // Product-based analysis with enhanced patterns
    const usagePatterns = [
      'api', 'call', 'request', 'storage', 'bandwidth', 'processing', 
      'compute', 'cpu', 'memory', 'backup', 'transfer', 'network',
      'execution', 'job', 'query', 'transaction', 'usage'
    ];
    
    if (usagePatterns.some(pattern => productStr.includes(pattern)) || price < 1) {
      return 'metered';
    }
    
    if (productStr.includes('plan') || productStr.includes('subscription') || 
        productStr.includes('monthly') || productStr.includes('yearly')) {
      return 'recurring';
    }
    
    // Price-based intelligence
    return price >= 10 ? 'recurring' : 'metered';
  }

  private determineAggregation(unit: string): string {
    if (!unit) return 'sum';
    unit = unit.toLowerCase();
    
    if (unit.includes('max') || unit.includes('peak')) return 'max';
    if (unit.includes('last') || unit.includes('current')) return 'last_during_period';
    return 'sum';
  }

  private determinePricingTier(price: number): string {
    if (price < 0.01) return 'micro';
    if (price < 1) return 'small';
    if (price < 10) return 'medium';
    return 'large';
  }

  private determineInterval(item: any): string | undefined {
    const intervalStr = (item.interval || '').toLowerCase();
    const descStr = (item.description || item['Metric Description'] || '').toLowerCase();
    
    if (intervalStr.includes('month') || descStr.includes('monthly')) return 'month';
    if (intervalStr.includes('year') || descStr.includes('yearly')) return 'year';
    if (intervalStr.includes('week') || descStr.includes('weekly')) return 'week';
    
    return undefined;
  }

  private generateIntelligentEventName(productName: string): string {
    // Enhanced event name generation with intelligent cleanup
    return productName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .substring(0, 50); // Stripe event name length limit
  }
}

export const billingModelService = new BillingModelService();
