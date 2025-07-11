
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESEED-STRIPE-PRODUCTS] ${step}${detailsStr}`);
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

    // Define the products with exact pricing and features from the image
    const productDefinitions = [
      {
        id: 'trial',
        name: 'Free Trial',
        subtitle: 'Trial',
        description: 'Try all features risk-free before committing.',
        price: 0, // $0 - Free
        metadata: {
          tier_id: 'trial',
          plan_type: 'trial',
          billing_model_type: 'free_trial',
          created_via: 'billing_app_v1',
          popular: 'false',
          badge: 'Free Trial',
          subtitle: 'Trial'
        },
        usage_limits: {
          transactions: 500,
          ai_processing: 50,
          meter_rate_after_limit: 0.05
        },
        features: [
          'Full access to all features',
          '500 transaction limit',
          'Basic AI processing',
          'Email support'
        ]
      },
      {
        id: 'starter',
        name: 'Starter',
        subtitle: 'Pay As-You-Go',
        description: 'Perfect for getting started with transaction-based billing.',
        price: 99, // $0.99 per transaction (99 cents)
        metadata: {
          tier_id: 'starter',
          plan_type: 'metered',
          billing_model_type: 'pay_as_you_go',
          created_via: 'billing_app_v1',
          popular: 'false',
          subtitle: 'Pay As-You-Go'
        },
        usage_limits: {
          transactions: 20,
          ai_processing: 5,
          meter_rate_after_limit: 0.05
        },
        features: [
          'Pay only for what you use',
          'No monthly commitment',
          'Basic AI data extraction',
          'Standard support'
        ]
      },
      {
        id: 'professional',
        name: 'Professional',
        subtitle: 'Credit Burndown',
        description: 'Buy credits in advance for better rates and flexibility.',
        price: 4900, // $49.00 prepaid credits (4900 cents)
        metadata: {
          tier_id: 'professional',
          plan_type: 'package',
          billing_model_type: 'credit_burndown',
          created_via: 'billing_app_v1',
          popular: 'true',
          badge: 'Most Popular',
          subtitle: 'Credit Burndown'
        },
        usage_limits: {
          transactions: 1200,
          ai_processing: 300,
          meter_rate_after_limit: 0.04
        },
        features: [
          '1,200 transaction credits',
          '15% discount on bulk purchases',
          'Advanced AI processing',
          'Priority support',
          'Usage analytics'
        ]
      },
      {
        id: 'business',
        name: 'Business',
        subtitle: 'Flat Fee',
        description: 'Unlimited transactions with predictable monthly costs.',
        price: 9900, // $99.00 monthly (9900 cents)
        interval: 'month',
        metadata: {
          tier_id: 'business',
          plan_type: 'recurring',
          billing_model_type: 'flat_recurring',
          created_via: 'billing_app_v1',
          popular: 'false',
          subtitle: 'Flat Fee'
        },
        usage_limits: {
          transactions: 'unlimited',
          ai_processing: 'unlimited',
          unlimited: true
        },
        features: [
          'Unlimited transactions',
          'Unlimited AI processing',
          'Advanced analytics',
          'Dedicated support',
          'Custom integrations'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        subtitle: 'Per Seat',
        description: 'Scale with your team size and organizational needs.',
        price: 2500, // $25.00 per user/month (2500 cents)
        interval: 'month',
        metadata: {
          tier_id: 'enterprise',
          plan_type: 'per_seat',
          billing_model_type: 'per_seat',
          created_via: 'billing_app_v1',
          popular: 'false',
          subtitle: 'Per Seat'
        },
        usage_limits: {
          transactions: 'unlimited',
          ai_processing: 'unlimited',
          unlimited: true
        },
        features: [
          'Unlimited everything',
          'Multi-user management',
          'Advanced security',
          'SLA guarantee',
          'Custom development'
        ]
      }
    ];

    const results = [];

    for (const productDef of productDefinitions) {
      logStep(`Creating product: ${productDef.name}`);
      
      try {
        // Enhanced metadata with usage limits
        const enhancedMetadata = {
          ...productDef.metadata,
          // Usage limits as metadata - handle unlimited values properly
          usage_limit_transactions: productDef.usage_limits.transactions.toString(),
          usage_limit_ai_processing: productDef.usage_limits.ai_processing.toString(),
          meter_rate: productDef.usage_limits.meter_rate_after_limit?.toString() || '0',
          unlimited_features: productDef.usage_limits.unlimited ? 'true' : 'false'
        };

        // Create the product
        const product = await stripe.products.create({
          name: productDef.name,
          description: productDef.description,
          metadata: enhancedMetadata
        });

        logStep(`Product created: ${product.id}`);

        // Create the price
        const priceData: any = {
          currency: 'usd',
          unit_amount: productDef.price,
          product: product.id,
          metadata: enhancedMetadata
        };

        if (productDef.interval) {
          priceData.recurring = { interval: productDef.interval };
        }

        const price = await stripe.prices.create(priceData);

        logStep(`Price created: ${price.id}`);

        // Set as default price for the product
        await stripe.products.update(product.id, {
          default_price: price.id
        });

        results.push({
          product_id: product.id,
          price_id: price.id,
          tier_id: productDef.id,
          name: productDef.name,
          subtitle: productDef.subtitle,
          amount: productDef.price,
          usage_limits: productDef.usage_limits,
          features: productDef.features,
          status: 'success'
        });

        logStep(`Product setup complete for ${productDef.name}`);

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

    logStep("Reseeding complete", { results });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Stripe products reseeded successfully with exact pricing from image',
        results,
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
    logStep("ERROR in reseed-stripe-products", { message: error.message });
    
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
