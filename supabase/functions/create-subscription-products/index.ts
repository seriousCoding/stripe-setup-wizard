
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

    // Define the subscription products with proper pricing structures
    const productDefinitions = [
      {
        id: 'trial',
        name: 'Free Trial',
        description: 'Free trial with 500 included transactions.',
        baseFee: 0, // Free trial base
        metadata: {
          tier_id: 'trial',
          plan_type: 'trial',
          billing_model_type: 'free_trial',
          created_via: 'subscription_billing_v2'
        }
      },
      {
        id: 'starter',
        name: 'Starter',
        description: 'Perfect for small teams with 1,000 included transactions monthly.',
        baseFee: 1900, // $19.00
        metadata: {
          tier_id: 'starter',
          plan_type: 'fixed_overage',
          billing_model_type: 'fixed_fee_overage',
          created_via: 'subscription_billing_v2'
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Great for growing businesses with 5,000 included transactions monthly.',
        baseFee: 4900, // $49.00
        metadata: {
          tier_id: 'professional',
          plan_type: 'fixed_overage',
          billing_model_type: 'fixed_fee_overage',
          created_via: 'subscription_billing_v2'
        }
      },
      {
        id: 'business',
        name: 'Business',
        description: 'Unlimited transactions with predictable monthly costs.',
        baseFee: 9900, // $99.00
        metadata: {
          tier_id: 'business',
          plan_type: 'flat_rate',
          billing_model_type: 'flat_recurring',
          created_via: 'subscription_billing_v2'
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Per-seat pricing with unlimited features for large teams.',
        baseFee: 2500, // $25.00 per user
        metadata: {
          tier_id: 'enterprise',
          plan_type: 'per_seat',
          billing_model_type: 'per_seat',
          created_via: 'subscription_billing_v2'
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

        // Create the subscription price
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

        const price = await stripe.prices.create(priceCreateData);
        logStep(`Price created: ${price.id}`, { amount: productDef.baseFee });

        // Set the price as the default for the product
        await stripe.products.update(product.id, {
          default_price: price.id
        });

        results.push({
          product_id: product.id,
          price_id: price.id,
          tier_id: productDef.id,
          name: productDef.name,
          base_fee: productDef.baseFee,
          status: 'success'
        });

        logStep(`Subscription product setup complete for ${productDef.name}`, {
          productId: product.id,
          priceId: price.id
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
      results: results.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription products created successfully',
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
