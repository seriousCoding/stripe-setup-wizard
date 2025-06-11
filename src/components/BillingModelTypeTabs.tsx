
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface BillingModelTypeTabsProps {
  onTabChange?: (value: string) => void;
  defaultValue?: string;
}

const BillingModelTypeTabs = ({ onTabChange, defaultValue = "pay-as-you-go" }: BillingModelTypeTabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onTabChange?.(value);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="pay-as-you-go" className="flex items-center space-x-2">
          <span>💰</span>
          <span className="hidden sm:inline">Pay As You Go</span>
          <span className="sm:hidden">PAYG</span>
        </TabsTrigger>
        <TabsTrigger value="flat-recurring" className="flex items-center space-x-2">
          <span>🔄</span>
          <span className="hidden sm:inline">Flat Recurring</span>
          <span className="sm:hidden">Flat</span>
        </TabsTrigger>
        <TabsTrigger value="fixed-overage" className="flex items-center space-x-2">
          <span>⚡</span>
          <span className="hidden sm:inline">Fixed Fee & Overage</span>
          <span className="sm:hidden">Fixed+</span>
        </TabsTrigger>
        <TabsTrigger value="per-seat" className="flex items-center space-x-2">
          <span>💺</span>
          <span className="hidden sm:inline">Per Seat</span>
          <span className="sm:hidden">Seat</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="pay-as-you-go" className="mt-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-muted-foreground">Pay As You Go billing model selected</p>
        </div>
      </TabsContent>
      
      <TabsContent value="flat-recurring" className="mt-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-muted-foreground">Flat Recurring billing model selected</p>
        </div>
      </TabsContent>
      
      <TabsContent value="fixed-overage" className="mt-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-muted-foreground">Fixed Fee & Overage billing model selected</p>
        </div>
      </TabsContent>
      
      <TabsContent value="per-seat" className="mt-4">
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-muted-foreground">Per Seat billing model selected</p>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default BillingModelTypeTabs;
