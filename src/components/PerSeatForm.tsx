
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PerSeatForm = () => {
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [interval, setInterval] = useState('month');
  const [minimumSeats, setMinimumSeats] = useState('');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Per Seat</CardTitle>
          <CardDescription>
            Charge customers based on the number of seats or users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Price Per Seat</Label>
              <Input
                type="number"
                step="0.01"
                value={pricePerSeat}
                onChange={(e) => setPricePerSeat(e.target.value)}
                placeholder="15.00"
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

          <div>
            <Label className="text-sm font-medium">Minimum Seats (Optional)</Label>
            <Input
              type="number"
              value={minimumSeats}
              onChange={(e) => setMinimumSeats(e.target.value)}
              placeholder="1"
              className="mt-2"
            />
          </div>

          <Button className="w-full">
            Create Billing Model
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerSeatForm;
