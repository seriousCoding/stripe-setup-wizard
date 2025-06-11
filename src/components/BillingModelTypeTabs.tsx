
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Users, DollarSign, Settings } from 'lucide-react';

interface BillingModelTypeTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BillingModelTypeTabs = ({ activeTab, onTabChange }: BillingModelTypeTabsProps) => {
  const tabs = [
    {
      value: 'pay-as-you-go',
      label: 'Pay As You Go',
      icon: Zap,
      description: 'Usage-based pricing'
    },
    {
      value: 'flat-recurring',
      label: 'Flat Recurring',
      icon: Users,
      description: 'Subscription model'
    },
    {
      value: 'fixed-overage',
      label: 'Fixed + Overage',
      icon: DollarSign,
      description: 'Base + usage fees'
    },
    {
      value: 'per-seat',
      label: 'Per Seat',
      icon: Settings,
      description: 'User-based pricing'
    }
  ];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center space-x-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          {tabs.find(tab => tab.value === activeTab)?.description}
        </p>
      </div>
    </div>
  );
};

export default BillingModelTypeTabs;
