
export interface ParsedData {
  structure: 'metered_services' | 'subscription_plans' | 'mixed' | 'unknown';
  confidence: number;
  items: any[];
  metadata: {
    detectedColumns: string[];
    suggestedBillingModel: string;
    patterns: string[];
  };
}

export class AIParsingService {
  parseData(rawData: any[], format: 'csv' | 'json' | 'xml' | 'text' = 'csv'): ParsedData {
    console.log('AI parsing data:', { rawData, format });

    if (!rawData || rawData.length === 0) {
      return {
        structure: 'unknown',
        confidence: 0,
        items: [],
        metadata: {
          detectedColumns: [],
          suggestedBillingModel: 'pay-as-you-go',
          patterns: ['No data provided']
        }
      };
    }

    // Analyze data structure
    const firstRow = rawData[0];
    const columns = Object.keys(firstRow);
    
    // Detect metered service indicators
    const meteredIndicators = [
      'meter', 'metric', 'unit', 'rate', 'usage', 'consumption',
      'per unit', 'flat fee', 'event', 'api', 'storage', 'bandwidth',
      'cpu', 'memory', 'network', 'backup', 'processing', 'compute'
    ];

    const subscriptionIndicators = [
      'plan', 'subscription', 'monthly', 'yearly', 'tier', 'package',
      'recurring', 'interval'
    ];

    // Analyze column names
    const columnText = columns.join(' ').toLowerCase();
    const meteredScore = this.calculateScore(columnText, meteredIndicators);
    const subscriptionScore = this.calculateScore(columnText, subscriptionIndicators);

    // Analyze data content
    const contentScore = this.analyzeContent(rawData);
    
    let structure: ParsedData['structure'] = 'unknown';
    let confidence = 0;
    let suggestedModel = 'pay-as-you-go';
    const patterns: string[] = [];

    if (meteredScore > subscriptionScore && meteredScore > 0.3) {
      structure = 'metered_services';
      confidence = Math.min(90, meteredScore * 100 + contentScore.metered);
      suggestedModel = 'pay-as-you-go';
      patterns.push('Metered billing structure detected');
    } else if (subscriptionScore > 0.3) {
      structure = 'subscription_plans';
      confidence = Math.min(85, subscriptionScore * 100 + contentScore.subscription);
      suggestedModel = 'flat-recurring';
      patterns.push('Subscription billing structure detected');
    } else if (meteredScore > 0.1 && subscriptionScore > 0.1) {
      structure = 'mixed';
      confidence = 75;
      suggestedModel = 'fixed-overage';
      patterns.push('Mixed billing model detected');
    }

    // Add detected patterns
    if (this.hasMeters(columns)) patterns.push('Meter names detected');
    if (this.hasPricing(columns)) patterns.push('Pricing information found');
    if (this.hasUsageUnits(columns)) patterns.push('Usage units identified');

    const items = this.transformToStandardFormat(rawData, structure);

    return {
      structure,
      confidence,
      items,
      metadata: {
        detectedColumns: columns,
        suggestedBillingModel: suggestedModel,
        patterns
      }
    };
  }

  private calculateScore(text: string, indicators: string[]): number {
    let score = 0;
    let matches = 0;
    
    indicators.forEach(indicator => {
      if (text.includes(indicator)) {
        matches++;
        score += 1;
      }
    });

    return matches > 0 ? score / indicators.length : 0;
  }

  private analyzeContent(data: any[]): { metered: number; subscription: number } {
    let meteredScore = 0;
    let subscriptionScore = 0;

    data.forEach(row => {
      const values = Object.values(row).join(' ').toLowerCase();
      
      // Check for micro-pricing (indicators of metered billing)
      const priceMatch = values.match(/\$?(\d+\.?\d*)/g);
      if (priceMatch) {
        const prices = priceMatch.map(p => parseFloat(p.replace('$', '')));
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        if (avgPrice < 1) meteredScore += 10;
        if (avgPrice > 10) subscriptionScore += 10;
      }

      // Check for unit indicators
      if (values.includes('hour') || values.includes('gb') || values.includes('request')) {
        meteredScore += 5;
      }
      
      if (values.includes('month') || values.includes('year') || values.includes('plan')) {
        subscriptionScore += 5;
      }
    });

    return { metered: meteredScore, subscription: subscriptionScore };
  }

