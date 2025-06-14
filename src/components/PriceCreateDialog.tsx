import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { stripeService } from "@/services/stripeService";
import { StripeProduct } from "@/services/stripeService";
import { Plus, X, DollarSign, Info, Settings, Repeat, Percent, Key, Briefcase } from "lucide-react";
import { InfoIconWithTooltip } from "./InfoIconWithTooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PriceCreateDialogProps {
  product: StripeProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPriceCreated?: () => void;
}

const initialFormData = {
  unit_amount: "", // User will input in currency units (e.g., 10.99)
  currency: "usd",
  nickname: "",
  type: "recurring" as "recurring" | "one_time",
  active: true,
  tax_behavior: "unspecified" as "inclusive" | "exclusive" | "unspecified",
  billing_scheme: "per_unit" as "per_unit" | "tiered",
  lookup_key: "",
  transfer_lookup_key: false,
  // Recurring specific
  interval: "month" as "month" | "year" | "week" | "day",
  interval_count: 1,
  usage_type: "licensed" as "licensed" | "metered",
  aggregate_usage: "sum" as "sum" | "max" | "last_during_period" | "last_ever" | undefined,
  // Meter specific (for creating new meter if usage_type is metered)
  enable_meter: false,
  meter_display_name: "",
  meter_event_name: "",
  meter_id_for_price: "", // For linking an existing meter to the price (metadata)
  // Custom Unit Amount
  custom_unit_amount_enabled: false,
  custom_unit_amount_minimum: "",
  custom_unit_amount_maximum: "",
  custom_unit_amount_preset: "",
  // Currency Options (simplified: one additional currency)
  currency_options_enabled: false,
  currency_options_code: "", // e.g., "eur"
  currency_options_unit_amount: "", // User will input in currency units
  currency_options_tax_behavior: "unspecified" as "inclusive" | "exclusive" | "unspecified",
  // Transform Quantity
  transform_quantity_enabled: false,
  transform_quantity_divide_by: "",
  transform_quantity_round: "up" as "up" | "down",
  metadata: {} as Record<string, string>,
};

