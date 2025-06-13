
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INITIALIZE-STRIPE-BILLING] ${step}${detailsStr}`);
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

    // Create meters for tracking usage
    const meters = [];
    
    try {
      // Transaction meter
      const transactionMeter = await stripe.billing.meters.create({
        display_name: 'Transaction Usage',
        event_name: 'transaction_usage',
        default_aggregation: {
          formula: 'sum',
        },
        customer_mapping: {
          event_payload_key: 'stripe_customer_id',
          type: 'by_id',
        },
        value_settings: {
          event_payload_key: 'value',
        },
      });
      meters.push(transactionMeter);
      logStep("Transaction meter created", { meterId: transactionMeter.id });

      // AI Processing meter
      const aiProcessingMeter = await stripe.billing.meters.create({
        display_name: 'AI Processing Usage',
        event_name: 'ai_processing_usage',
        default_aggregation: {
          formula: 'sum',
        },
        customer_mapping: {
          event_payload_key: 'stripe_customer_id',
          type: 'by_id',
        },
        value_settings: {
          event_payload_key: 'value',
        },
      });
      meters.push(aiProcessingMeter);
      logStep("AI Processing meter created", { meterId: aiProcessingMeter.id });
    } catch (error: any) {
      logStep("Meter creation failed, continuing without meters", { error: error.message });
    }

    // Define the billing plans based on the pricing image
    const billingPlans = [
      {
        id: 'starter',
        name: 'Starter',
        subtitle: 'Pay As-You-Go',
        description: 'Perfect for getting started with transaction-based billing.',
        price: 99, // $0.99 per transaction
        type: 'per_unit',
        metadata: {
          tier_id: 'starter',
          billing_model_type: 'pay_as_you_go',
          usage_limit_transactions: '20',
          usage_limit_ai_processing: '5',
          overage_rate: '0.05'
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        subtitle: 'Credit Burndown',
        description: 'Buy credits in advance for better rates and flexibility.',
        price: 4900, // $49 prepaid credits
        type: 'one_time',
        metadata: {
          tier_id: 'professional',
          billing_model_type: 'credit_burndown',
          usage_limit_transactions: '1200',
          usage_limit_ai_processing: '300',
          overage_rate: '0.04',
          popular: 'true'
        }
      },
      {
        id: 'business',
        name: 'Business',
        subtitle: 'Flat Fee',
        description: 'Unlimited transactions with predictable monthly costs.',
        price: 9900, // $99 per month
        type: 'recurring',
        interval: 'month',
        metadata: {
          tier_id: 'business',
          billing_model_type: 'flat_recurring',
          usage_limit_transactions: 'unlimited',
          usage_limit_ai_processing: 'unlimited'
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        subtitle: 'Per Seat',
        description: 'Scale with your team size and organizational needs.',
        price: 2500, // $25 per user/month
        type: 'recurring',
        interval: 'month',
        metadata: {
          tier_id: 'enterprise',
          billing_model_type: 'per_seat',
          usage_limit_transactions: 'unlimited',
          usage_limit_ai_processing: 'unlimited'
        }
      },
      {
        id: 'trial',
        name: 'Free Trial',
        subtitle: 'Trial',
        description: 'Try all features risk-free before committing.',
        price: 0, // Free
        type: 'recurring',
        interval: 'month',
        metadata: {
          tier_id: 'trial',
          billing_model_type: 'free_trial',
          usage_limit_transactions: '500',
          usage_limit_ai_processing: '50',
          overage_rate: '0.05',
          badge: 'Free Trial'
        }
      }
    ];

    const results = [];

    for (const plan of billingPlans) {
      logStep(`Creating billing plan: ${plan.name}`);
      
      try {
        // Create the product
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: {
            ...plan.metadata,
            created_via: 'stripe_billing_pilot',
            subtitle: plan.subtitle
          }
        });

        logStep(`Product created: ${product.id}`, { name: product.name });

        // Create the main price
        const priceData: any = {
          currency: 'usd',
          product: product.id,
          metadata: {
            ...plan.metadata,
            price_type: plan.type
          }
        };

        if (plan.type === 'recurring') {
          priceData.recurring = { interval: plan.interval || 'month' };
          priceData.unit_amount = plan.price;
        } else if (plan.type === 'per_unit') {
          priceData.unit_amount = plan.price;
        } else {
          priceData.unit_amount = plan.price;
        }

        const price = await stripe.prices.create(priceData);
        logStep(`Main price created: ${price.id}`, { amount: plan.price });

        // Create graduated pricing for usage limits if applicable
        const additionalPrices = [];
        if (plan.metadata.overage_rate && meters.length > 0) {
          // Create overage pricing for transactions
          const transactionOveragePrice = await stripe.prices.create({
            currency: 'usd',
            product: product.id,
            billing_scheme: 'tiered',
            tiers_mode: 'graduated',
            recurring: {
              interval: 'month',
              usage_type: 'metered',
              meter: meters[0].id // Transaction meter
            },
            tiers: [
              {
                up_to: parseInt(plan.metadata.usage_limit_transactions) || 20,
                unit_amount: 0,
                flat_amount: 0
              },
              {
                up_to: null, // Unlimited
                unit_amount: Math.round(parseFloat(plan.metadata.overage_rate) * 100),
                flat_amount: 0
              }
            ],
            metadata: {
              ...plan.metadata,
              price_type: 'overage_transactions',
              meter_id: meters[0].id
            }
          });
          additionalPrices.push(transactionOveragePrice);
          logStep(`Transaction overage price created: ${transactionOveragePrice.id}`);

          // Create overage pricing for AI processing
          if (meters.length > 1) {
            const aiOveragePrice = await stripe.prices.create({
              currency: 'usd',
              product: product.id,
              billing_scheme: 'tiered',
              tiers_mode: 'graduated',
              recurring: {
                interval: 'month',
                usage_type: 'metered',
                meter: meters[1].id // AI Processing meter
              },
              tiers: [
                {
                  up_to: parseInt(plan.metadata.usage_limit_ai_processing) || 5,
                  unit_amount: 0,
                  flat_amount: 0
                },
                {
                  up_to: null,
                  unit_amount: Math.round(parseFloat(plan.metadata.overage_rate) * 100),
                  flat_amount: 0
                }
              ],
              metadata: {
                ...plan.metadata,
                price_type: 'overage_ai_processing',
                meter_id: meters[1].id
              }
            });
            additionalPrices.push(aiOveragePrice);
            logStep(`AI processing overage price created: ${aiOveragePrice.id}`);
          }
        }

        // Set the main price as default
        await stripe.products.update(product.id, {
          default_price: price.id
        });

        results.push({
          product_id: product.id,
          price_id: price.id,
          additional_prices: additionalPrices.map(p => p.id),
          tier_id: plan.id,
          name: plan.name,
          subtitle: plan.subtitle,
          amount: plan.price,
          type: plan.type,
          status: 'success'
        });

        logStep(`Billing plan setup complete for ${plan.name}`, {
          productId: product.id,
          priceId: price.id,
          additionalPrices: additionalPrices.length
        });

      } catch (error: any) {
        logStep(`Error creating billing plan ${plan.name}`, { error: error.message });
        results.push({
          tier_id: plan.id,
          name: plan.name,
          error: error.message,
          status: 'error'
        });
      }
    }

    logStep("Stripe billing initialization complete", { 
      results: results.length,
      meters_created: meters.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Stripe billing system initialized successfully',
        results,
        meters: meters.map(m => ({ id: m.id, display_name: m.display_name })),
        summary: {
          products_created: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length,
          meters_created: meters.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in initialize-stripe-billing", { message: error.message });
    
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
