
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FixedOverageForm = () => {
  const [fixedPrice, setFixedPrice] = useState('');
  const [includedUnits, setIncludedUnits] = useState('');
  const [overagePrice, setOveragePrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [interval, setInterval] = useState('month');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fixed Fee & Overage</CardTitle>
          <CardDescription>
            Fixed monthly fee with additional charges for usage beyond included amount
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Fixed Fee</Label>
              <Input
                type="number"
                step="0.01"
                value={fixedPrice}
                onChange={(e) => setFixedPrice(e.target.value)}
                placeholder="99.00"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-2">
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

          <div>
            <Label className="text-sm font-medium">Billing Interval</Label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Included Units</Label>
              <Input
                type="number"
                value={includedUnits}
                onChange={(e) => setIncludedUnits(e.target.value)}
                placeholder="1000"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Overage Price</Label>
              <Input
                type="number"
                step="0.0001"
                value={overagePrice}
                onChange={(e) => setOveragePrice(e.target.value)}
                placeholder="0.01"
                className="mt-2"
              />
            </div>
          </div>

          <Button className="w-full">
            Create Billing Model
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FixedOverageForm;
