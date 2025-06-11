
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BillingModelTypeTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

const BillingModelTypeTabs = ({ activeTab, onTabChange }: BillingModelTypeTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="pay-as-you-go" className="flex items-center gap-2">
          💰 Pay As You Go
        </TabsTrigger>
        <TabsTrigger value="flat-recurring" className="flex items-center gap-2">
          🔄 Flat Recurring
        </TabsTrigger>
        <TabsTrigger value="fixed-overage" className="flex items-center gap-2">
          ⚡ Fixed Fee & Overage
        </TabsTrigger>
        <TabsTrigger value="per-seat" className="flex items-center gap-2">
          💺 Per Seat
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default BillingModelTypeTabs;
