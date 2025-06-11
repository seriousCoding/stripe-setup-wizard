
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface BillingItem {
  id: string;
  product: string;
  price: number;
  currency: string;
  type: 'metered' | 'recurring' | 'one-time';
  interval?: string;
  eventName?: string;
  description?: string;
}

interface BillingItemCardProps {
  item: BillingItem;
  index: number;
  isEditing: boolean;
  canRemove: boolean;
  onUpdate: (field: keyof BillingItem, value: any) => void;
  onRemove: () => void;
}

const BillingItemCard = ({
  item,
  index,
  isEditing,
  canRemove,
  onUpdate,
  onRemove
}: BillingItemCardProps) => {
  return (
    <Card className="bg-gray-50/50">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-4">
          <h4 className="font-medium">Item {index + 1}</h4>
          <div className="flex space-x-2">
            <Badge variant={
              item.type === 'metered' ? 'default' : 
              item.type === 'recurring' ? 'secondary' : 'outline'
            }>
              {item.type}
            </Badge>
            {canRemove && isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Product Name</Label>
            <Input
              value={item.product}
              onChange={(e) => onUpdate('product', e.target.value)}
              disabled={!isEditing}
              placeholder="API Calls"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Price</Label>
            <Input
              type="number"
              step="0.001"
              value={item.price}
              onChange={(e) => onUpdate('price', parseFloat(e.target.value))}
              disabled={!isEditing}
              placeholder="0.001"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={item.currency}
              onValueChange={(value) => onUpdate('currency', value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Billing Type</Label>
            <Select
              value={item.type}
              onValueChange={(value: 'metered' | 'recurring' | 'one-time') => 
                onUpdate('type', value)
              }
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metered">Metered (Usage-based)</SelectItem>
                <SelectItem value="recurring">Recurring (Subscription)</SelectItem>
                <SelectItem value="one-time">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {item.type === 'recurring' && (
            <div className="space-y-2">
              <Label>Billing Interval</Label>
              <Select
                value={item.interval}
                onValueChange={(value) => onUpdate('interval', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {item.type === 'metered' && (
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input
                value={item.eventName}
                onChange={(e) => onUpdate('eventName', e.target.value)}
                disabled={!isEditing}
                placeholder="api_call"
              />
            </div>
          )}
          
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label>Description</Label>
            <Textarea
              value={item.description}
              onChange={(e) => onUpdate('description', e.target.value)}
              disabled={!isEditing}
              placeholder="Description of this billing item"
              rows={2}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingItemCard;
