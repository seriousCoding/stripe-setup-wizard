
import React from 'react';
import { Button } from '@/components/ui/button';

const BillingModelTypeTabs = () => {
  return (
    <div className="flex space-x-1 bg-muted p-1 rounded-lg">
      <Button variant="secondary" size="sm" className="flex-1">
        💰 Pay As You Go
      </Button>
      <Button variant="ghost" size="sm" className="flex-1">
        🔄 Flat Recurring
      </Button>
      <Button variant="ghost" size="sm" className="flex-1">
        ⚡ Fixed Fee & Overage
      </Button>
      <Button variant="ghost" size="sm" className="flex-1">
        💺 Per Seat
      </Button>
    </div>
  );
};

export default BillingModelTypeTabs;
