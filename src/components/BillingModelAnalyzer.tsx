
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Zap, Calendar, Users, CheckCircle, ArrowRight } from 'lucide-react';

interface AnalyzedData {
  product: string;
  price: number;
  currency: string;
  type: 'metered' | 'recurring' | 'one-time';
  interval?: string;
  eventName?: string;
  description?: string;
}

interface BillingModelRecommendation {
  modelType: 'pay-as-you-go' | 'flat-recurring' | 'fixed-overage' | 'per-seat';
  confidence: number;
  reason: string;
  icon: React.ComponentType<any>;
  suggestedStructure: string;
  estimatedRevenue: string;
}

interface BillingModelAnalyzerProps {
  analyzedData: AnalyzedData[];
  onModelSelect: (modelType: string) => void;
}

const BillingModelAnalyzer = ({ analyzedData, onModelSelect }: BillingModelAnalyzerProps) => {
  const analyzeDataForBillingModel = (): BillingModelRecommendation => {
    const meteredItems = analyzedData.filter(item => item.type === 'metered').length;
    const recurringItems = analyzedData.filter(item => item.type === 'recurring').length;
    const totalItems = analyzedData.length;
    
    // Calculate average price
    const avgPrice = analyzedData.reduce((sum, item) => sum + item.price, 0) / totalItems;
    
    // Analyze patterns
    if (meteredItems / totalItems > 0.7) {
      return {
        modelType: 'pay-as-you-go',
        confidence: 95,
        reason: 'Your data shows primarily usage-based pricing items, perfect for pay-as-you-go billing',
        icon: Zap,
        suggestedStructure: `${meteredItems} metered services with average $${avgPrice.toFixed(3)} per unit`,
        estimatedRevenue: `$${(avgPrice * 1000).toFixed(0)} - $${(avgPrice * 10000).toFixed(0)}/month`
      };
    } else if (recurringItems / totalItems > 0.8) {
      return {
        modelType: 'flat-recurring',
        confidence: 90,
        reason: 'Your data contains mostly subscription-based pricing, ideal for recurring billing',
        icon: Calendar,
        suggestedStructure: `${recurringItems} subscription tiers starting at $${Math.min(...analyzedData.map(i => i.price)).toFixed(2)}/month`,
        estimatedRevenue: `$${(avgPrice * 100).toFixed(0)} - $${(avgPrice * 500).toFixed(0)}/month`
      };
    } else if (meteredItems > 0 && recurringItems > 0) {
      return {
        modelType: 'fixed-overage',
        confidence: 85,
        reason: 'Mixed pricing structure detected - combine base subscription with usage overages',
        icon: TrendingUp,
        suggestedStructure: `Base plan + ${meteredItems} metered overages`,
        estimatedRevenue: `$${(avgPrice * 200).toFixed(0)} - $${(avgPrice * 1500).toFixed(0)}/month`
      };
    } else {
      return {
        modelType: 'per-seat',
        confidence: 75,
        reason: 'Consider per-seat pricing for team-based products',
        icon: Users,
        suggestedStructure: `Per-user pricing at $${avgPrice.toFixed(2)}/seat/month`,
        estimatedRevenue: `$${(avgPrice * 50).toFixed(0)} - $${(avgPrice * 500).toFixed(0)}/month`
      };
    }
  };

  const recommendation = analyzeDataForBillingModel();
  const RecommendedIcon = recommendation.icon;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <RecommendedIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Recommended Billing Model</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  {recommendation.confidence}% Match
                </Badge>
              </CardTitle>
              <CardDescription className="text-indigo-700">
                Based on analysis of {analyzedData.length} pricing items
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white/60 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium capitalize">
                {recommendation.modelType.replace('-', ' ')} Model
              </span>
            </div>
            <p className="text-sm text-gray-600">{recommendation.reason}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">Structure:</span>
                <p className="text-gray-600">{recommendation.suggestedStructure}</p>
              </div>
              <div>
                <span className="font-medium">Est. Revenue:</span>
                <p className="text-gray-600">{recommendation.estimatedRevenue}</p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => onModelSelect(recommendation.modelType)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Use This Model
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Analysis Summary</CardTitle>
          <CardDescription>Breakdown of your uploaded pricing data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analyzedData.length}</div>
              <div className="text-sm text-blue-600">Total Items</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analyzedData.filter(item => item.type === 'metered').length}
              </div>
              <div className="text-sm text-green-600">Metered</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {analyzedData.filter(item => item.type === 'recurring').length}
              </div>
              <div className="text-sm text-purple-600">Recurring</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                ${(analyzedData.reduce((sum, item) => sum + item.price, 0) / analyzedData.length).toFixed(2)}
              </div>
              <div className="text-sm text-orange-600">Avg Price</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Detected Items:</h4>
            {analyzedData.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{item.product}</span>
                <div className="flex items-center space-x-2">
                  <Badge variant={item.type === 'metered' ? 'default' : 'secondary'}>
                    {item.type}
                  </Badge>
                  <span className="text-sm font-medium">
                    ${item.price} {item.currency}
                  </span>
                </div>
              </div>
            ))}
            {analyzedData.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                +{analyzedData.length - 5} more items...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingModelAnalyzer;
