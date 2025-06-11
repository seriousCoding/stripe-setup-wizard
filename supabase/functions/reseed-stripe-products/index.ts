
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

    // Define the products with exact usage limits from the image
    const productDefinitions = [
      {
        id: 'starter',
        name: 'Starter',
        subtitle: 'Pay As-You-Go',
        description: 'Perfect for getting started with transaction-based billing.',
        price: 99, // $0.99 per transaction
        metadata: {
          tier_id: 'starter',
          plan_type: 'metered',
          billing_model_type: 'pay_as_you_go',
          created_via: 'billing_app_v1',
          popular: 'false'
        },
        usage_limits: {
          transactions: 20,
          ai_processing: 5,
          data_exports: 2,
          api_calls: 100,
          storage_gb: 1,
          integrations: 2,
          meter_rate_after_limit: 0.05
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        subtitle: 'Credit Burndown',
        description: 'Buy credits in advance for better rates and flexibility.',
        price: 4900, // $49.00 package
        metadata: {
          tier_id: 'professional',
          plan_type: 'package',
          billing_model_type: 'credit_burndown',
          created_via: 'billing_app_v1',
          popular: 'true',
          badge: 'Most Popular'
        },
        usage_limits: {
          transactions: 1200,
          ai_processing: 300,
          data_exports: 50,
          api_calls: 5000,
          storage_gb: 50,
          integrations: 10,
          meter_rate_after_limit: 0.04
        }
      },
      {
        id: 'business',
        name: 'Business',
        subtitle: 'Flat Fee',
        description: 'Unlimited transactions with predictable monthly costs.',
        price: 9900, // $99.00 monthly
        interval: 'month',
        metadata: {
          tier_id: 'business',
          plan_type: 'recurring',
          billing_model_type: 'flat_recurring',
          created_via: 'billing_app_v1',
          popular: 'false'
        },
        usage_limits: {
          transactions: 'unlimited',
          ai_processing: 'unlimited',
          data_exports: 'unlimited',
          api_calls: 'unlimited',
          storage_gb: 'unlimited',
          integrations: 'unlimited',
          unlimited: true
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        subtitle: 'Per Seat',
        description: 'Scale with your team size and organizational needs.',
        price: 2500, // $25.00 per seat monthly
        interval: 'month',
        metadata: {
          tier_id: 'enterprise',
          plan_type: 'per_seat',
          billing_model_type: 'per_seat',
          created_via: 'billing_app_v1',
          popular: 'false'
        },
        usage_limits: {
          transactions: 'unlimited',
          ai_processing: 'unlimited',
          data_exports: 'unlimited',
          api_calls: 'unlimited',
          storage_gb: 'unlimited',
          integrations: 'unlimited',
          team_seats: 'unlimited',
          unlimited: true
        }
      },
      {
        id: 'trial',
        name: 'Free Trial',
        subtitle: 'Trial',
        description: 'Try all features risk-free before committing.',
        price: 0, // Free
        metadata: {
          tier_id: 'trial',
          plan_type: 'trial',
          billing_model_type: 'free_trial',
          created_via: 'billing_app_v1',
          popular: 'false',
          badge: 'Free Trial'
        },
        usage_limits: {
          transactions: 500,
          ai_processing: 50,
          data_exports: 10,
          api_calls: 1000,
          storage_gb: 5,
          integrations: 1,
          meter_rate_after_limit: 0.05
        }
      }
    ];

    const results = [];

    for (const productDef of productDefinitions) {
      logStep(`Creating product: ${productDef.name}`);
      
      try {
        // Enhanced metadata with usage limits
        const enhancedMetadata = {
          ...productDef.metadata,
          subtitle: productDef.subtitle,
          // Usage limits as metadata - handle unlimited values
          usage_limit_transactions: productDef.usage_limits.transactions.toString(),
          usage_limit_ai_processing: productDef.usage_limits.ai_processing.toString(),
          usage_limit_data_exports: productDef.usage_limits.data_exports.toString(),
          usage_limit_api_calls: productDef.usage_limits.api_calls.toString(),
          usage_limit_storage_gb: productDef.usage_limits.storage_gb?.toString() || '0',
          usage_limit_integrations: productDef.usage_limits.integrations?.toString() || '0',
          usage_limit_team_seats: productDef.usage_limits.team_seats?.toString() || '0',
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
        message: 'Stripe products reseeded successfully with exact usage limits from design',
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