export const PriceCreateDialog: React.FC<PriceCreateDialogProps> = ({
  product,
  open,
  onOpenChange,
  onPriceCreated,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [newMetadataKey, setNewMetadataKey] = useState("");
  const [newMetadataValue, setNewMetadataValue] = useState("");

  React.useEffect(() => {
    if (open) {
      setFormData(initialFormData); // Reset to initial state when dialog opens
      setNewMetadataKey("");
      setNewMetadataValue("");
    }
  }, [open, product]);

  if (!product) return null;

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      let meterIdToUse: string | undefined = formData.meter_id_for_price || undefined;

      if (formData.type === "recurring" && formData.usage_type === "metered" && formData.enable_meter) {
        if (!formData.meter_display_name || !formData.meter_event_name) {
          throw new Error("Meter display name and event name are required for new metered prices.");
        }
        const { meter, error: meterError } = await stripeService.createMeter({
          display_name: formData.meter_display_name,
          event_name: formData.meter_event_name,
          default_aggregation: { formula: formData.aggregate_usage || 'sum' }
        });
        if (meterError) throw new Error(`Failed to create meter: ${meterError}`);
        meterIdToUse = meter.id; // Use the newly created meter
      }
      
      const priceData: any = {
        product: product.id,
        currency: formData.currency,
        active: formData.active,
        nickname: formData.nickname || undefined,
        tax_behavior: formData.tax_behavior === "unspecified" ? undefined : formData.tax_behavior,
        billing_scheme: formData.billing_scheme,
        lookup_key: formData.lookup_key || undefined,
        transfer_lookup_key: formData.transfer_lookup_key || undefined,
        metadata: { ...formData.metadata },
      };

      if (formData.unit_amount) {
        priceData.unit_amount = parseFloat(formData.unit_amount); // Will be converted to cents in service
      }
      
      if (formData.custom_unit_amount_enabled) {
        priceData.custom_unit_amount = {
          enabled: true,
          minimum: formData.custom_unit_amount_minimum ? parseFloat(formData.custom_unit_amount_minimum) : undefined,
          maximum: formData.custom_unit_amount_maximum ? parseFloat(formData.custom_unit_amount_maximum) : undefined,
          preset: formData.custom_unit_amount_preset ? parseFloat(formData.custom_unit_amount_preset) : undefined,
        };
      }

      if (formData.type === "recurring") {
        priceData.recurring = {
          interval: formData.interval,
          interval_count: Number(formData.interval_count) || 1,
          usage_type: formData.usage_type,
        };
        if (formData.usage_type === "metered") {
          priceData.billing_scheme = "per_unit"; // Metered prices are typically per_unit
          priceData.recurring.aggregate_usage = formData.aggregate_usage || 'sum';
          if (meterIdToUse) {
            // Stripe's API for creating a price doesn't directly link a price to a meter via a `meter` field in `recurring`.
            // This is usually handled by setting the product itself to be metered with a specific meter,
            // or by using the `default_price` of a metered product.
            // For now, we can store the meter ID in the price's metadata if a new one was created or an existing one was specified.
            priceData.metadata.meter_id = meterIdToUse;
          }
        }
      }
      
      if (formData.currency_options_enabled && formData.currency_options_code && formData.currency_options_unit_amount) {
        priceData.currency_options = {
          [formData.currency_options_code.toLowerCase()]: {
            unit_amount: parseFloat(formData.currency_options_unit_amount), // Will be converted to cents in service
            tax_behavior: formData.currency_options_tax_behavior === "unspecified" ? undefined : formData.currency_options_tax_behavior,
          }
        };
      }

      if (formData.transform_quantity_enabled && formData.transform_quantity_divide_by) {
        priceData.transform_quantity = {
          enabled: true, // This 'enabled' flag is for our form, Stripe API takes the object if present
          divide_by: Number(formData.transform_quantity_divide_by),
          round: formData.transform_quantity_round,
        };
      }

      const { price, error } = await stripeService.createPrice(priceData);
      if (error) throw new Error(`Failed to create price: ${error}`);
      toast({
        title: "Price Created",
        description: `A new ${formData.type} price "${price.nickname || price.id}" was added to ${product.name}.`,
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

  const renderSection = (title: string, icon: React.ReactNode, children: React.ReactNode) => (
    <div className="space-y-3 py-3 border-b last:border-b-0">
      <h3 className="text-md font-semibold flex items-center text-gray-700">
        {icon}
        <span className="ml-2">{title}</span>
      </h3>
      <div className="space-y-4 pl-2">{children}</div>
    </div>
  );
  
  const isMetered = formData.type === 'recurring' && formData.usage_type === 'metered';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Plus className="inline mr-2 h-5 w-5" /> Create Price for <span className="font-semibold text-primary ml-1">{product.name}</span>
          </DialogTitle>
          <DialogDescription>Configure all aspects of the new price according to Stripe's API.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(80vh-150px)] p-1 pr-6">
          <div className="space-y-4 pt-2 pb-4">
            {renderSection("Core Details", <DollarSign size={18} />, (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price-amount">Unit Amount <InfoIconWithTooltip description="A positive integer in currency units (e.g., 10.99 for $10.99) representing how much to charge. Required unless using tiered billing or custom unit amount." /></Label>
                    <Input
                      id="price-amount" type="number" step="0.01" min="0"
                      value={formData.unit_amount} disabled={isLoading || formData.custom_unit_amount_enabled}
                      onChange={e => setFormData({ ...formData, unit_amount: e.target.value })} placeholder="e.g., 10.99"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price-currency">Currency <InfoIconWithTooltip description="Three-letter ISO currency code, in lowercase. Must be a supported currency." /></Label>
                    <Select value={formData.currency} onValueChange={val => setFormData({ ...formData, currency: val })} disabled={isLoading}>
                      <SelectTrigger id="price-currency"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD</SelectItem> <SelectItem value="eur">EUR</SelectItem> <SelectItem value="gbp">GBP</SelectItem>
                        {/* Add more common currencies */}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="price-nickname">Nickname <InfoIconWithTooltip description="A brief description of the price, hidden from customers. E.g., 'Standard Monthly'." /></Label>
                  <Input id="price-nickname" value={formData.nickname} disabled={isLoading} onChange={e => setFormData({ ...formData, nickname: e.target.value })} placeholder="e.g. Standard Monthly" />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="price-active" checked={formData.active} onCheckedChange={val => setFormData({...formData, active: val})} disabled={isLoading} />
                  <Label htmlFor="price-active">Active <InfoIconWithTooltip description="Whether the price can be used for new purchases. Defaults to true." /></Label>
                </div>
              </>
            ))}

            {renderSection("Billing Structure", <Settings size={18} />, (
              <>
                <div>
                  <Label htmlFor="price-type">Type <InfoIconWithTooltip description="Specifies whether the price is for a one-time purchase or a recurring subscription." /></Label>
                  <Select value={formData.type} onValueChange={val => setFormData({ ...formData, type: val as "recurring" | "one_time" })} disabled={isLoading}>
                    <SelectTrigger id="price-type"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="recurring">Recurring</SelectItem><SelectItem value="one_time">One Time</SelectItem></SelectContent>
                  </Select>
                </div>
                {formData.type === "recurring" && (
                  <div className="space-y-4 p-3 border rounded-md bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price-interval">Interval <InfoIconWithTooltip description="Specifies billing frequency. Either day, week, month or year." /></Label>
                        <Select value={formData.interval} onValueChange={val => setFormData({ ...formData, interval: val as any })} disabled={isLoading}>
                          <SelectTrigger id="price-interval"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="month">Month</SelectItem><SelectItem value="year">Year</SelectItem><SelectItem value="week">Week</SelectItem><SelectItem value="day">Day</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="price-interval-count">Interval Count <InfoIconWithTooltip description="The number of intervals between subscription billings. E.g., interval=month and interval_count=3 bills every 3 months." /></Label>
                        <Input id="price-interval-count" type="number" value={formData.interval_count} min={1} disabled={isLoading} onChange={e => setFormData({ ...formData, interval_count: Number(e.target.value) || 1 })} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="price-usage-type">Usage Type <InfoIconWithTooltip description="Configures how the quantity per period should be determined. 'licensed' bills the quantity set. 'metered' aggregates usage records." /></Label>
                      <Select value={formData.usage_type} onValueChange={val => setFormData({ ...formData, usage_type: val as any })} disabled={isLoading}>
                        <SelectTrigger id="price-usage-type"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="licensed">Licensed (Fixed)</SelectItem><SelectItem value="metered">Metered (Usage-based)</SelectItem></SelectContent>
                      </Select>
                    </div>
                    {isMetered && (
                      <div className="p-3 bg-amber-50 rounded-md border border-amber-200 space-y-3">
                        <div>
                            <Label htmlFor="price-aggregate-usage">Aggregate Usage <InfoIconWithTooltip description="For metered usage, defines how multiple usage records are summarized into a single quantity."/></Label>
                            <Select value={formData.aggregate_usage || "sum"} onValueChange={val => setFormData({ ...formData, aggregate_usage: val as any })} disabled={isLoading}>
                                <SelectTrigger id="price-aggregate-usage"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="sum">Sum of values</SelectItem> <SelectItem value="max">Maximum value</SelectItem>
                                <SelectItem value="last_during_period">Most recent value during period</SelectItem> <SelectItem value="last_ever">Most recent value ever</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                           <Switch id="enable-meter" checked={formData.enable_meter} onCheckedChange={checked => setFormData({ ...formData, enable_meter: checked })} disabled={isLoading} />
                           <Label htmlFor="enable-meter">Create & Link New Stripe Meter <InfoIconWithTooltip description="If enabled, a new Stripe Meter will be created and its ID stored in this price's metadata."/></Label>
                        </div>
                        {formData.enable_meter && (
                          <>
                            <div><Label htmlFor="meter-display-name">New Meter Display Name <InfoIconWithTooltip description="Name for the new meter, visible in Stripe dashboard."/></Label><Input id="meter-display-name" value={formData.meter_display_name} disabled={isLoading} onChange={e => setFormData({ ...formData, meter_display_name: e.target.value })} placeholder="e.g. API Requests"/></div>
                            <div><Label htmlFor="meter-event-name">New Meter Event Name <InfoIconWithTooltip description="Internal event name for the new meter (e.g., 'api_requests_count')."/></Label><Input id="meter-event-name" value={formData.meter_event_name} disabled={isLoading} onChange={e => setFormData({ ...formData, meter_event_name: e.target.value })} placeholder="e.g. api_requests_count"/></div>
                          </>
                        )}
                        <div>
                           <Label htmlFor="meter-id-for-price">Existing Meter ID (Optional) <InfoIconWithTooltip description="If you have an existing Stripe Meter ID, enter it here to associate with this price (will be stored in metadata). Overrides new meter creation if both are set."/></Label>
                           <Input id="meter-id-for-price" value={formData.meter_id_for_price} disabled={isLoading || formData.enable_meter} onChange={e => setFormData({ ...formData, meter_id_for_price: e.target.value })} placeholder="mtr_..."/>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="price-billing-scheme">Billing Scheme <InfoIconWithTooltip description="'per_unit' charges a fixed amount per unit. 'tiered' allows for volume or graduated pricing (Tiered UI coming soon)." /></Label>
                  <Select value={formData.billing_scheme} onValueChange={val => setFormData({ ...formData, billing_scheme: val as any})} disabled={isLoading || isMetered}>
                    <SelectTrigger id="price-billing-scheme"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="per_unit">Per Unit</SelectItem><SelectItem value="tiered" disabled>Tiered (Coming Soon)</SelectItem></SelectContent>
                  </Select>
                  {isMetered && <p className="text-xs text-muted-foreground mt-1">Metered pricing typically uses 'Per Unit'.</p>}
                </div>
              </>
            ))}

            {renderSection("Tax & Lookup", <Percent size={18} />, (
              <>
                <div>
                  <Label htmlFor="price-tax-behavior">Tax Behavior <InfoIconWithTooltip description="Specifies whether the price includes or excludes taxes. 'unspecified' uses your Stripe account's default." /></Label>
                  <Select value={formData.tax_behavior} onValueChange={val => setFormData({ ...formData, tax_behavior: val as any })} disabled={isLoading}>
                    <SelectTrigger id="price-tax-behavior"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unspecified">Unspecified</SelectItem><SelectItem value="inclusive">Inclusive</SelectItem><SelectItem value="exclusive">Exclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price-lookup-key">Lookup Key <InfoIconWithTooltip description="A unique string to reference this price. Max 200 characters." /></Label>
                  <Input id="price-lookup-key" value={formData.lookup_key} disabled={isLoading} onChange={e => setFormData({ ...formData, lookup_key: e.target.value })} placeholder="e.g. premium_monthly_usd" />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="price-transfer-lookup-key" checked={formData.transfer_lookup_key} onCheckedChange={val => setFormData({...formData, transfer_lookup_key: val})} disabled={isLoading || !formData.lookup_key} />
                  <Label htmlFor="price-transfer-lookup-key">Transfer Lookup Key <InfoIconWithTooltip description="If true, atomically removes the lookup key from an existing price and assigns it to this one." /></Label>
                </div>
              </>
            ))}
            
            {renderSection("Custom Unit Amount", <DollarSign size={18} />, (
              <>
                <div className="flex items-center space-x-2">
                  <Switch id="custom-unit-amount-enabled" checked={formData.custom_unit_amount_enabled} onCheckedChange={val => setFormData({...formData, custom_unit_amount_enabled: val, ...(val && {unit_amount: ""})})} disabled={isLoading} />
                  <Label htmlFor="custom-unit-amount-enabled">Enable Custom Unit Amount <InfoIconWithTooltip description="Allows customers to adjust the amount during Checkout or Payment Links." /></Label>
                </div>
                {formData.custom_unit_amount_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border rounded-md bg-muted/30">
                    <div>
                      <Label htmlFor="custom-unit-amount-minimum">Minimum Amount <InfoIconWithTooltip description="Minimum unit amount customer can specify (in currency units)." /></Label>
                      <Input id="custom-unit-amount-minimum" type="number" step="0.01" min="0" value={formData.custom_unit_amount_minimum} disabled={isLoading} onChange={e => setFormData({ ...formData, custom_unit_amount_minimum: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="custom-unit-amount-maximum">Maximum Amount <InfoIconWithTooltip description="Maximum unit amount customer can specify (in currency units)." /></Label>
                      <Input id="custom-unit-amount-maximum" type="number" step="0.01" min="0" value={formData.custom_unit_amount_maximum} disabled={isLoading} onChange={e => setFormData({ ...formData, custom_unit_amount_maximum: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="custom-unit-amount-preset">Preset Amount <InfoIconWithTooltip description="Starting unit amount customer sees (in currency units)." /></Label>
                      <Input id="custom-unit-amount-preset" type="number" step="0.01" min="0" value={formData.custom_unit_amount_preset} disabled={isLoading} onChange={e => setFormData({ ...formData, custom_unit_amount_preset: e.target.value })} />
                    </div>
                  </div>
                )}
              </>
            ))}

            {renderSection("Additional Currency Option", <Briefcase size={18} />, (
              <>
                <div className="flex items-center space-x-2">
                  <Switch id="currency-options-enabled" checked={formData.currency_options_enabled} onCheckedChange={val => setFormData({...formData, currency_options_enabled: val})} disabled={isLoading} />
                  <Label htmlFor="currency-options-enabled">Add an Additional Currency <InfoIconWithTooltip description="Define price in another currency. Each key must be a three-letter ISO currency code." /></Label>
                </div>
                {formData.currency_options_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border rounded-md bg-muted/30">
                    <div>
                      <Label htmlFor="currency-options-code">Currency Code <InfoIconWithTooltip description="E.g., 'eur', 'gbp'."/></Label>
                      <Input id="currency-options-code" value={formData.currency_options_code} maxLength={3} disabled={isLoading} onChange={e => setFormData({ ...formData, currency_options_code: e.target.value.toLowerCase() })} placeholder="eur" />
                    </div>
                    <div>
                      <Label htmlFor="currency-options-unit-amount">Unit Amount <InfoIconWithTooltip description="Amount for this currency (in its units)."/></Label>
                      <Input id="currency-options-unit-amount" type="number" step="0.01" min="0" value={formData.currency_options_unit_amount} disabled={isLoading} onChange={e => setFormData({ ...formData, currency_options_unit_amount: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="currency-options-tax-behavior">Tax Behavior <InfoIconWithTooltip description="Tax behavior for this specific currency option."/></Label>
                      <Select value={formData.currency_options_tax_behavior} onValueChange={val => setFormData({ ...formData, currency_options_tax_behavior: val as any })} disabled={isLoading}>
                        <SelectTrigger id="currency-options-tax-behavior"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="unspecified">Unspecified</SelectItem><SelectItem value="inclusive">Inclusive</SelectItem><SelectItem value="exclusive">Exclusive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            ))}
            
            {renderSection("Transform Quantity", <Repeat size={18} />, (
              <>
                <div className="flex items-center space-x-2">
                  <Switch id="transform-quantity-enabled" checked={formData.transform_quantity_enabled} onCheckedChange={val => setFormData({...formData, transform_quantity_enabled: val})} disabled={isLoading || formData.billing_scheme === 'tiered'} />
                  <Label htmlFor="transform-quantity-enabled">Enable Quantity Transformation <InfoIconWithTooltip description="Apply a transformation to reported usage or quantity before billing. Cannot be combined with tiers." /></Label>
                </div>
                {formData.transform_quantity_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-md bg-muted/30">
                    <div>
                      <Label htmlFor="transform-quantity-divide-by">Divide By <InfoIconWithTooltip description="Divide usage by this number."/></Label>
                      <Input id="transform-quantity-divide-by" type="number" min="1" value={formData.transform_quantity_divide_by} disabled={isLoading} onChange={e => setFormData({ ...formData, transform_quantity_divide_by: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="transform-quantity-round">Round <InfoIconWithTooltip description="After division, round the result up or down."/></Label>
                      <Select value={formData.transform_quantity_round} onValueChange={val => setFormData({ ...formData, transform_quantity_round: val as any })} disabled={isLoading}>
                        <SelectTrigger id="transform-quantity-round"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="up">Up</SelectItem><SelectItem value="down">Down</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            ))}

            {renderSection("Metadata", <Key size={18} />, (
              <>
                <div className="space-y-2">
                  {Object.entries(formData.metadata).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border rounded-md p-2">
                      <div><span className="text-sm font-medium mr-2">{k}:</span><span className="text-sm text-muted-foreground break-all">{v}</span></div>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveMetadata(k)} type="button" aria-label={`Remove metadata key ${k}`} className="h-7 w-7"><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <div className="flex gap-2 items-center mt-2">
                    <Input placeholder="Key" value={newMetadataKey} onChange={e => setNewMetadataKey(e.target.value)} className="flex-1" disabled={isLoading} />
                    <Input placeholder="Value" value={newMetadataValue} onChange={e => setNewMetadataValue(e.target.value)} className="flex-1" disabled={isLoading} />
                    <Button type="button" size="sm" variant="outline" onClick={handleAddMetadata} disabled={!newMetadataKey || !newMetadataValue || isLoading}>Add</Button>
                  </div>
                </div>
              </>
            ))}

          </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isLoading || (!formData.unit_amount && !formData.custom_unit_amount_enabled) || (formData.type === "recurring" && formData.usage_type === "metered" && formData.enable_meter && (!formData.meter_display_name || !formData.meter_event_name))}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PriceCreateDialog;
