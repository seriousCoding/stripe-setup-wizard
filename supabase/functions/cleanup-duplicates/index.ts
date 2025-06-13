import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-DUPLICATES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
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

    // Get all products
    const products = await stripe.products.list({
      limit: 100,
      active: true
    });

    logStep("All products fetched", { count: products.data.length });

    // Filter for app products (created by our app)
    const appProducts = products.data.filter(product => 
      product.metadata?.created_via === 'billing_app_v1' ||
      product.metadata?.created_via === 'stripe_setup_pilot' ||
      product.metadata?.created_via === 'stripe_billing_pilot'
    );

    logStep("App products found", { count: appProducts.length });

    // Group products by tier_id to find duplicates
    const productsByTier: { [key: string]: any[] } = {};
    
    appProducts.forEach(product => {
      const tierId = product.metadata?.tier_id || 'unknown';
      if (!productsByTier[tierId]) {
        productsByTier[tierId] = [];
      }
      productsByTier[tierId].push(product);
    });

    const results = [];

    // Process each tier group
    for (const [tierId, tierProducts] of Object.entries(productsByTier)) {
      if (tierProducts.length <= 1) {
        logStep(`No duplicates for tier: ${tierId}`);
        continue;
      }

      logStep(`Found ${tierProducts.length} products for tier: ${tierId}`);

      // Sort by creation date (keep the newest recurring one)
      tierProducts.sort((a, b) => b.created - a.created);

      let keptProduct = null;
      const productsToDeactivate = [];

      // Find the best product to keep (prefer recurring monthly)
      for (const product of tierProducts) {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true
        });

        const hasRecurringMonthly = prices.data.some(price => 
          price.recurring?.interval === 'month'
        );

        if (hasRecurringMonthly && !keptProduct) {
          keptProduct = product;
          logStep(`Keeping recurring product for ${tierId}`, { 
            productId: product.id, 
            name: product.name 
          });
        } else {
          productsToDeactivate.push(product);
        }
      }

      // If no recurring product found, keep the newest one
      if (!keptProduct && tierProducts.length > 0) {
        keptProduct = tierProducts[0];
        productsToDeactivate.splice(0, 1); // Remove from deactivation list
        logStep(`No recurring product found, keeping newest for ${tierId}`, { 
          productId: keptProduct.id 
        });
      }

      // Deactivate duplicate products
      for (const product of productsToDeactivate) {
        try {
          // Deactivate all prices for this product first
          const prices = await stripe.prices.list({
            product: product.id
          });

          for (const price of prices.data) {
            if (price.active) {
              await stripe.prices.update(price.id, { active: false });
              logStep(`Price deactivated`, { 
                priceId: price.id, 
                productId: product.id 
              });
            }
          }

          // Deactivate the product
          await stripe.products.update(product.id, {
            active: false
          });

          logStep(`Product deactivated: ${product.name}`, { id: product.id });
          
          results.push({
            product_id: product.id,
            name: product.name,
            tier_id: tierId,
            action: 'deactivated',
            status: 'success'
          });

        } catch (error: any) {
          logStep(`Error deactivating product ${product.id}`, { error: error.message });
          results.push({
            product_id: product.id,
            name: product.name,
            tier_id: tierId,
            action: 'deactivated',
            status: 'error',
            error: error.message
          });
        }
      }
    }

    logStep("Cleanup complete", { 
      processedTiers: Object.keys(productsByTier).length,
      resultsCount: results.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Duplicate products cleanup completed',
        results,
        summary: {
          tiers_processed: Object.keys(productsByTier).length,
          products_deactivated: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in cleanup-duplicates", { message: error.message });
    
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
