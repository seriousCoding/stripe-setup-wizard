
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

    logStep("User authenticated", { userId: data.user.id });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
    });

    logStep("Creating billing meters for usage tracking");

    // Create meters for transaction and AI processing tracking
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

    logStep("Billing meters created", { 
      transactionMeterId: transactionMeter.id, 
      aiProcessingMeterId: aiProcessingMeter.id 
    });

    // Define billing plans based on the image
    const billingPlans = [
      {
        id: 'starter',
        name: 'Starter',
        subtitle: 'Pay As-You-Go',
        description: 'Perfect for getting started with transaction-based billing.',
        basePrice: 99, // $0.99 in cents
        features: [
          'Pay only for what you use',
          'No monthly commitment', 
          'Basic AI data extraction',
          'Standard support'
        ],
        limits: {
          transactions: 20,
          aiProcessing: 5,
          overageRate: 5 // $0.05 per transaction
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        subtitle: 'Credit Burndown',
        description: 'Buy credits in advance for better rates and flexibility.',
        basePrice: 4900, // $49.00 in cents
        features: [
          '1,200 transaction credits',
          '15% discount on bulk purchases',
          'Advanced AI processing',
          'Priority support',
          'Usage analytics'
        ],
        limits: {
          transactions: 1200,
          aiProcessing: 300,
          overageRate: 4 // $0.04 per transaction
        }
      },
      {
        id: 'business',
        name: 'Business',
        subtitle: 'Flat Fee',
        description: 'Unlimited transactions with predictable monthly costs.',
        basePrice: 9900, // $99.00 in cents
        features: [
          'Unlimited transactions',
          'Unlimited AI processing',
          'Advanced analytics',
          'Dedicated support',
          'Custom integrations'
        ],
        limits: {
          transactions: 'unlimited',
          aiProcessing: 'unlimited'
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        subtitle: 'Per Seat',
        description: 'Scale with your team size and organizational needs.',
        basePrice: 2500, // $25.00 in cents per seat
        features: [
          'Unlimited everything per user',
          'Multi-user management',
          'Advanced security',
          'SLA guarantee',
          'Custom development'
        ],
        limits: {
          transactions: 'unlimited',
          aiProcessing: 'unlimited'
        }
      },
      {
        id: 'trial',
        name: 'Free Trial',
        subtitle: 'Trial',
        description: 'Try all features risk-free before committing.',
        basePrice: 0, // Free trial
        features: [
          'Full access to all features',
          '500 transaction limit',
          'Basic AI processing',
          'Email support'
        ],
        limits: {
          transactions: 500,
          aiProcessing: 50,
          overageRate: 5 // $0.05 per transaction after trial
        }
      }
    ];

    const results = [];

    for (const plan of billingPlans) {
      logStep(`Creating plan: ${plan.name}`);
      
      try {
        // Create the product
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: {
            tier_id: plan.id,
            subtitle: plan.subtitle,
            plan_type: plan.id === 'enterprise' ? 'per_seat' : 
                      plan.id === 'business' ? 'flat_rate' : 
                      plan.id === 'trial' ? 'trial' : 'usage_based',
            transaction_meter_id: transactionMeter.id,
            ai_processing_meter_id: aiProcessingMeter.id,
            features: plan.features.join('|'),
            transaction_limit: plan.limits.transactions.toString(),
            ai_processing_limit: plan.limits.aiProcessing.toString(),
            overage_rate: plan.limits.overageRate?.toString() || '0'
          }
        });

        logStep(`Product created: ${product.id}`);

        // Create base recurring price
        let priceData: any = {
          currency: 'usd',
          product: product.id,
          metadata: {
            tier_id: plan.id,
            price_type: 'base_recurring'
          },
          recurring: {
            interval: 'month',
            usage_type: 'licensed'
          }
        };

        if (plan.id === 'business' || plan.id === 'enterprise') {
          // Flat rate pricing
          priceData.billing_scheme = 'per_unit';
          priceData.unit_amount = plan.basePrice;
        } else if (plan.id === 'trial') {
          // Free trial with graduated overage
          priceData.billing_scheme = 'tiered';
          priceData.tiers_mode = 'graduated';
          priceData.tiers = [
            {
              up_to: plan.limits.transactions,
              unit_amount: 0,
              flat_amount: 0
            },
            {
              up_to: null, // unlimited
              unit_amount: (plan.limits.overageRate || 0) * 100, // Convert to cents
              flat_amount: 0
            }
          ];
          priceData.recurring.usage_type = 'metered';
          priceData.recurring.meter = transactionMeter.id;
        } else {
          // Usage-based with base fee and graduated overage
          priceData.billing_scheme = 'tiered';
          priceData.tiers_mode = 'graduated';
          priceData.tiers = [
            {
              up_to: plan.limits.transactions,
              unit_amount: 0,
              flat_amount: plan.basePrice
            },
            {
              up_to: null, // unlimited
              unit_amount: (plan.limits.overageRate || 0) * 100, // Convert to cents
              flat_amount: 0
            }
          ];
          priceData.recurring.usage_type = 'metered';
          priceData.recurring.meter = transactionMeter.id;
        }

        const price = await stripe.prices.create(priceData);
        logStep(`Price created: ${price.id}`);

        // Set as default price
        await stripe.products.update(product.id, {
          default_price: price.id
        });

        results.push({
          product_id: product.id,
          price_id: price.id,
          tier_id: plan.id,
          name: plan.name,
          status: 'success'
        });

        logStep(`Plan setup complete for ${plan.name}`);

      } catch (error: any) {
        logStep(`Error creating plan ${plan.name}`, { error: error.message });
        results.push({
          tier_id: plan.id,
          name: plan.name,
          error: error.message,
          status: 'error'
        });
      }
    }

    logStep("Billing initialization complete", { 
      results: results.length,
      transactionMeterId: transactionMeter.id,
      aiProcessingMeterId: aiProcessingMeter.id
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Stripe billing system initialized successfully',
        results,
        meters: {
          transaction_meter_id: transactionMeter.id,
          ai_processing_meter_id: aiProcessingMeter.id
        },
        summary: {
          plans_created: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length
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
