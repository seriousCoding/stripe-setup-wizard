
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEPLOY-BILLING-MODEL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { billingModel } = await req.json();

    if (!billingModel || !billingModel.items) {
      throw new Error('Billing model with items is required');
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    logStep("Stripe client initialized");

    const results = {
      products: [],
      prices: [],
      meters: [],
      errors: []
    };

    // Create products, prices, and meters for each billing item
    for (const item of billingModel.items) {
      try {
        logStep("Processing billing item", { product: item.product, type: item.type });

        // Create product
        const product = await stripe.products.create({
          name: item.product,
          description: item.description || `${item.product} - ${item.type} billing`,
          type: 'service',
          metadata: {
            user_id: user.id,
            billing_model_type: billingModel.type,
            created_by: 'stripe-setup-pilot'
          }
        });

        results.products.push(product);
        logStep("Product created", { productId: product.id, name: product.name });

        // Create price
        const priceData: any = {
          product: product.id,
          unit_amount: Math.round(item.unit_amount), // Already in cents
          currency: item.currency.toLowerCase(),
          metadata: {
            event_name: item.eventName,
            description: item.description,
            user_id: user.id
          }
        };

        if (item.type === 'recurring' && item.interval) {
          priceData.recurring = {
            interval: item.interval
          };
        }

        if (item.type === 'metered') {
          priceData.billing_scheme = 'per_unit';
          priceData.usage_type = 'metered';
          priceData.recurring = {
            interval: 'month',
            usage_type: 'metered',
            aggregate_usage: item.aggregate_usage || 'sum'
          };
        }

        const price = await stripe.prices.create(priceData);
        results.prices.push(price);
        logStep("Price created", { priceId: price.id, amount: price.unit_amount });

        // Create meter for metered items
        if (item.type === 'metered' && item.eventName) {
          try {
            const meter = await stripe.billing.meters.create({
              display_name: item.product,
              event_name: item.eventName,
              customer_mapping: {
                event_payload_key: 'customer_id',
                type: 'by_id'
              },
              default_aggregation: {
                formula: item.aggregate_usage || 'sum'
              },
              value_settings: {
                event_payload_key: 'value'
              }
            });
            results.meters.push(meter);
            logStep("Meter created", { meterId: meter.id, eventName: meter.event_name });
          } catch (meterError: any) {
            logStep("Meter creation failed (might already exist)", { error: meterError.message });
            results.errors.push(`Meter for ${item.product}: ${meterError.message}`);
          }
        }
      } catch (itemError: any) {
        logStep("Error processing item", { product: item.product, error: itemError.message });
        results.errors.push(`${item.product}: ${itemError.message}`);
      }
    }

    logStep("Deployment completed", {
      products: results.products.length,
      prices: results.prices.length,
      meters: results.meters.length,
      errors: results.errors.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        summary: {
          products_created: results.products.length,
          prices_created: results.prices.length,
          meters_created: results.meters.length,
          errors: results.errors.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR in deploy-billing-model", { message: error.message });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
