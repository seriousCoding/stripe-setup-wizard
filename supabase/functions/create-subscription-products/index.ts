
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-PRODUCTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured in Supabase secrets');
    }
    logStep("Stripe secret key found");

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data.user) {
      logStep("Auth error", { error: authError });
      throw new Error('User not authenticated');
    }

    logStep("User authenticated", { email: data.user.email });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // First, create meters for usage tracking
    logStep("Creating usage meters");
    
    let transactionMeter;
    try {
      transactionMeter = await stripe.billing.meters.create({
        display_name: 'Transaction Usage',
        event_name: 'transaction_processed',
        customer_mapping: {
          event_payload_key: 'customer_id',
          type: 'by_id'
        },
        default_aggregation: {
          formula: 'sum'
        },
        value_settings: {
          event_payload_key: 'quantity'
        }
      });
      logStep("Transaction meter created", { meterId: transactionMeter.id });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        // Meter already exists, find it
        const meters = await stripe.billing.meters.list({ limit: 100 });
        transactionMeter = meters.data.find(m => m.event_name === 'transaction_processed');
        logStep("Using existing transaction meter", { meterId: transactionMeter?.id });
      } else {
        throw error;
      }
    }

    // Define the subscription-based products
    const productDefinitions = [
      {
        id: 'trial',
        name: 'Free Trial',
        description: 'Free trial with 500 included transactions, then overage billing.',
        baseFee: 0, // Free trial
        includedUsage: 500,
        overageRate: 0.05, // $0.05 per transaction after 500
        metadata: {
          tier_id: 'trial',
          plan_type: 'fixed_overage',
          billing_model_type: 'fixed_fee_overage'
        }
      },
      {
        id: 'starter',
        name: 'Starter',
        description: 'Perfect for small teams with 1,000 included transactions monthly.',
        baseFee: 1900, // $19.00
        includedUsage: 1000,
        overageRate: 0.02, // $0.02 per transaction after 1,000
        metadata: {
          tier_id: 'starter',
          plan_type: 'fixed_overage',
          billing_model_type: 'fixed_fee_overage'
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Great for growing businesses with 5,000 included transactions monthly.',
        baseFee: 4900, // $49.00
        includedUsage: 5000,
        overageRate: 0.015, // $0.015 per transaction after 5,000
        metadata: {
          tier_id: 'professional',
          plan_type: 'fixed_overage',
          billing_model_type: 'fixed_fee_overage'
        }
      },
      {
        id: 'business',
        name: 'Business',
        description: 'Unlimited transactions with predictable monthly costs.',
        baseFee: 9900, // $99.00
        unlimited: true,
        metadata: {
          tier_id: 'business',
          plan_type: 'flat_rate',
          billing_model_type: 'flat_recurring'
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Per-seat pricing with unlimited features for large teams.',
        baseFee: 2500, // $25.00 per user
        unlimited: true,
        perSeat: true,
        metadata: {
          tier_id: 'enterprise',
          plan_type: 'per_seat',
          billing_model_type: 'per_seat'
        }
      }
    ];

    const results = [];

    for (const productDef of productDefinitions) {
      logStep(`Creating subscription product: ${productDef.name}`);
      
      try {
        // Create the product
        const product = await stripe.products.create({
          name: productDef.name,
          description: productDef.description,
          metadata: {
            ...productDef.metadata,
            created_via: 'subscription_billing_v2',
            included_usage: productDef.includedUsage?.toString() || '0',
            overage_rate: productDef.overageRate?.toString() || '0',
            unlimited: productDef.unlimited ? 'true' : 'false'
          }
        });

        logStep(`Product created: ${product.id}`);
        const priceIds = [];

        // Create base monthly fee price (flat rate)
        const basePriceData: any = {
          currency: 'usd',
          unit_amount: productDef.baseFee,
          product: product.id,
          recurring: {
            interval: 'month',
            usage_type: 'licensed'
          },
          metadata: {
            ...productDef.metadata,
            price_type: 'base_fee',
            included_usage: productDef.includedUsage?.toString() || '0'
          }
        };

        const basePrice = await stripe.prices.create(basePriceData);
        priceIds.push(basePrice.id);
        logStep(`Base price created: ${basePrice.id}`);

        // Create overage price for fixed fee + overage plans
        if (!productDef.unlimited && productDef.overageRate && transactionMeter) {
          const overagePriceData: any = {
            currency: 'usd',
            billing_scheme: 'tiered',
            recurring: {
              interval: 'month',
              usage_type: 'metered',
              meter: transactionMeter.id
            },
            product: product.id,
            tiers_mode: 'volume',
            tiers: [
              {
                up_to: productDef.includedUsage,
                unit_amount_decimal: '0' // Free up to included usage
              },
              {
                up_to: 'inf',
                unit_amount_decimal: (productDef.overageRate * 100).toString() // Overage rate in cents
              }
            ],
            metadata: {
              ...productDef.metadata,
              price_type: 'overage',
              overage_rate: productDef.overageRate.toString()
            }
          };

          const overagePrice = await stripe.prices.create(overagePriceData);
          priceIds.push(overagePrice.id);
          logStep(`Overage price created: ${overagePrice.id}`);
        }

        // Set the base price as default
        await stripe.products.update(product.id, {
          default_price: priceIds[0]
        });

        results.push({
          product_id: product.id,
          price_ids: priceIds,
          tier_id: productDef.id,
          name: productDef.name,
          base_fee: productDef.baseFee,
          included_usage: productDef.includedUsage || 0,
          overage_rate: productDef.overageRate || 0,
          unlimited: productDef.unlimited || false,
          status: 'success'
        });

        logStep(`Subscription product setup complete for ${productDef.name}`);

      } catch (error: any) {
        logStep(`Error creating product ${productDef.name}`, { error: error.message });
        results.push({
          tier_id: productDef.id,
          name: productDef.name,
          error: error.message,
          status: 'error'
        });
      }
    }

    logStep("Subscription product creation complete", { results });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription-based products created successfully',
        results,
        transaction_meter_id: transactionMeter?.id,
        summary: {
          products_created: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in create-subscription-products", { message: error.message });
    
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
