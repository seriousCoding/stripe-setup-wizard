
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface MeteredService {
  id: string;
  displayName: string;
  eventName: string;
  pricePerUnit: number;
  currency: string;
}

interface MeteredServicesProps {
  meteredServices: MeteredService[];
  updateMeteredService: (id: string, field: keyof MeteredService, value: any) => void;
  removeMeteredService: (id: string) => void;
  addMeteredService: () => void;
}

const MeteredServices = ({
  meteredServices,
  updateMeteredService,
  removeMeteredService,
  addMeteredService
}: MeteredServicesProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Metered Services</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {meteredServices.map((service, index) => (
          <div key={service.id} className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-blue-600 font-medium">Service #{index + 1}</Label>
              {meteredServices.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMeteredService(service.id)}
                  className="text-red-600"
                >
                  Remove
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Meter Display Name</Label>
                <Input
                  value={service.displayName}
                  onChange={(e) => updateMeteredService(service.id, 'displayName', e.target.value)}
                  placeholder="e.g., API Calls"
                />
              </div>
              <div>
                <Label>Meter Event Name (Stripe API)</Label>
                <Input
                  value={service.eventName}
                  onChange={(e) => updateMeteredService(service.id, 'eventName', e.target.value)}
                  placeholder="e.g., api_call_count"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is the 'event_name' you'll use to report usage to Stripe.
                </p>
              </div>
              <div>
                <Label>Price Per Unit</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={service.pricePerUnit}
                  onChange={(e) => updateMeteredService(service.id, 'pricePerUnit', parseFloat(e.target.value))}
                  placeholder="e.g., 0.05"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select 
                  value={service.currency} 
                  onValueChange={(value) => updateMeteredService(service.id, 'currency', value)}
                >
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
          </div>
        ))}
        
        <Button onClick={addMeteredService} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Metered Service
        </Button>
      </CardContent>
    </Card>
  );
};

export default MeteredServices;
