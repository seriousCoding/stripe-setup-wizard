
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
    let transactionMeter = null;
    let aiProcessingMeter = null;
    
    try {
      // Create transaction meter
      transactionMeter = await stripe.billing.meters.create({
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
      logStep("Transaction meter created", { meterId: transactionMeter.id });

      // Create AI processing meter
      aiProcessingMeter = await stripe.billing.meters.create({
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
      logStep("AI processing meter created", { meterId: aiProcessingMeter.id });

    } catch (meterError: any) {
      logStep("Meter creation failed", { error: meterError.message });
      // Continue without meters if API not available
    }

    // Step 2: Define the subscription products with graduated pricing
    const productDefinitions = [
      {
        id: 'trial',
        name: 'Free Trial',
        description: 'Free trial with 500 included transactions.',
        lookup_key: 'trial_monthly',
        flat_fee: 0,
        tiers: [
          { up_to: 500, unit_amount: 0, flat_amount: 0 },
          { up_to: 'inf', unit_amount: 500, flat_amount: 0 } // $0.05 per transaction after 500
        ],
        metadata: {
          tier_id: 'trial',
          plan_type: 'trial',
          billing_model_type: 'free_trial_graduated',
          created_via: 'subscription_billing_v3'
        }
      },
      {
        id: 'starter',
        name: 'Starter',
        description: 'Perfect for small teams with graduated pricing.',
        lookup_key: 'starter_monthly',
        flat_fee: 1900, // $19.00 monthly base fee
        tiers: [
          { up_to: 1000, unit_amount: 0, flat_amount: 0 }, // First 1000 included
          { up_to: 5000, unit_amount: 200, flat_amount: 0 }, // $0.02 per transaction 1001-5000
          { up_to: 'inf', unit_amount: 150, flat_amount: 0 } // $0.015 per transaction 5001+
        ],
        metadata: {
          tier_id: 'starter',
          plan_type: 'graduated_usage',
          billing_model_type: 'fixed_fee_graduated',
          created_via: 'subscription_billing_v3'
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Great for growing businesses with graduated pricing.',
        lookup_key: 'professional_monthly',
        flat_fee: 4900, // $49.00 monthly base fee
        tiers: [
          { up_to: 5000, unit_amount: 0, flat_amount: 0 }, // First 5000 included
          { up_to: 20000, unit_amount: 150, flat_amount: 0 }, // $0.015 per transaction 5001-20000
          { up_to: 'inf', unit_amount: 100, flat_amount: 0 } // $0.01 per transaction 20001+
        ],
        metadata: {
          tier_id: 'professional',
          plan_type: 'graduated_usage',
          billing_model_type: 'fixed_fee_graduated',
          created_via: 'subscription_billing_v3'
        }
      },
      {
        id: 'business',
        name: 'Business',
        description: 'Unlimited transactions with predictable monthly costs.',
        lookup_key: 'business_monthly',
        flat_fee: 9900, // $99.00 monthly flat rate
        tiers: [
          { up_to: 'inf', unit_amount: 0, flat_amount: 9900 } // Unlimited for flat fee
        ],
        metadata: {
          tier_id: 'business',
          plan_type: 'flat_rate',
          billing_model_type: 'flat_recurring',
          created_via: 'subscription_billing_v3'
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Per-seat pricing with unlimited features for large teams.',
        lookup_key: 'enterprise_monthly',
        flat_fee: 2500, // $25.00 per user/month
        tiers: [
          { up_to: 'inf', unit_amount: 0, flat_amount: 2500 } // Per seat pricing
        ],
        metadata: {
          tier_id: 'enterprise',
          plan_type: 'per_seat',
          billing_model_type: 'per_seat',
          created_via: 'subscription_billing_v3'
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

        // Create graduated pricing with tiers
        const priceCreateData: any = {
          currency: 'usd',
          product: product.id,
          billing_scheme: 'tiered',
          tiers_mode: 'graduated',
          tiers: productDef.tiers,
          lookup_key: productDef.lookup_key,
          metadata: {
            ...productDef.metadata,
            price_type: 'graduated_usage'
          }
        };

        // Add recurring billing for subscription plans
        if (productDef.id !== 'trial') {
          priceCreateData.recurring = {
            interval: 'month',
            usage_type: 'metered',
            aggregate_usage: 'sum'
          };
        }

        // Link to meter if available for usage-based plans
        if (transactionMeter && ['starter', 'professional'].includes(productDef.id)) {
          priceCreateData.billing_scheme = 'tiered';
          priceCreateData.meter_id = transactionMeter.id;
        }

        const graduatedPrice = await stripe.prices.create(priceCreateData);
        logStep(`Graduated price created: ${graduatedPrice.id}`, { 
          tiers: productDef.tiers.length,
          lookup_key: productDef.lookup_key 
        });

        // Create flat fee price for base subscription (if applicable)
        let basePrice = null;
        if (productDef.flat_fee > 0) {
          basePrice = await stripe.prices.create({
            currency: 'usd',
            unit_amount: productDef.flat_fee,
            product: product.id,
            recurring: {
              interval: 'month'
            },
            lookup_key: `${productDef.lookup_key}_base`,
            metadata: {
              ...productDef.metadata,
              price_type: 'base_fee'
            }
          });
          logStep(`Base price created: ${basePrice.id}`, { amount: productDef.flat_fee });
        }

        // Set the graduated price as default for the product
        await stripe.products.update(product.id, {
          default_price: graduatedPrice.id
        });

        results.push({
          product_id: product.id,
          graduated_price_id: graduatedPrice.id,
          base_price_id: basePrice?.id || null,
          tier_id: productDef.id,
          name: productDef.name,
          lookup_key: productDef.lookup_key,
          flat_fee: productDef.flat_fee,
          tiers: productDef.tiers,
          meter_linked: transactionMeter && ['starter', 'professional'].includes(productDef.id),
          status: 'success'
        });

        logStep(`Subscription product setup complete for ${productDef.name}`, {
          productId: product.id,
          graduatedPriceId: graduatedPrice.id,
          basePriceId: basePrice?.id,
          lookupKey: productDef.lookup_key
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
      meters: transactionMeter ? 2 : 0
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Graduated pricing subscription products created successfully',
        results,
        meters: transactionMeter ? [
          { id: transactionMeter.id, display_name: transactionMeter.display_name, event_name: transactionMeter.event_name },
          { id: aiProcessingMeter?.id, display_name: aiProcessingMeter?.display_name, event_name: aiProcessingMeter?.event_name }
        ] : [],
        summary: {
          products_created: results.filter(r => r.status === 'success').length,
          meters_created: transactionMeter ? 2 : 0,
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
