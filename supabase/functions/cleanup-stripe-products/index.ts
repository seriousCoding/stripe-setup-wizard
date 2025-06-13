
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-STRIPE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cleanup function started");

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

    logStep("Starting cleanup of Stripe products and prices");

    // Get all products first
    const products = await stripe.products.list({ limit: 100 });
    logStep("Found products to cleanup", { count: products.data.length });

    let cleanupCount = 0;
    let skippedCount = 0;

    // Archive products (this will also handle associated prices)
    for (const product of products.data) {
      if (product.active) {
        try {
          await stripe.products.update(product.id, { active: false });
          cleanupCount++;
          logStep("Archived product", { productId: product.id, name: product.name });
        } catch (productError: any) {
          logStep("Could not archive product", { 
            productId: product.id, 
            name: product.name, 
            error: productError.message 
          });
          skippedCount++;
        }
      }
    }

    // Get all prices and archive them (handling default price issues)
    const prices = await stripe.prices.list({ limit: 100 });
    logStep("Found prices to cleanup", { count: prices.data.length });

    let pricesArchived = 0;
    let pricesSkipped = 0;

    for (const price of prices.data) {
      if (price.active) {
        try {
          await stripe.prices.update(price.id, { active: false });
          pricesArchived++;
          logStep("Archived price", { priceId: price.id });
        } catch (priceError: any) {
          // Skip default prices that can't be archived
          if (priceError.message.includes('default price')) {
            logStep("Skipped default price", { priceId: price.id });
            pricesSkipped++;
          } else {
            logStep("Could not archive price", { 
              priceId: price.id, 
              error: priceError.message 
            });
            pricesSkipped++;
          }
        }
      }
    }

    // Get all billing meters and deactivate them
    let metersDeactivated = 0;
    try {
      const meters = await stripe.billing.meters.list({ limit: 100 });
      logStep("Found meters to cleanup", { count: meters.data.length });

      for (const meter of meters.data) {
        if (meter.status === 'active') {
          try {
            await stripe.billing.meters.update(meter.id, { status: 'inactive' });
            metersDeactivated++;
            logStep("Deactivated meter", { meterId: meter.id });
          } catch (meterError: any) {
            logStep("Could not deactivate meter", { 
              meterId: meter.id, 
              error: meterError.message 
            });
          }
        }
      }
    } catch (meterListError: any) {
      logStep("Could not list meters", { error: meterListError.message });
    }

    logStep("Cleanup completed", { 
      productsArchived: cleanupCount,
      productsSkipped: skippedCount,
      pricesArchived,
      pricesSkipped,
      metersDeactivated
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Cleanup completed. Archived ${cleanupCount} products, ${pricesArchived} prices, and deactivated ${metersDeactivated} meters. Skipped ${skippedCount + pricesSkipped} items that couldn't be archived.`,
        data: {
          productsArchived: cleanupCount,
          productsSkipped: skippedCount,
          pricesArchived,
          pricesSkipped,
          metersDeactivated
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in cleanup-stripe-products", { message: error.message, stack: error.stack });
    
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
