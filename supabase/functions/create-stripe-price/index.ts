
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0"; // Ensure this is the version you intend to use, matching your docs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const apiKey = Deno.env.get('STRIPE_SECRET_KEY'); // Changed from req.json() to Deno.env.get()
    if (!apiKey) { // Check if apiKey is retrieved from environment
      throw new Error('Stripe API key not configured in environment variables.');
    }

    const stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16', // Match your target API version
    });

    const {
      product,
      unit_amount, // Expecting this in cents if number, or as string for unit_amount_decimal
      currency = 'usd',
      recurring, // object: { interval, interval_count, usage_type, meter, aggregate_usage }
      billing_scheme = 'per_unit',
      active = true,
      metadata = {},
      nickname,
      tax_behavior, // 'inclusive', 'exclusive', 'unspecified'
      lookup_key,
      transfer_lookup_key,
      custom_unit_amount, // object: { enabled, minimum, maximum, preset }
      // unit_amount_decimal, // Will handle this if unit_amount is not primary
      currency_options, // object: { [currency_code]: { unit_amount, tax_behavior, custom_unit_amount } }
      transform_quantity, // object: { divide_by, round }
    } = await req.json();

    if (!product || (unit_amount === undefined && !custom_unit_amount?.enabled && billing_scheme !== 'tiered')) {
      throw new Error('Product ID and unit amount (or custom unit amount enabled, or tiered billing) are required');
    }

    const pricePayload: Stripe.PriceCreateParams = {
      product,
      currency: currency.toLowerCase(),
      active,
      metadata: {
        ...metadata, // Keep existing metadata
        user_id: user.id,
        created_by: 'stripe-setup-pilot'
      },
      nickname: nickname || undefined,
      tax_behavior: tax_behavior || undefined,
      lookup_key: lookup_key || undefined,
      transfer_lookup_key: transfer_lookup_key || undefined,
      billing_scheme,
    };

    if (unit_amount !== undefined) {
      // Ensure unit_amount is an integer in cents
      pricePayload.unit_amount = Math.round(Number(unit_amount));
    }
    // if (unit_amount_decimal) {
    //   pricePayload.unit_amount_decimal = unit_amount_decimal;
    // }


    if (recurring) {
      pricePayload.recurring = {
        interval: recurring.interval,
        interval_count: recurring.interval_count ? Number(recurring.interval_count) : undefined,
        usage_type: recurring.usage_type,
      };
      if (recurring.usage_type === 'metered') {
        if(recurring.aggregate_usage) {
            pricePayload.recurring.aggregate_usage = recurring.aggregate_usage as Stripe.PriceCreateParams.Recurring.AggregateUsage;
        }
        // If a meter ID is explicitly passed for metered usage (e.g. from product's metadata or selected by user)
        if (recurring.meter) {
            // This part is tricky. Stripe's Price API doesn't directly take a `meter` field under `recurring` in Price Create.
            // Meter linking is typically done at the Product level or by specific metered billing configurations.
            // Often, a Product is set to `metered: <meter_id>` and then prices for that product inherently use that meter.
            // Or, for Usage-Based Billing with Billable Metrics, the meter is configured on Stripe and `event_name` is used.
            // For simplicity, if `recurring.meter` is passed, we'll assume it's for metadata or a specific setup not directly on Price create.
            // A common approach is to put meter_id in price.metadata.
            if (!pricePayload.metadata) pricePayload.metadata = {};
            pricePayload.metadata.meter_id = recurring.meter; // Example: storing meter id in metadata
          }
      }
    }
    
    if (custom_unit_amount?.enabled) {
      pricePayload.custom_unit_amount = {
        enabled: true,
        minimum: custom_unit_amount.minimum ? Number(custom_unit_amount.minimum) * 100 : undefined, // convert to cents
        maximum: custom_unit_amount.maximum ? Number(custom_unit_amount.maximum) * 100 : undefined, // convert to cents
        preset: custom_unit_amount.preset ? Number(custom_unit_amount.preset) * 100 : undefined, // convert to cents
      };
    }

    if (currency_options) {
        const formattedCurrencyOptions: Stripe.PriceCreateParams.CurrencyOptions = {};
        for (const [code, options] of Object.entries(currency_options as Record<string, any>)) {
            if (options.unit_amount !== undefined) {
                 formattedCurrencyOptions[code.toLowerCase()] = {
                    unit_amount: Math.round(Number(options.unit_amount)), // Ensure cents
                    tax_behavior: options.tax_behavior || undefined,
                    // custom_unit_amount for currency_options can also be added here if needed
                 };
            }
        }
        if (Object.keys(formattedCurrencyOptions).length > 0) {
            pricePayload.currency_options = formattedCurrencyOptions;
        }
    }

    if (transform_quantity?.enabled) {
      pricePayload.transform_quantity = {
        divide_by: Number(transform_quantity.divide_by),
        round: transform_quantity.round as Stripe.PriceCreateParams.TransformQuantity.Round,
      };
    }

    // Tiered billing is more complex and would require 'tiers' and 'tiers_mode'
    // if (billing_scheme === 'tiered' && tiers && tiers_mode) {
    //   pricePayload.tiers = tiers;
    //   pricePayload.tiers_mode = tiers_mode;
    // }

    const price = await stripe.prices.create(pricePayload);

    return new Response(
      JSON.stringify({ price }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating price:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