  private hasMeters(columns: string[]): boolean {
    return columns.some(col => 
      col.toLowerCase().includes('meter') || 
      col.toLowerCase().includes('event')
    );
  }

  private hasPricing(columns: string[]): boolean {
    return columns.some(col => 
      col.toLowerCase().includes('rate') || 
      col.toLowerCase().includes('price') ||
      col.toLowerCase().includes('cost') ||
      col.toLowerCase().includes('fee')
    );
  }

  private hasUsageUnits(columns: string[]): boolean {
    return columns.some(col => 
      col.toLowerCase().includes('unit') ||
      col.toLowerCase().includes('gb') ||
      col.toLowerCase().includes('hour') ||
      col.toLowerCase().includes('request')
    );
  }

  private transformToStandardFormat(data: any[], structure: ParsedData['structure']): any[] {
    return data.map((row, index) => {
      const item: any = {
        id: `item_${index}`,
        product: this.extractProductName(row, index),
        description: this.extractDescription(row),
        type: structure === 'subscription_plans' ? 'recurring' : 'metered'
      };

      // Extract pricing
      const price = this.extractPrice(row);
      item.price = price;
      item.unit_amount = Math.round(price * 100);
      item.currency = 'usd';

      // Extract meter-specific data
      if (structure === 'metered_services' || structure === 'mixed') {
        item.eventName = this.extractEventName(row, item.product);
        item.unit = this.extractUnit(row);
        item.billing_scheme = 'per_unit';
        item.usage_type = 'metered';
        item.aggregate_usage = 'sum';
      }

      // Extract subscription-specific data
      if (structure === 'subscription_plans') {
        item.interval = this.extractInterval(row);
      }

      item.metadata = {
        ai_parsed: 'true',
        original_data: JSON.stringify(row),
        structure: structure
      };

      return item;
    });
  }

  private extractProductName(row: any, index: number): string {
    const nameFields = ['name', 'product', 'metric description', 'description', 'service', 'title'];
    
    for (const field of nameFields) {
      const value = this.findFieldValue(row, field);
      if (value) return value;
    }

    return `Service ${index + 1}`;
  }

  private extractDescription(row: any): string {
    const descFields = ['description', 'metric description', 'details', 'notes'];
    
    for (const field of descFields) {
      const value = this.findFieldValue(row, field);
      if (value) return value;
    }

    return 'AI-parsed service';
  }

  private extractPrice(row: any): number {
    const priceFields = ['rate', 'price', 'cost', 'per unit rate', 'unit amount', 'amount', 'fee'];
    
    for (const field of priceFields) {
      const value = this.findFieldValue(row, field);
      if (value !== null) {
        const numValue = typeof value === 'string' ? 
          parseFloat(value.replace(/[$,]/g, '')) : 
          parseFloat(value);
        if (!isNaN(numValue)) return numValue;
      }
    }

    return 0;
  }

  private extractEventName(row: any, fallback: string): string {
    const eventFields = ['meter name', 'event name', 'meter', 'event'];
    
    for (const field of eventFields) {
      const value = this.findFieldValue(row, field);
      if (value) return value;
    }

    return fallback.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private extractUnit(row: any): string {
    const unitFields = ['unit', 'units', 'unit label'];
    
    for (const field of unitFields) {
      const value = this.findFieldValue(row, field);
      if (value) return value;
    }

    return 'units';
  }

  private extractInterval(row: any): string | undefined {
    const intervalFields = ['interval', 'billing cycle', 'period'];
    
    for (const field of intervalFields) {
      const value = this.findFieldValue(row, field);
      if (value) {
        const val = value.toLowerCase();
        if (val.includes('month')) return 'month';
        if (val.includes('year')) return 'year';
        if (val.includes('week')) return 'week';
      }
    }

    return 'month'; // default for subscription plans
  }

  private findFieldValue(row: any, fieldName: string): any {
    const keys = Object.keys(row);
    const matchingKey = keys.find(key => 
      key.toLowerCase().includes(fieldName.toLowerCase())
    );
    return matchingKey ? row[matchingKey] : null;
  }
}

export const aiParsingService = new AIParsingService();
