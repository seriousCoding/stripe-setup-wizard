
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { billingModelService } from '@/services/billingModelService';

interface RecurringPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string;
}

const FlatRecurringForm = () => {
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [plans, setPlans] = useState<RecurringPlan[]>([
    {
      id: '1',
      name: 'Basic Plan',
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      description: 'Basic features for getting started'
    }
  ]);
  const { toast } = useToast();

  const addPlan = () => {
    const newPlan: RecurringPlan = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      currency: 'USD',
      interval: 'month',
      description: ''
    };
    setPlans([...plans, newPlan]);
  };

  const updatePlan = (id: string, field: keyof RecurringPlan, value: any) => {
    setPlans(plans.map(plan => 
      plan.id === id ? { ...plan, [field]: value } : plan
    ));
  };

  const removePlan = (id: string) => {
    if (plans.length > 1) {
      setPlans(plans.filter(plan => plan.id !== id));
    }
  };

  const saveModel = async () => {
    if (!modelName || plans.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a model name and at least one plan.",
        variant: "destructive",
      });
      return;
    }

    const billingItems = plans.map(plan => ({
      id: plan.id,
      product: plan.name,
      unit_amount: Math.round(plan.price * 100), // Convert to cents for Stripe
      currency: plan.currency.toLowerCase(),
      type: 'recurring' as const,
      interval: plan.interval,
      description: plan.description,
      billing_scheme: 'per_unit' as const,
      metadata: {
        plan_type: 'flat_recurring',
        created_via: 'manual_entry'
      }
    }));

    const model = {
      name: modelName,
      description: modelDescription,
      type: 'flat-recurring' as const,
      items: billingItems
    };

    const { model: savedModel, error } = await billingModelService.saveBillingModel(model);
    
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Model Saved!",
      description: `${modelName} has been saved successfully.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Flat Recurring Billing Model</CardTitle>
          <CardDescription>
            Create subscription plans with fixed recurring prices. Perfect for SaaS products with predictable pricing tiers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g., SaaS Subscription Plans"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="model-description">Description</Label>
            <Textarea
              id="model-description"
              value={modelDescription}
              onChange={(e) => setModelDescription(e.target.value)}
              placeholder="Describe your subscription model..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription Plans ({plans.length})</CardTitle>
              <CardDescription>
                Define your subscription tiers and pricing
              </CardDescription>
            </div>
            <Button onClick={addPlan} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Plan Configuration</h4>
                  {plans.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePlan(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Plan Name</Label>
                    <Input
                      value={plan.name}
                      onChange={(e) => updatePlan(plan.id, 'name', e.target.value)}
                      placeholder="e.g., Basic Plan"
                    />
                  </div>
                  
                  <div>
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={plan.price}
                      onChange={(e) => updatePlan(plan.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="9.99"
                    />
                  </div>
                  
                  <div>
                    <Label>Currency</Label>
                    <Select value={plan.currency} onValueChange={(value) => updatePlan(plan.id, 'currency', value)}>
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
                  
                  <div>
                    <Label>Billing Interval</Label>
                    <Select value={plan.interval} onValueChange={(value) => updatePlan(plan.id, 'interval', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                        <SelectItem value="week">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={plan.description}
                    onChange={(e) => updatePlan(plan.id, 'description', e.target.value)}
                    placeholder="Describe what's included in this plan..."
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    ${plan.price} {plan.currency}/{plan.interval}
                  </Badge>
                  <Badge variant="secondary">Recurring</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle>Model Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Total Plans:</strong> {plans.length}</p>
            <p><strong>Price Range:</strong> ${Math.min(...plans.map(p => p.price)).toFixed(2)} - ${Math.max(...plans.map(p => p.price)).toFixed(2)}</p>
            <p><strong>Model Type:</strong> Flat Recurring Subscription</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-3">
        <Button
          onClick={saveModel}
          disabled={!modelName || plans.length === 0}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Billing Model
        </Button>
      </div>
    </div>
  );
};

export default FlatRecurringForm;
