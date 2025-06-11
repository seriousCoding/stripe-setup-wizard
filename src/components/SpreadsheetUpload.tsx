
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface MeteredService {
  id: string;
  displayName: string;
  eventName: string;
  pricePerUnit: number;
  currency: string;
}

const SpreadsheetUpload = () => {
  const [meteredServices, setMeteredServices] = useState<MeteredService[]>([
    { id: '1', displayName: 'API Calls', eventName: 'api_call_count', pricePerUnit: 0.05, currency: 'USD' }
  ]);

  const addMeteredService = () => {
    const newService: MeteredService = {
      id: Date.now().toString(),
      displayName: '',
      eventName: '',
      pricePerUnit: 0,
      currency: 'USD'
    };
    setMeteredServices([...meteredServices, newService]);
  };

  const updateMeteredService = (id: string, field: keyof MeteredService, value: any) => {
    setMeteredServices(services =>
      services.map(service => 
        service.id === id ? { ...service, [field]: value } : service
      )
    );
  };

  const removeMeteredService = (id: string) => {
    setMeteredServices(services => services.filter(service => service.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pay As You Go</CardTitle>
          <CardDescription>
            Charge customers based on their usage of metered services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium">Product</Label>
            <Select defaultValue="existing">
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Use existing product</SelectItem>
                <SelectItem value="new">Create new product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Existing Product</Label>
            <Select>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prod_123">API Service Platform</SelectItem>
                <SelectItem value="prod_456">Analytics Dashboard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-medium">Metered Services</Label>
              <Button onClick={addMeteredService} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>
            
            <div className="space-y-4">
              {meteredServices.map((service, index) => (
                <div key={service.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Service {index + 1}</span>
                    {meteredServices.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMeteredService(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Display Name</Label>
                      <Input
                        value={service.displayName}
                        onChange={(e) => updateMeteredService(service.id, 'displayName', e.target.value)}
                        placeholder="e.g., API Calls"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Event Name</Label>
                      <Input
                        value={service.eventName}
                        onChange={(e) => updateMeteredService(service.id, 'eventName', e.target.value)}
                        placeholder="e.g., api_call_count"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Price Per Unit</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={service.pricePerUnit}
                        onChange={(e) => updateMeteredService(service.id, 'pricePerUnit', parseFloat(e.target.value))}
                        placeholder="0.05"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Currency</Label>
                      <Select 
                        value={service.currency} 
                        onValueChange={(value) => updateMeteredService(service.id, 'currency', value)}
                      >
                        <SelectTrigger className="mt-1">
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

export default SpreadsheetUpload;
