
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, DollarSign, Zap } from 'lucide-react';

interface BillingModelAnalyzerProps {
  analyzedData: any[];
  onModelSelect: (modelType: string) => void;
}

const BillingModelAnalyzer = ({ analyzedData, onModelSelect }: BillingModelAnalyzerProps) => {
  const analyzeModelType = () => {
    const types = analyzedData.map(item => item.type);
    const hasMetered = types.includes('metered');
    const hasRecurring = types.includes('recurring');
    const hasOneTime = types.includes('one-time');
    
    if (hasMetered && !hasRecurring) return 'pay-as-you-go';
    if (hasRecurring && !hasMetered) return 'flat-recurring';
    if (hasRecurring && hasMetered) return 'fixed-overage';
    return 'custom';
  };

  const modelType = analyzeModelType();
  
  const recommendations = [
    {
      type: 'pay-as-you-go',
      title: 'Pay As You Go',
      description: 'Perfect for usage-based pricing',
      icon: Zap,
      confidence: modelType === 'pay-as-you-go' ? 95 : 60,
      recommended: modelType === 'pay-as-you-go',
      features: ['Metered billing', 'Usage tracking', 'Flexible pricing']
    },
    {
      type: 'flat-recurring',
      title: 'Flat Recurring',
      description: 'Subscription-based model',
      icon: Users,
      confidence: modelType === 'flat-recurring' ? 90 : 45,
      recommended: modelType === 'flat-recurring',
      features: ['Monthly/yearly billing', 'Predictable revenue', 'Simple setup']
    },
    {
      type: 'fixed-overage',
      title: 'Fixed + Overage',
      description: 'Base fee plus usage charges',
      icon: DollarSign,
      confidence: modelType === 'fixed-overage' ? 85 : 30,
      recommended: modelType === 'fixed-overage',
      features: ['Base subscription', 'Usage overages', 'Hybrid model']
    }
  ];

  const totalRevenue = analyzedData.reduce((sum, item) => sum + item.price, 0);
  const meteredItems = analyzedData.filter(item => item.type === 'metered').length;
  const recurringItems = analyzedData.filter(item => item.type === 'recurring').length;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Data Analysis Results</span>
          </CardTitle>
          <CardDescription>
            We've analyzed your {analyzedData.length} billing items and found the optimal model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analyzedData.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{meteredItems}</div>
              <div className="text-sm text-gray-600">Metered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{recurringItems}</div>
              <div className="text-sm text-gray-600">Recurring</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">${totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Est. Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <Card 
            key={rec.type} 
            className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${
              rec.recommended ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
            }`}
            onClick={() => onModelSelect(rec.type)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <rec.icon className={`h-6 w-6 ${rec.recommended ? 'text-blue-600' : 'text-gray-600'}`} />
                <div className="flex items-center space-x-2">
                  <Badge variant={rec.recommended ? "default" : "secondary"}>
                    {rec.confidence}% match
                  </Badge>
                  {rec.recommended && (
                    <Badge className="bg-green-100 text-green-800">Recommended</Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-lg">{rec.title}</CardTitle>
              <CardDescription>{rec.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {rec.features.map((feature, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                variant={rec.recommended ? "default" : "outline"}
                className="w-full mt-4"
                onClick={() => onModelSelect(rec.type)}
              >
                Select This Model
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detected Items Preview</CardTitle>
          <CardDescription>
            Here's what we found in your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {analyzedData.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <span className="font-medium">{item.product}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {item.type}
                  </Badge>
                </div>
                <div className="text-sm font-medium">
                  ${item.price} {item.currency}
                  {item.interval && <span className="text-gray-500">/{item.interval}</span>}
                </div>
              </div>
            ))}
            {analyzedData.length > 10 && (
              <div className="text-center text-sm text-gray-500 py-2">
                +{analyzedData.length - 10} more items...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingModelAnalyzer;
