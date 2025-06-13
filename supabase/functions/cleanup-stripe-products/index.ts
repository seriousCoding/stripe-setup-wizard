
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-STRIPE-PRODUCTS] ${step}${detailsStr}`);
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

    // Fetch all products
    const products = await stripe.products.list({
      limit: 100,
      active: true
    });

    logStep("All products fetched", { count: products.data.length });

    // Filter products to only include those created by this billing app or with app-specific metadata
    const appProducts = products.data.filter(product => {
      const metadata = product.metadata || {};
      return (
        metadata.created_via === 'stripe_setup_pilot' ||
        metadata.billing_model_type ||
        metadata.tier_id ||
        metadata.usage_limit_api_calls ||
        metadata.meter_rate ||
        metadata.package_credits ||
        metadata.included_usage ||
        // Also include if product name matches common billing patterns
        product.name.toLowerCase().includes('trial') ||
        product.name.toLowerCase().includes('starter') ||
        product.name.toLowerCase().includes('professional') ||
        product.name.toLowerCase().includes('business') ||
        product.name.toLowerCase().includes('enterprise') ||
        product.name.toLowerCase().includes('premium')
      );
    });

    logStep("Filtered app-specific products", { 
      originalCount: products.data.length,
      appProductsCount: appProducts.length 
    });

    const cleanupResults = [];

    // Step 1: Deactivate all app products
    for (const product of appProducts) {
      try {
        await stripe.products.update(product.id, {
          active: false
        });
        
        cleanupResults.push({
          product_id: product.id,
          name: product.name,
          action: 'deactivated',
          status: 'success'
        });
        
        logStep(`Product deactivated: ${product.name}`, { id: product.id });
      } catch (error: any) {
        logStep(`Error deactivating product ${product.name}`, { error: error.message });
        cleanupResults.push({
          product_id: product.id,
          name: product.name,
          action: 'deactivate_failed',
          status: 'error',
          error: error.message
        });
      }
    }

    // Step 2: Get all prices for these products and deactivate them
    for (const product of appProducts) {
      try {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 100
        });

        for (const price of prices.data) {
          try {
            await stripe.prices.update(price.id, {
              active: false
            });
            
            cleanupResults.push({
              price_id: price.id,
              product_id: product.id,
              action: 'price_deactivated',
              status: 'success'
            });
            
            logStep(`Price deactivated`, { priceId: price.id, productId: product.id });
          } catch (error: any) {
            logStep(`Error deactivating price`, { priceId: price.id, error: error.message });
            cleanupResults.push({
              price_id: price.id,
              product_id: product.id,
              action: 'price_deactivate_failed',
              status: 'error',
              error: error.message
            });
          }
        }
      } catch (error: any) {
        logStep(`Error fetching prices for product ${product.id}`, { error: error.message });
      }
    }

    logStep("Cleanup complete", { 
      processedProducts: appProducts.length,
      resultsCount: cleanupResults.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Cleaned up ${appProducts.length} app-specific products`,
        results: cleanupResults,
        summary: {
          products_processed: appProducts.length,
          actions_taken: cleanupResults.length,
          deactivated_products: cleanupResults.filter(r => r.action === 'deactivated' && r.status === 'success').length,
          deactivated_prices: cleanupResults.filter(r => r.action === 'price_deactivated' && r.status === 'success').length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in cleanup-stripe-products", { message: error.message });
    
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
