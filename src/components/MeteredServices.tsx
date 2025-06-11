
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MeteredService {
  id: string;
  displayName: string;
  eventName: string;
  pricePerUnit: number;
  currency: string;
  billingScheme: 'per_unit' | 'tiered';
  usageType: 'metered' | 'licensed';
  aggregateUsage: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  interval: 'month' | 'year' | 'week' | 'day';
  intervalCount: number;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
  tiers?: Array<{
    upTo: number | 'inf';
    unitAmount: number;
    flatAmount?: number;
  }>;
  description?: string;
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
  const addTier = (serviceId: string) => {
    const service = meteredServices.find(s => s.id === serviceId);
    if (service) {
      const newTiers = [...(service.tiers || []), { upTo: 'inf' as const, unitAmount: 0 }];
      updateMeteredService(serviceId, 'tiers', newTiers);
    }
  };

  const updateTier = (serviceId: string, tierIndex: number, field: string, value: any) => {
    const service = meteredServices.find(s => s.id === serviceId);
    if (service && service.tiers) {
      const newTiers = [...service.tiers];
      newTiers[tierIndex] = { ...newTiers[tierIndex], [field]: value };
      updateMeteredService(serviceId, 'tiers', newTiers);
    }
  };

  const removeTier = (serviceId: string, tierIndex: number) => {
    const service = meteredServices.find(s => s.id === serviceId);
    if (service && service.tiers) {
      const newTiers = service.tiers.filter((_, index) => index !== tierIndex);
      updateMeteredService(serviceId, 'tiers', newTiers);
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usage-Based Services ({meteredServices.length})</CardTitle>
              <CardDescription>
                Configure complete usage-based pricing with all Stripe parameters for meters, pricing tiers, and billing cycles.
              </CardDescription>
            </div>
            <Button onClick={addMeteredService} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {meteredServices.map((service, serviceIndex) => (
              <div key={service.id} className="p-6 border rounded-lg space-y-6 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-lg">Service {serviceIndex + 1}: {service.displayName || 'Unnamed Service'}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeMeteredService(service.id)}
                    disabled={meteredServices.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Basic Service Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      Display Name
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Human-readable name for the service</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      value={service.displayName}
                      onChange={(e) => updateMeteredService(service.id, 'displayName', e.target.value)}
                      placeholder="e.g., API Calls"
                    />
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-2">
                      Event Name
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Unique identifier for tracking usage events</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      value={service.eventName}
                      onChange={(e) => updateMeteredService(service.id, 'eventName', e.target.value)}
                      placeholder="e.g., api_call_usage"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={service.description || ''}
                    onChange={(e) => updateMeteredService(service.id, 'description', e.target.value)}
                    placeholder="Detailed description of the service"
                    rows={2}
                  />
                </div>

                {/* Pricing Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      Billing Scheme
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>How pricing is calculated - per unit or using tiers</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select 
                      value={service.billingScheme} 
                      onValueChange={(value) => updateMeteredService(service.id, 'billingScheme', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_unit">Per Unit</SelectItem>
                        <SelectItem value="tiered">Tiered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Usage Type</Label>
                    <Select 
                      value={service.usageType} 
                      onValueChange={(value) => updateMeteredService(service.id, 'usageType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metered">Metered</SelectItem>
                        <SelectItem value="licensed">Licensed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      Aggregate Usage
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>How usage values are aggregated over the billing period</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select 
                      value={service.aggregateUsage} 
                      onValueChange={(value) => updateMeteredService(service.id, 'aggregateUsage', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="last_during_period">Last During Period</SelectItem>
                        <SelectItem value="last_ever">Last Ever</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Billing Interval */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Billing Interval</Label>
                    <Select 
                      value={service.interval} 
                      onValueChange={(value) => updateMeteredService(service.id, 'interval', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                        <SelectItem value="week">Weekly</SelectItem>
                        <SelectItem value="day">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Interval Count</Label>
                    <Input
                      type="number"
                      min="1"
                      value={service.intervalCount}
                      onChange={(e) => updateMeteredService(service.id, 'intervalCount', parseInt(e.target.value) || 1)}
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
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Trial Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Trial Period (Days)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={service.trialPeriodDays || ''}
                      onChange={(e) => updateMeteredService(service.id, 'trialPeriodDays', parseInt(e.target.value) || undefined)}
                      placeholder="0 for no trial"
                    />
                  </div>
                </div>

                {/* Pricing */}
                {service.billingScheme === 'per_unit' ? (
                  <div>
                    <Label>Price per Unit ({service.currency})</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={service.pricePerUnit}
                      onChange={(e) => updateMeteredService(service.id, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                      placeholder="0.0100"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Pricing Tiers</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addTier(service.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tier
                      </Button>
                    </div>
                    
                    {service.tiers?.map((tier, tierIndex) => (
                      <div key={tierIndex} className="p-4 border rounded bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Tier {tierIndex + 1}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTier(service.id, tierIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label>Up To (units)</Label>
                            <Input
                              type="text"
                              value={tier.upTo === 'inf' ? 'Unlimited' : tier.upTo}
                              onChange={(e) => {
                                const value = e.target.value.toLowerCase();
                                updateTier(service.id, tierIndex, 'upTo', 
                                  value === 'unlimited' || value === 'inf' ? 'inf' : parseInt(value) || 0
                                );
                              }}
                              placeholder="e.g., 1000 or 'unlimited'"
                            />
                          </div>
                          <div>
                            <Label>Per Unit Amount</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={tier.unitAmount}
                              onChange={(e) => updateTier(service.id, tierIndex, 'unitAmount', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>Flat Amount (optional)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={tier.flatAmount || ''}
                              onChange={(e) => updateTier(service.id, tierIndex, 'flatAmount', parseFloat(e.target.value) || undefined)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Badge variant="outline">
                    {service.billingScheme === 'per_unit' 
                      ? `$${service.pricePerUnit} ${service.currency} per unit`
                      : `${service.tiers?.length || 0} pricing tiers`
                    }
                  </Badge>
                  <Badge variant="secondary">{service.usageType}</Badge>
                  <Badge variant="secondary">{service.aggregateUsage}</Badge>
                  <Badge variant="secondary">
                    Every {service.intervalCount} {service.interval}(s)
                  </Badge>
                  {service.trialPeriodDays && (
                    <Badge variant="secondary">{service.trialPeriodDays} day trial</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default MeteredServices;
