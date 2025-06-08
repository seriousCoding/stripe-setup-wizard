
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Zap, Calendar, TrendingUp } from 'lucide-react';

interface BillingModel {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  popular?: boolean;
  features: string[];
}

const billingModels: BillingModel[] = [
  {
    id: 'pay-as-you-go',
    name: 'Pay As You Go',
    description: 'Charge customers based on actual usage with metered billing',
    icon: Zap,
    popular: true,
    features: ['Usage-based pricing', 'Multiple meter types', 'Real-time tracking', 'Overage protection']
  },
  {
    id: 'flat-recurring',
    name: 'Flat Recurring Fee',
    description: 'Simple monthly or yearly subscription with fixed pricing',
    icon: Calendar,
    features: ['Monthly/Yearly billing', 'Fixed pricing', 'Easy setup', 'Predictable revenue']
  },
  {
    id: 'fixed-overage',
    name: 'Fixed Fee + Overage',
    description: 'Base subscription with included usage plus metered overages',
    icon: TrendingUp,
    popular: true,
    features: ['Base subscription', 'Included usage', 'Overage billing', 'Hybrid model']
  }
];

interface BillingModelSelectorProps {
  onSelect: (modelId: string) => void;
  selectedModel?: string;
}

const BillingModelSelector = ({ onSelect, selectedModel }: BillingModelSelectorProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Billing Model</h3>
        <p className="text-muted-foreground">
          Select the pricing structure that best fits your business model
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {billingModels.map((model) => (
          <Card 
            key={model.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedModel === model.id 
                ? 'ring-2 ring-indigo-500 border-indigo-200' 
                : 'hover:border-indigo-200'
            }`}
            onClick={() => onSelect(model.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                    <model.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    {model.popular && (
                      <Badge className="mt-1 bg-gradient-to-r from-indigo-600 to-purple-600">
                        Popular
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">{model.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {model.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm">
                    <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full"></div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full mt-4 ${
                  selectedModel === model.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                    : 'bg-gradient-to-r from-gray-600 to-gray-700'
                }`}
                variant={selectedModel === model.id ? 'default' : 'secondary'}
              >
                {selectedModel === model.id ? 'Selected' : 'Choose This Model'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BillingModelSelector;
