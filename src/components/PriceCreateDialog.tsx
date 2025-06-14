
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { stripeService } from "@/services/stripeService";
import { StripeProduct } from "@/services/stripeService";
import { Plus } from "lucide-react";

interface PriceCreateDialogProps {
  product: StripeProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPriceCreated?: () => void;
}

export const PriceCreateDialog: React.FC<PriceCreateDialogProps> = ({
  product,
  open,
  onOpenChange,
  onPriceCreated,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    unit_amount: "",
    currency: "usd",
    interval: "month",
    recurring: true,
    nickname: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  if (!product) return null;

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const data: any = {
        product: product.id,
        unit_amount: parseFloat(formData.unit_amount) * 100,
        currency: formData.currency,
        nickname: formData.nickname || undefined,
      };
      if (formData.recurring) {
        data.recurring = {
          interval: formData.interval,
          interval_count: 1,
          usage_type: "licensed",
        };
      }
      const { price, error } = await stripeService.createPrice(data);
      if (error) throw new Error(error);
      toast({
        title: "Price Created",
        description: "A new price was added to this product.",
      });
      setFormData({
        unit_amount: "",
        currency: "usd",
        interval: "month",
        recurring: true,
        nickname: "",
      });
      onOpenChange(false);
      if (onPriceCreated) onPriceCreated();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error creating price",
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          <Plus className="inline mr-2" /> Create Price for <span className="text-blue-600">{product.name}</span>
        </DialogTitle>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Unit Amount</Label>
            <Input
              type="number"
              min={0}
              value={formData.unit_amount}
              disabled={isLoading}
              onChange={e => setFormData({ ...formData, unit_amount: e.target.value })}
              placeholder="dollars/cents"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={val => setFormData({ ...formData, currency: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD</SelectItem>
                <SelectItem value="eur">EUR</SelectItem>
                <SelectItem value="gbp">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.recurring}
              onCheckedChange={checked => setFormData({ ...formData, recurring: checked })}
              id="recurring-switch"
            />
            <Label htmlFor="recurring-switch">Recurring</Label>
            {formData.recurring && (
              <Select
                value={formData.interval}
                onValueChange={val => setFormData({ ...formData, interval: val })}
              >
                <SelectTrigger className="w-28 ml-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="day">Daily</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label>Nickname <span className="text-gray-400">(Optional)</span></Label>
            <Input
              value={formData.nickname}
              disabled={isLoading}
              onChange={e => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="e.g. Standard monthly"
            />
          </div>
          <div className="flex space-x-2 pt-2">
            <Button onClick={handleCreate} disabled={isLoading || !formData.unit_amount}>
              <Plus className="h-4 w-4 mr-2" />
              Create Price
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceCreateDialog;
