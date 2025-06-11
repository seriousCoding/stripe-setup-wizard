
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StripeConnectionStatus = () => {
  return (
    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center space-x-2">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <span className="text-green-700 font-medium">Stripe Connected</span>
      </div>
      <Button variant="outline" size="sm">
        Disconnect Stripe
      </Button>
    </div>
  );
};

export default StripeConnectionStatus;
