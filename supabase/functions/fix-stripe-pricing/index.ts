
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FIX-STRIPE-PRICING] ${step}${detailsStr}`);
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
      throw new Error('User not authenticated');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get all products with billing_app_v1 metadata
    const products = await stripe.products.list({
      active: true,
      limit: 100
    });

    const appProducts = products.data.filter(product => 
      product.metadata?.created_via === 'billing_app_v1'
    );

    logStep("Found app products", { count: appProducts.length });

    const results = [];

    for (const product of appProducts) {
      const tierId = product.metadata?.tier_id;
      if (!tierId) continue;

      // Get existing prices for this product
      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true
      });

      logStep(`Product ${product.name}`, { 
        productId: product.id, 
        existingPrices: existingPrices.data.length 
      });

      // If no prices exist, create them
      if (existingPrices.data.length === 0) {
        let priceData: any = {
          product: product.id,
          currency: 'usd'
        };

        // Set correct pricing in dollars (converted to cents for Stripe)
        switch (tierId) {
          case 'trial':
            priceData.unit_amount = 0; // Free
            priceData.recurring = { interval: 'month' };
            break;
          case 'starter':
            priceData.unit_amount = 1900; // $19.00
            priceData.recurring = { interval: 'month' };
            break;
          case 'professional':
            priceData.unit_amount = 4900; // $49.00
            priceData.recurring = { interval: 'month' };
            break;
          case 'business':
            priceData.unit_amount = 9900; // $99.00
            priceData.recurring = { interval: 'month' };
            break;
          case 'enterprise':
            priceData.unit_amount = 2500; // $25.00 per seat
            priceData.recurring = { interval: 'month' };
            break;
          default:
            continue;
        }

        const newPrice = await stripe.prices.create(priceData);
        
        // Set as default price
        await stripe.products.update(product.id, {
          default_price: newPrice.id
        });

        results.push({
          product: product.name,
          tier_id: tierId,
          price_created: newPrice.id,
          amount_dollars: priceData.unit_amount / 100,
          status: 'success'
        });

        logStep(`Created price for ${product.name}`, { 
          priceId: newPrice.id, 
          amount: priceData.unit_amount 
        });
      } else {
        results.push({
          product: product.name,
          tier_id: tierId,
          existing_prices: existingPrices.data.length,
          status: 'already_has_prices'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Stripe pricing fixed',
        results,
        summary: {
          products_processed: appProducts.length,
          prices_created: results.filter(r => r.status === 'success').length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    
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
