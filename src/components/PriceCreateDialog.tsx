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

// PriceCreateDialog is enhanced for full Stripe API support (including metered/recurring config)
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
    nickname: "",
    billing_scheme: "per_unit",
    usage_type: "licensed",
    interval: "month",
    interval_count: 1,
    type: "recurring",
    aggregate_usage: undefined,
    metadata: {} as Record<string, string>,
    enable_meter: false,
    meter_display_name: "",
    meter_event_name: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newMetadataKey, setNewMetadataKey] = useState("");
  const [newMetadataValue, setNewMetadataValue] = useState("");

  if (!product) return null;

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      let meterId: string | undefined = undefined;
      // Metered product: create meter first if selected
      if (formData.usage_type === "metered" && formData.enable_meter) {
        if (!formData.meter_display_name || !formData.meter_event_name) {
          throw new Error("Meter display name and event name are required for metered prices.");
        }
        const { meter, error } = await stripeService.createMeter({
          display_name: formData.meter_display_name,
          event_name: formData.meter_event_name
        });
        if (error) throw new Error(error);
        meterId = meter.id;
      }
      const priceData: any = {
        product: product.id,
        unit_amount: parseFloat(formData.unit_amount),
        currency: formData.currency,
        nickname: formData.nickname || undefined,
        billing_scheme: formData.billing_scheme,
        metadata: { ...formData.metadata },
      };
      if (formData.type === "recurring") {
        priceData.recurring = {
          interval: formData.interval,
          interval_count: Number(formData.interval_count),
          usage_type: formData.usage_type as "licensed" | "metered"
        };
        if (formData.usage_type === "metered") {
          priceData.aggregate_usage = formData.aggregate_usage;
          if (meterId) {
            priceData.metadata.meter_id = meterId;
          }
        }
      } else {
        priceData.type = "one_time";
      }
      const { price, error } = await stripeService.createPrice(priceData);
      if (error) throw new Error(error);
      toast({
        title: "Price Created",
        description: `A new ${formData.type} price was added to this product.`,
      });
      setFormData({
        unit_amount: "",
        currency: "usd",
        nickname: "",
        billing_scheme: "per_unit",
        usage_type: "licensed",
        interval: "month",
        interval_count: 1,
        type: "recurring",
        aggregate_usage: undefined,
        metadata: {},
        enable_meter: false,
        meter_display_name: "",
        meter_event_name: ""
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

  // Metadata change helpers
  const handleAddMetadata = () => {
    if (newMetadataKey && newMetadataValue) {
      setFormData({
        ...formData,
        metadata: {
          ...formData.metadata,
          [newMetadataKey]: newMetadataValue
        }
      });
      setNewMetadataKey('');
      setNewMetadataValue('');
    }
  };

  const handleRemoveMetadata = (key: string) => {
    const updatedMetadata = { ...formData.metadata };
    delete updatedMetadata[key];
    setFormData({
      ...formData,
      metadata: updatedMetadata
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          <Plus className="inline mr-2" /> Create Price for <span className="text-blue-600">{product.name}</span>
        </DialogTitle>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Unit Amount</Label>
            <Input
              type="number"
              min={0}
              value={formData.unit_amount}
              disabled={isLoading}
              onChange={e => setFormData({ ...formData, unit_amount: e.target.value })}
              placeholder="Dollars/cents"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={val => setFormData({ ...formData, currency: val })}
              disabled={isLoading}
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
          <div>
            <Label>Nickname <span className="text-gray-400">(Optional)</span></Label>
            <Input
              value={formData.nickname}
              disabled={isLoading}
              onChange={e => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="e.g. Standard monthly"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={val => setFormData({ ...formData, type: val })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recurring">Recurring</SelectItem>
                <SelectItem value="one_time">One Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.type === "recurring" && (
            <>
              <div>
                <Label>Interval</Label>
                <Select
                  value={formData.interval}
                  onValueChange={val => setFormData({ ...formData, interval: val })}
                  disabled={isLoading}
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
                  value={formData.interval_count}
                  min={1}
                  max={52}
                  disabled={isLoading}
                  onChange={e => setFormData({ ...formData, interval_count: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Usage Type</Label>
                <Select
                  value={formData.usage_type}
                  onValueChange={val => setFormData({ ...formData, usage_type: val })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="licensed">Licensed</SelectItem>
                    <SelectItem value="metered">Metered (usage-based)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.usage_type === "metered" && (
                <div className="p-3 bg-amber-50 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Switch
                      checked={formData.enable_meter}
                      onCheckedChange={checked => setFormData({ ...formData, enable_meter: checked })}
                      id="meter-switch"
                      disabled={isLoading}
                    />
                    <Label htmlFor="meter-switch">Create & link a new Stripe Meter?</Label>
                  </div>
                  {formData.enable_meter && (
                    <>
                      <div>
                        <Label>Meter Display Name</Label>
                        <Input
                          value={formData.meter_display_name}
                          disabled={isLoading}
                          onChange={e => setFormData({ ...formData, meter_display_name: e.target.value })}
                          placeholder="e.g. API Requests"
                        />
                      </div>
                      <div>
                        <Label>Event Name (snake_case)</Label>
                        <Input
                          value={formData.meter_event_name}
                          disabled={isLoading}
                          onChange={e => setFormData({ ...formData, meter_event_name: e.target.value })}
                          placeholder="e.g. api_requests"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Aggregate Usage</Label>
                    <Select
                      value={formData.aggregate_usage || "sum"}
                      onValueChange={val => setFormData({ ...formData, aggregate_usage: val })}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="max">Max</SelectItem>
                        <SelectItem value="last_during_period">Last during period</SelectItem>
                        <SelectItem value="last_ever">Last ever</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}
          <div>
            <Label>Billing Scheme</Label>
            <Select
              value={formData.billing_scheme}
              onValueChange={val => setFormData({ ...formData, billing_scheme: val })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_unit">Per Unit</SelectItem>
                <SelectItem value="tiered">Tiered (not yet supported)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Metadata */}
          <div>
            <Label>Metadata</Label>
            <div className="space-y-2">
              {Object.entries(formData.metadata).map(([k, v]) => (
                <div key={k} className="flex items-center border rounded p-2">
                  <span className="text-sm font-medium mr-2">{k}:</span>
                  <span className="text-sm text-gray-600 break-all mr-2">{v}</span>
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveMetadata(k)} type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Key"
                  value={newMetadataKey}
                  onChange={e => setNewMetadataKey(e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Input
                  placeholder="Value"
                  value={newMetadataValue}
                  onChange={e => setNewMetadataValue(e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={handleAddMetadata}
                  disabled={!newMetadataKey || !newMetadataValue || isLoading}
                >
                  Add
                </Button>
              </div>
            </div>
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
