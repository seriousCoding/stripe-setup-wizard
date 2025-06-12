
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

    // Step 1: Create billing meters for usage tracking
    logStep("Creating billing meters");
    const meters = [];
    
    try {
      // Create transaction meter
      const transactionMeter = await stripe.billing.meters.create({
        display_name: 'API Transactions',
        event_name: 'api_transaction',
        customer_mapping: {
          event_payload_key: 'customer_id',
          type: 'by_id'
        },
        default_aggregation: {
          formula: 'sum'
        },
        value_settings: {
          event_payload_key: 'transaction_count'
        }
      });
      meters.push(transactionMeter);
      logStep("Transaction meter created", { meterId: transactionMeter.id });

      // Create AI processing meter
      const aiMeter = await stripe.billing.meters.create({
        display_name: 'AI Processing',
        event_name: 'ai_processing',
        customer_mapping: {
          event_payload_key: 'customer_id',
          type: 'by_id'
        },
        default_aggregation: {
          formula: 'sum'
        },
        value_settings: {
          event_payload_key: 'processing_count'
        }
      });
      meters.push(aiMeter);
      logStep("AI processing meter created", { meterId: aiMeter.id });

    } catch (meterError: any) {
      logStep("Meter creation skipped", { error: meterError.message });
      // Continue without meters if API not available
    }

    // Step 2: Define the subscription products with proper pricing structures
    const productDefinitions = [
      {
        id: 'trial',
        name: 'Free Trial',
        description: 'Free trial with 500 included transactions.',
        baseFee: 0,
        includedUsage: 500,
        overageRate: 500, // $0.05 per transaction in cents
        metadata: {
          tier_id: 'trial',
          plan_type: 'trial',
          billing_model_type: 'free_trial',
          created_via: 'subscription_billing_v2',
          included_transactions: '500',
          overage_rate_cents: '500'
        }
      },
      {
        id: 'starter',
        name: 'Starter',
        description: 'Perfect for small teams with 1,000 included transactions monthly.',
        baseFee: 1900,
        includedUsage: 1000,
        overageRate: 200, // $0.02 per transaction in cents
        metadata: {
          tier_id: 'starter',
          plan_type: 'fixed_overage',
          billing_model_type: 'fixed_fee_overage',
          created_via: 'subscription_billing_v2',
          included_transactions: '1000',
          overage_rate_cents: '200'
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Great for growing businesses with 5,000 included transactions monthly.',
        baseFee: 4900,
        includedUsage: 5000,
        overageRate: 150, // $0.015 per transaction in cents
        metadata: {
          tier_id: 'professional',
          plan_type: 'fixed_overage',
          billing_model_type: 'fixed_fee_overage',
          created_via: 'subscription_billing_v2',
          included_transactions: '5000',
          overage_rate_cents: '150'
        }
      },
      {
        id: 'business',
        name: 'Business',
        description: 'Unlimited transactions with predictable monthly costs.',
        baseFee: 9900,
        includedUsage: 999999,
        overageRate: 0,
        metadata: {
          tier_id: 'business',
          plan_type: 'flat_rate',
          billing_model_type: 'flat_recurring',
          created_via: 'subscription_billing_v2',
          included_transactions: 'unlimited',
          overage_rate_cents: '0'
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Per-seat pricing with unlimited features for large teams.',
        baseFee: 2500,
        includedUsage: 999999,
        overageRate: 0,
        metadata: {
          tier_id: 'enterprise',
          plan_type: 'per_seat',
          billing_model_type: 'per_seat',
          created_via: 'subscription_billing_v2',
          included_transactions: 'unlimited',
          overage_rate_cents: '0'
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
          metadata: productDef.metadata
        });

        logStep(`Product created: ${product.id}`, { name: product.name });

        // Create the base subscription price
        const priceCreateData: any = {
          currency: 'usd',
          unit_amount: productDef.baseFee,
          product: product.id,
          metadata: {
            ...productDef.metadata,
            price_type: 'base_fee'
          }
        };

        // Add recurring billing for subscription plans
        if (productDef.id !== 'trial') {
          priceCreateData.recurring = {
            interval: 'month'
          };
        }

        const basePrice = await stripe.prices.create(priceCreateData);
        logStep(`Base price created: ${basePrice.id}`, { amount: productDef.baseFee });

        // Create overage price if applicable and meters exist
        let overagePrice = null;
        if (productDef.overageRate > 0 && meters.length > 0) {
          try {
            overagePrice = await stripe.prices.create({
              currency: 'usd',
              unit_amount: productDef.overageRate,
              product: product.id,
              recurring: {
                interval: 'month',
                usage_type: 'metered',
                aggregate_usage: 'sum'
              },
              billing_scheme: 'per_unit',
              metadata: {
                ...productDef.metadata,
                price_type: 'overage',
                meter_id: meters[0].id // Link to transaction meter
              }
            });
            logStep(`Overage price created: ${overagePrice.id}`, { rate: productDef.overageRate });
          } catch (overageError: any) {
            logStep(`Overage price creation failed: ${overageError.message}`);
          }
        }

        // Set the base price as the default for the product
        await stripe.products.update(product.id, {
          default_price: basePrice.id
        });

        results.push({
          product_id: product.id,
          base_price_id: basePrice.id,
          overage_price_id: overagePrice?.id || null,
          tier_id: productDef.id,
          name: productDef.name,
          base_fee: productDef.baseFee,
          included_usage: productDef.includedUsage,
          overage_rate: productDef.overageRate,
          status: 'success'
        });

        logStep(`Subscription product setup complete for ${productDef.name}`, {
          productId: product.id,
          basePriceId: basePrice.id,
          overagePriceId: overagePrice?.id
        });

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

    logStep("Subscription product creation complete", { 
      results: results.length,
      meters: meters.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription products and meters created successfully',
        results,
        meters: meters.map(m => ({ id: m.id, display_name: m.display_name, event_name: m.event_name })),
        summary: {
          products_created: results.filter(r => r.status === 'success').length,
          meters_created: meters.length,
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
