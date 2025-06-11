
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval?: 'month' | 'year';
  badge?: string;
  features: string[];
  usageLimits?: { name: string; value: string }[];
  buttonText: string;
  popular?: boolean;
}

interface PricingCardProps {
  tier: PricingTier;
  onSelectPlan: (tierId: string) => void;
  isLoading?: boolean;
}

const PricingCard = ({ tier, onSelectPlan, isLoading }: PricingCardProps) => {
  const formatPrice = () => {
    if (tier.price === 0) return '$0';
    return `$${tier.price}`;
  };

  const getPriceSubtext = () => {
    if (tier.price === 0) return '14 days free';
    if (tier.interval) return `per ${tier.interval}`;
    if (tier.name === 'Starter') return 'per transaction';
    if (tier.name === 'Professional') return 'prepaid credits';
    return '';
  };

  return (
    <Card className={`relative ${tier.popular ? 'border-2 border-blue-500' : 'border border-gray-700'} bg-gray-900 text-white`}>
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-600 text-white">{tier.badge}</Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <div className="w-6 h-6 bg-gray-600 rounded"></div>
          <CardTitle className="text-xl font-semibold">{tier.name}</CardTitle>
          {tier.name === 'Starter' && <span className="text-sm text-gray-400">Pay As-You-Go</span>}
          {tier.name === 'Professional' && <span className="text-sm text-gray-400">Credit Burndown</span>}
          {tier.name === 'Business' && <span className="text-sm text-gray-400">Flat Fee</span>}
          {tier.name === 'Enterprise' && <span className="text-sm text-gray-400">Per Seat</span>}
        </div>
        <p className="text-gray-400 text-sm">{tier.description}</p>
        
        <div className="mt-6">
          <div className="text-4xl font-bold text-blue-400">{formatPrice()}</div>
          <div className="text-gray-400 text-sm">{getPriceSubtext()}</div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {tier.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-3">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
        
        {tier.usageLimits && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">USAGE LIMITS</h4>
            <div className="space-y-2">
              {tier.usageLimits.map((limit, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-400">{limit.name}</span>
                  <span className="text-white">{limit.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Button 
          className={`w-full ${tier.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={() => onSelectPlan(tier.id)}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : tier.buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PricingCard;
