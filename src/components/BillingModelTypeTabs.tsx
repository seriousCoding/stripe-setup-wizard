
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tabs.map((tab) => (
          <div
            key={tab.value}
            className={`p-4 border rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === tab.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onTabChange(tab.value)}
          >
            <div className="flex items-center space-x-2 mb-2">
              <tab.icon className={`h-5 w-5 ${
                activeTab === tab.value ? 'text-blue-600' : 'text-gray-600'
              }`} />
              <h3 className="font-medium">{tab.label}</h3>
            </div>
            <p className="text-sm text-gray-600">{tab.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillingModelTypeTabs;
