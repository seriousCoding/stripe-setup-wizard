
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
    if (tier.name === 'Enterprise') return 'per user/month';
    return '';
  };

  const getIcon = () => {
    switch (tier.name) {
      case 'Starter':
        return '📄';
      case 'Professional':
        return '💼';
      case 'Business':
        return '⚡';
      case 'Enterprise':
        return '👥';
      case 'Free Trial':
        return '🎁';
      default:
        return '📦';
    }
  };

  return (
    <Card className={`relative h-full flex flex-col ${
      tier.popular 
        ? 'border-2 border-blue-500 bg-gray-800 shadow-blue-500/20 shadow-lg' 
        : 'border border-gray-700 bg-gray-800'
    }`}>
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className={`${
            tier.popular ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {tier.badge}
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <div className="text-2xl">{getIcon()}</div>
          <CardTitle className="text-xl font-semibold text-white">{tier.name}</CardTitle>
        </div>
        <p className="text-gray-400 text-sm mb-6">{tier.description}</p>
        
        <div className="mb-4">
          <div className="text-4xl font-bold text-blue-400 mb-1">{formatPrice()}</div>
          <div className="text-gray-400 text-sm">{getPriceSubtext()}</div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-6">
        <div className="space-y-3 flex-1">
          {tier.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-3">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
        
        {tier.usageLimits && (
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide">
              Usage Limits
            </h4>
            <div className="space-y-2">
              {tier.usageLimits.map((limit, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-400">{limit.name}</span>
                  <span className="text-white font-medium">{limit.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Button 
          className={`w-full mt-auto ${
            tier.popular 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
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
