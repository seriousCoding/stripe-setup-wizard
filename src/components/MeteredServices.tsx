
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Metered Services ({meteredServices.length})</CardTitle>
            <CardDescription>
              Define services that will be billed based on usage. Each service needs a display name, event name for tracking, and price per unit.
            </CardDescription>
          </div>
          <Button onClick={addMeteredService} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {meteredServices.map((service) => (
            <div key={service.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Service Configuration</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeMeteredService(service.id)}
                  disabled={meteredServices.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={service.displayName}
                    onChange={(e) => updateMeteredService(service.id, 'displayName', e.target.value)}
                    placeholder="e.g., API Calls"
                  />
                </div>
                
                <div>
                  <Label>Event Name</Label>
                  <Input
                    value={service.eventName}
                    onChange={(e) => updateMeteredService(service.id, 'eventName', e.target.value)}
                    placeholder="e.g., api_call_count"
                  />
                </div>
                
                <div>
                  <Label>Price per Unit</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={service.pricePerUnit}
                    onChange={(e) => updateMeteredService(service.id, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                    placeholder="0.05"
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
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  ${service.pricePerUnit} {service.currency} per unit
                </Badge>
                <Badge variant="secondary">Metered</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MeteredServices;
