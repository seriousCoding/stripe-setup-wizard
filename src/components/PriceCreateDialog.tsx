
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
import { Plus, X } from "lucide-react"; // Added X for remove metadata button

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
    aggregate_usage: "sum" as "sum" | "max" | "last_during_period" | "last_ever" | undefined,
    metadata: {} as Record<string, string>,
    enable_meter: false,
    meter_display_name: "",
    meter_event_name: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newMetadataKey, setNewMetadataKey] = useState("");
  const [newMetadataValue, setNewMetadataValue] = useState("");

  // Reset form when product changes or dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData({
        unit_amount: "",
        currency: "usd",
        nickname: "",
        billing_scheme: "per_unit",
        usage_type: "licensed",
        interval: "month",
        interval_count: 1,
        type: "recurring",
        aggregate_usage: "sum",
        metadata: {},
        enable_meter: false,
        meter_display_name: "",
        meter_event_name: ""
      });
      setNewMetadataKey("");
      setNewMetadataValue("");
    }
  }, [open, product]);

  if (!product) return null;

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      let meterId: string | undefined = undefined;
      if (formData.type === "recurring" && formData.usage_type === "metered" && formData.enable_meter) {
        if (!formData.meter_display_name || !formData.meter_event_name) {
          throw new Error("Meter display name and event name are required for new metered prices.");
        }
        const { meter, error } = await stripeService.createMeter({
          display_name: formData.meter_display_name,
          event_name: formData.meter_event_name,
          default_aggregation: { formula: formData.aggregate_usage || 'sum' }
        });
        if (error) throw new Error(`Failed to create meter: ${error}`);
        meterId = meter.id;
      }

      const priceData: any = {
        product: product.id,
        unit_amount: Math.round(parseFloat(formData.unit_amount) * 100), // Convert to cents
        currency: formData.currency,
        nickname: formData.nickname || undefined,
        active: true, // New prices are active by default
        metadata: { ...formData.metadata },
      };

      if (formData.type === "recurring") {
        priceData.recurring = {
          interval: formData.interval,
          interval_count: Number(formData.interval_count) || 1,
          usage_type: formData.usage_type as "licensed" | "metered"
        };
        if (formData.usage_type === "metered") {
          priceData.billing_scheme = "per_unit"; // Metered prices are typically per_unit
          priceData.recurring.aggregate_usage = formData.aggregate_usage || 'sum';
          if (meterId) { // If a new meter was created
            priceData.metadata.meter = meterId; // Store meter_id in price.metadata (Stripe doesn't have a direct meter link on price object itself other than via product metadata or price metadata)
                                            // Or, if you meant to link to an *existing* meter, you would pass `meter: existing_meter_id` directly in `recurring`
                                            // For now, we're creating a new one if `enable_meter` is true
          } else if (product.metadata?.default_meter_id) {
            // If not creating a new meter, and product has a default_meter_id, use it
            // This part is a bit ambiguous in Stripe's direct Price API vs Product-level meter config.
            // The most direct way to link a price to a meter is to ensure the product itself is configured for that meter,
            // or the price is specifically for a metered product.
            // For simplicity here, creating a new meter is explicit. Linking to existing would need UI to select one.
          }
        } else { // Licensed
           priceData.billing_scheme = formData.billing_scheme;
        }
      } else { // one_time
        priceData.billing_scheme = formData.billing_scheme; // Can be per_unit or tiered (tiered not fully implemented here)
      }
      
      // Tiered billing scheme requires `tiers` and `tiers_mode` - not fully implemented in this form for simplicity
      if (formData.billing_scheme === 'tiered') {
         // priceData.tiers = [...];
         // priceData.tiers_mode = 'volume' | 'graduated';
         // For now, we are disabling tiered selection in UI until fully supported in form
         console.warn("Tiered pricing model selected but not fully implemented in PriceCreateDialog form.");
         // Fallback to per_unit if tiered is selected but not implemented
         if (!priceData.tiers) priceData.billing_scheme = 'per_unit';
      }


      const { price, error } = await stripeService.createPrice(priceData);
      if (error) throw new Error(`Failed to create price: ${error}`);
      toast({
        title: "Price Created",
        description: `A new ${formData.type} price was added to ${product.name}.`,
      });
      
      onOpenChange(false); // Close dialog
      if (onPriceCreated) onPriceCreated(); // Callback to refresh list
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
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [newMetadataKey]: newMetadataValue
        }
      }));
      setNewMetadataKey('');
      setNewMetadataValue('');
    }
  };

  const handleRemoveMetadata = (key: string) => {
    setFormData(prev => {
      const updatedMetadata = { ...prev.metadata };
      delete updatedMetadata[key];
      return { ...prev, metadata: updatedMetadata };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>
          <Plus className="inline mr-2" /> Create Price for <span className="font-semibold text-primary">{product.name}</span>
        </DialogTitle>
        <div className="space-y-4 pt-2 pb-4">
          <div>
            <Label htmlFor="price-amount">Unit Amount (in {formData.currency.toUpperCase()})</Label>
            <Input
              id="price-amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_amount}
              disabled={isLoading}
              onChange={e => setFormData({ ...formData, unit_amount: e.target.value })}
              placeholder="e.g., 10.99"
            />
          </div>
          <div>
            <Label htmlFor="price-currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={val => setFormData({ ...formData, currency: val })}
              disabled={isLoading}
            >
              <SelectTrigger id="price-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD</SelectItem>
                <SelectItem value="eur">EUR</SelectItem>
                <SelectItem value="gbp">GBP</SelectItem>
                {/* Add more common currencies as needed */}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="price-nickname">Nickname <span className="text-xs text-muted-foreground">(Optional)</span></Label>
            <Input
              id="price-nickname"
              value={formData.nickname}
              disabled={isLoading}
              onChange={e => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="e.g. Standard Monthly"
            />
          </div>
          <div>
            <Label htmlFor="price-type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={val => setFormData({ ...formData, type: val as "recurring" | "one_time" })}
              disabled={isLoading}
            >
              <SelectTrigger id="price-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recurring">Recurring</SelectItem>
                <SelectItem value="one_time">One Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === "recurring" && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price-interval">Interval</Label>
                  <Select
                    value={formData.interval}
                    onValueChange={val => setFormData({ ...formData, interval: val as "month" | "year" | "week" | "day" })}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="price-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price-interval-count">Interval Count</Label>
                  <Input
                    id="price-interval-count"
                    type="number"
                    value={formData.interval_count}
                    min={1}
                    disabled={isLoading}
                    onChange={e => setFormData({ ...formData, interval_count: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="price-usage-type">Usage Type</Label>
                <Select
                  value={formData.usage_type}
                  onValueChange={val => setFormData({ ...formData, usage_type: val as "licensed" | "metered" })}
                  disabled={isLoading}
                >
                  <SelectTrigger id="price-usage-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="licensed">Licensed (Fixed)</SelectItem>
                    <SelectItem value="metered">Metered (Usage-based)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.usage_type === "metered" && (
                <div className="p-3 bg-amber-50 rounded-md border border-amber-200 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enable-meter"
                      checked={formData.enable_meter}
                      onCheckedChange={checked => setFormData({ ...formData, enable_meter: checked })}
                      disabled={isLoading}
                    />
                    <Label htmlFor="enable-meter">Create & Link New Stripe Meter</Label>
                  </div>
                  {formData.enable_meter && (
                    <>
                      <div>
                        <Label htmlFor="meter-display-name">Meter Display Name</Label>
                        <Input
                          id="meter-display-name"
                          value={formData.meter_display_name}
                          disabled={isLoading}
                          onChange={e => setFormData({ ...formData, meter_display_name: e.target.value })}
                          placeholder="e.g. API Requests"
                        />
                      </div>
                      <div>
                        <Label htmlFor="meter-event-name">Meter Event Name (snake_case)</Label>
                        <Input
                          id="meter-event-name"
                          value={formData.meter_event_name}
                          disabled={isLoading}
                          onChange={e => setFormData({ ...formData, meter_event_name: e.target.value })}
                          placeholder="e.g. api_requests_count"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="price-aggregate-usage">Aggregate Usage</Label>
                    <Select
                      value={formData.aggregate_usage || "sum"}
                      onValueChange={val => setFormData({ ...formData, aggregate_usage: val as "sum" | "max" | "last_during_period" | "last_ever" })}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="price-aggregate-usage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum of values</SelectItem>
                        <SelectItem value="max">Maximum value</SelectItem>
                        <SelectItem value="last_during_period">Most recent value during period</SelectItem>
                        <SelectItem value="last_ever">Most recent value ever</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="price-billing-scheme">Billing Scheme</Label>
            <Select
              value={formData.billing_scheme}
              onValueChange={val => setFormData({ ...formData, billing_scheme: val as "per_unit" | "tiered"})}
              disabled={isLoading || formData.usage_type === "metered"} // Metered usually implies per_unit, tiered for metered is complex.
            >
              <SelectTrigger id="price-billing-scheme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_unit">Per Unit</SelectItem>
                <SelectItem value="tiered" disabled>Tiered (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
             {formData.usage_type === "metered" && (
                <p className="text-xs text-muted-foreground mt-1">Metered pricing typically uses 'Per Unit'. Tiered metered pricing is an advanced setup.</p>
            )}
          </div>
          
          <div>
            <Label>Metadata <span className="text-xs text-muted-foreground">(Optional)</span></Label>
            <div className="space-y-2">
              {Object.entries(formData.metadata).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border rounded-md p-2">
                  <div>
                    <span className="text-sm font-medium mr-2">{k}:</span>
                    <span className="text-sm text-muted-foreground break-all">{v}</span>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => handleRemoveMetadata(k)} 
                    type="button"
                    aria-label={`Remove metadata key ${k}`}
                    className="h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 items-center mt-2">
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isLoading || !formData.unit_amount || (formData.type === "recurring" && formData.usage_type === "metered" && formData.enable_meter && (!formData.meter_display_name || !formData.meter_event_name))}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Price
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceCreateDialog;
