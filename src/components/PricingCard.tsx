
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { StripePricingTier } from '@/hooks/useStripePricing';

interface PricingCardProps {
  tier: StripePricingTier;
  onSelectPlan: (tierId: string) => void;
  isLoading?: boolean;
  isCurrentPlan?: boolean;
  isSubscribedToAnyPlan?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ 
  tier, 
  onSelectPlan, 
  isLoading, 
  isCurrentPlan,
  isSubscribedToAnyPlan
}) => {
  const formatPrice = () => {
    if (tier.price === 0 && tier.id === 'trial') return 'Free';
    if (tier.price === 0) return '$0';
    return `$${tier.price}`;
  };

  const getPriceSubtext = () => {
    if (tier.price === 0 && tier.id === 'trial') return '14 days free trial';
    if (tier.isMonthly) return 'per month';
    if (tier.id === 'starter') return 'per month + overages';
    if (tier.id === 'professional') return 'per month + overages';
    if (tier.id === 'enterprise') return 'per user/month';
    return tier.currency ? `one-time` : '';
  };

  let buttonText = tier.buttonText;
  let buttonDisabled = isLoading;
  let cardClassName = `relative h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-2 shadow-lg`;

  if (isCurrentPlan) {
    buttonText = 'Current Plan';
    buttonDisabled = true;
    cardClassName += ' border-2 border-green-500 shadow-green-500/30';
  } else if (tier.popular) {
    cardClassName += ' border-2 border-blue-500 bg-gray-800 shadow-blue-500/20';
  } else {
    cardClassName += ' border border-gray-700 bg-gray-800';
  }

  if (isSubscribedToAnyPlan && !isCurrentPlan && tier.price === 0 && tier.id === 'trial') {
    buttonText = 'Unavailable';
    buttonDisabled = true;
  }

  return (
    <Card className={cardClassName}>
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 z-10">
          <Badge className="bg-green-600 text-white shadow-lg flex items-center">
            <Star className="h-3 w-3 mr-1" />
            Active Plan
          </Badge>
        </div>
      )}
      {tier.badge && !isCurrentPlan && (
        <div className={`absolute -top-3 ${tier.popular ? 'left-4' : 'left-1/2 transform -translate-x-1/2'} z-10`}>
          <Badge className={`${
            tier.badge === 'Free Trial' ? 'bg-green-600' : tier.popular ? 'bg-blue-600' : 'bg-purple-600'
          } text-white shadow-lg`}>
            {tier.badge}
          </Badge>
        </div>
      )}
      {tier.popular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <Badge className="bg-blue-600 text-white shadow-lg">Most Popular</Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <div className="text-2xl">{tier.icon || '📦'}</div>
          <CardTitle className="text-xl font-semibold text-white">{tier.name}</CardTitle>
        </div>
        <p className="text-gray-400 text-sm mb-6 h-10 overflow-hidden">{tier.description}</p>
        
        <div className="mb-4">
          <div className="text-4xl font-bold text-blue-400 mb-1">{formatPrice()}</div>
          <div className="text-gray-400 text-sm">{getPriceSubtext()}</div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-6">
        <div className="space-y-3 flex-1">
          {tier.features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
              <span className="text-sm text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
        
        {tier.usageLimits && tier.usageLimits.length > 0 && (
          <div className="bg-gray-700/50 rounded-lg p-4 shadow-inner">
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
          className={`w-full mt-auto transition-all duration-200 hover:shadow-lg hover:scale-105 shadow-md ${
            isCurrentPlan 
              ? 'bg-gray-500 text-gray-700 hover:bg-gray-500 cursor-not-allowed' // Changed to grey for current plan
              : tier.popular
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          onClick={() => onSelectPlan(tier.id)}
          disabled={buttonDisabled}
        >
          {isLoading ? 'Processing...' : buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PricingCard;
