
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';

const PerSeatForm = () => {
  const [productName, setProductName] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [billingInterval, setBillingInterval] = useState('Monthly');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating Per Seat Model:', {
      productName,
      pricePerSeat,
      currency,
      billingInterval
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Per Seat Model</CardTitle>
        <CardDescription>
          Charge a recurring fee for each user or "seat". Requires Stripe connection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Name</label>
            <Input
              placeholder="e.g., Team Plan"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price Per Seat</label>
              <Input
                placeholder="e.g., 15.00"
                value={pricePerSeat}
                onChange={(e) => setPricePerSeat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Billing Interval</label>
            <Select value={billingInterval} onValueChange={setBillingInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              This creates a recurring price where the quantity during subscription determines the total (e.g., 5 seats x $15/seat).
            </p>
          </div>

          <Button type="submit" className="w-full">
            Create Per Seat Model
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PerSeatForm;
