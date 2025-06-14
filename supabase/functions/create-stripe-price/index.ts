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
    
    const apiKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!apiKey) {
      throw new Error('Stripe API key not configured in environment variables.');
    }

    const stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16', 
    });

    const {
      product,
      unit_amount,
      currency = 'usd',
      recurring, 
      billing_scheme = 'per_unit',
      active = true,
      metadata = {},
      nickname,
      tax_behavior, 
      lookup_key,
      transfer_lookup_key,
      custom_unit_amount, 
      currency_options, 
      transform_quantity,
      tiers, // Added for tiered billing
      tiers_mode, // Added for tiered billing ('graduated' or 'volume')
    } = await req.json();

    if (!product || (unit_amount === undefined && !custom_unit_amount?.enabled && billing_scheme !== 'tiered')) {
      throw new Error('Product ID and unit amount (or custom unit amount enabled, or tiered billing) are required');
    }

    const pricePayload: Stripe.PriceCreateParams = {
      product,
      currency: currency.toLowerCase(),
      active,
      metadata: {
        ...metadata, 
        user_id: user.id,
        created_by: 'stripe-setup-pilot'
      },
      nickname: nickname || undefined,
      tax_behavior: tax_behavior || undefined,
      lookup_key: lookup_key || undefined,
      transfer_lookup_key: transfer_lookup_key || undefined,
      billing_scheme,
    };

    if (unit_amount !== undefined && billing_scheme !== 'tiered') {
      pricePayload.unit_amount = Math.round(Number(unit_amount));
    }

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
        if (recurring.meter) {
            if (!pricePayload.metadata) pricePayload.metadata = {};
            pricePayload.metadata.meter_id = recurring.meter; 
          }
      }
    }
    
    if (custom_unit_amount?.enabled) {
      pricePayload.custom_unit_amount = {
        enabled: true,
        minimum: custom_unit_amount.minimum ? Number(custom_unit_amount.minimum) * 100 : undefined,
        maximum: custom_unit_amount.maximum ? Number(custom_unit_amount.maximum) * 100 : undefined,
        preset: custom_unit_amount.preset ? Number(custom_unit_amount.preset) * 100 : undefined,
      };
    }

    if (currency_options) {
        const formattedCurrencyOptions: Stripe.PriceCreateParams.CurrencyOptions = {};
        for (const [code, options] of Object.entries(currency_options as Record<string, any>)) {
            if (options.unit_amount !== undefined) {
                 formattedCurrencyOptions[code.toLowerCase()] = {
                    unit_amount: Math.round(Number(options.unit_amount)), 
                    tax_behavior: options.tax_behavior || undefined,
                 };
            }
        }
        if (Object.keys(formattedCurrencyOptions).length > 0) {
            pricePayload.currency_options = formattedCurrencyOptions;
        }
    }

    if (transform_quantity?.enabled && billing_scheme !== 'tiered') { // transform_quantity cannot be combined with tiers
      pricePayload.transform_quantity = {
        divide_by: Number(transform_quantity.divide_by),
        round: transform_quantity.round as Stripe.PriceCreateParams.TransformQuantity.Round,
      };
    }

    // Handle tiered billing
    if (billing_scheme === 'tiered' && tiers && tiers_mode) {
      // Ensure unit_amount is not set if billing_scheme is tiered, as tiers define amounts.
      delete pricePayload.unit_amount; 
      // @ts-ignore // Stripe SDK types might need explicit casting for tiers content
      pricePayload.tiers = tiers.map(tier => ({
        ...tier,
        up_to: tier.up_to === 'inf' ? 'inf' : Number(tier.up_to),
        unit_amount: tier.unit_amount ? Math.round(Number(tier.unit_amount) * 100) : undefined,
        flat_amount: tier.flat_amount ? Math.round(Number(tier.flat_amount) * 100) : undefined,
      }));
      pricePayload.tiers_mode = tiers_mode as Stripe.PriceCreateParams.TiersMode;
    } else if (billing_scheme === 'tiered' && (!tiers || !tiers_mode)) {
        // If scheme is tiered but tiers/tiers_mode not provided, Stripe will error.
        // Frontend should ensure these are provided for tiered model.
        // For now, allow request to proceed; Stripe will validate.
        console.warn("Billing scheme is tiered, but tiers or tiers_mode might be missing.");
    }

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
