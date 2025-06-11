
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

    // Define the clean product definitions with proper app identification
    const productDefinitions = [
      {
        id: 'trial',
        name: 'Free Trial',
        description: 'Try all features risk-free with generous limits.',
        price: 0, // Free
        metadata: {
          tier_id: 'trial',
          plan_type: 'trial',
          billing_model_type: 'free_trial',
          created_via: 'billing_app_v1',
          usage_limit_transactions: '500',
          usage_limit_ai_processing: '50',
          usage_limit_data_exports: '10',
          usage_limit_api_calls: '1000',
          included_usage: '500',
          usage_unit: 'transactions'
        }
      },
      {
        id: 'starter',
        name: 'Starter',
        description: 'Pay-as-you-go pricing perfect for getting started.',
        price: 99, // $0.99 base
        metadata: {
          tier_id: 'starter',
          plan_type: 'metered',
          billing_model_type: 'pay_as_you_go',
          created_via: 'billing_app_v1',
          meter_rate: '0.05',
          usage_unit: 'transactions',
          included_usage: '100'
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Credit packages with better rates and flexibility.',
        price: 4900, // $49.00 package
        metadata: {
          tier_id: 'professional',
          plan_type: 'package',
          billing_model_type: 'credit_burndown',
          created_via: 'billing_app_v1',
          package_credits: '1200',
          meter_rate: '0.04',
          usage_unit: 'transactions'
        }
      },
      {
        id: 'business',
        name: 'Business',
        description: 'Unlimited usage with predictable monthly costs.',
        price: 9900, // $99.00 monthly
        interval: 'month',
        metadata: {
          tier_id: 'business',
          plan_type: 'recurring',
          billing_model_type: 'flat_recurring',
          created_via: 'billing_app_v1',
          usage_limit_transactions: 'unlimited',
          usage_limit_ai_processing: 'unlimited',
          usage_limit_data_exports: 'unlimited',
          usage_limit_api_calls: 'unlimited'
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Per-seat pricing that scales with your team.',
        price: 2500, // $25.00 per seat monthly
        interval: 'month',
        metadata: {
          tier_id: 'enterprise',
          plan_type: 'per_seat',
          billing_model_type: 'per_seat',
          created_via: 'billing_app_v1',
          usage_limit_transactions: 'unlimited',
          usage_limit_ai_processing: 'unlimited',
          usage_limit_data_exports: 'unlimited',
          usage_limit_api_calls: 'unlimited',
          per_seat_features: 'true'
        }
      }
    ];

    const results = [];

    for (const productDef of productDefinitions) {
      logStep(`Creating product: ${productDef.name}`);
      
      try {
        // Create the product
        const product = await stripe.products.create({
          name: productDef.name,
          description: productDef.description,
          metadata: productDef.metadata
        });

        logStep(`Product created: ${product.id}`);

        // Create the price
        const priceData: any = {
          currency: 'usd',
          unit_amount: productDef.price,
          product: product.id,
          metadata: productDef.metadata
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
          amount: productDef.price,
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
        message: 'Stripe products reseeded successfully',
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
