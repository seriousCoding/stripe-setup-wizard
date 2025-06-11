
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'metered': return 'bg-blue-100 text-blue-800';
      case 'recurring': return 'bg-green-100 text-green-800';
      case 'one-time': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = () => {
    if (item.type === 'recurring' && item.interval) {
      return `$${item.price} ${item.currency}/${item.interval}`;
    }
    return `$${item.price} ${item.currency}${item.type === 'metered' ? ' per unit' : ''}`;
  };

  if (!isEditing) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="font-medium">{item.product}</h4>
              <Badge className={getTypeColor(item.type)}>
                {item.type}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">{item.description}</p>
            <p className="font-semibold text-lg">{formatPrice()}</p>
            {item.eventName && (
              <p className="text-xs text-gray-500">Event: {item.eventName}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Item {index + 1}</h4>
          {canRemove && (
            <Button variant="outline" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Product/Service Name</Label>
            <Input
              value={item.product}
              onChange={(e) => onUpdate('product', e.target.value)}
              placeholder="e.g., API Calls"
            />
          </div>
          
          <div>
            <Label>Price</Label>
            <Input
              type="number"
              step="0.001"
              value={item.price}
              onChange={(e) => onUpdate('price', parseFloat(e.target.value) || 0)}
              placeholder="0.05"
            />
          </div>
          
          <div>
            <Label>Currency</Label>
            <Select value={item.currency} onValueChange={(value) => onUpdate('currency', value)}>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Billing Type</Label>
            <Select value={item.type} onValueChange={(value: any) => onUpdate('type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metered">Metered (Usage-based)</SelectItem>
                <SelectItem value="recurring">Recurring (Subscription)</SelectItem>
                <SelectItem value="one-time">One-time (Single payment)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {item.type === 'recurring' && (
            <div>
              <Label>Billing Interval</Label>
              <Select value={item.interval || 'month'} onValueChange={(value) => onUpdate('interval', value)}>
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
          )}
          
          {item.type === 'metered' && (
            <div>
              <Label>Event Name</Label>
              <Input
                value={item.eventName || ''}
                onChange={(e) => onUpdate('eventName', e.target.value)}
                placeholder="e.g., api_call_count"
              />
            </div>
          )}
        </div>
        
        <div>
          <Label>Description</Label>
          <Textarea
            value={item.description || ''}
            onChange={(e) => onUpdate('description', e.target.value)}
            placeholder="Describe this billing item..."
            rows={2}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={getTypeColor(item.type)}>
            {item.type}
          </Badge>
          <Badge variant="outline">
            {formatPrice()}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default BillingItemCard;
