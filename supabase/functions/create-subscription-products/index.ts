
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

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    logStep("Stripe client initialized");

    const { products } = await req.json();

    const results = {
      products: [],
      prices: [],
      errors: []
    };

    // Create products and prices for each tier
    for (const tier of products) {
      try {
        logStep("Processing tier", { name: tier.name, id: tier.id });

        // Check if product already exists
        const existingProducts = await stripe.products.search({
          query: `metadata['tier_id']:'${tier.id}'`,
        });

        let product;
        if (existingProducts.data.length > 0) {
          product = existingProducts.data[0];
          logStep("Product already exists", { productId: product.id, name: product.name });
        } else {
          // Create product
          product = await stripe.products.create({
            name: tier.name,
            description: tier.description,
            type: 'service',
            metadata: {
              user_id: user.id,
              tier_id: tier.id,
              tier_badge: tier.badge || '',
              created_by: 'subscription-products-generator'
            }
          });

          results.products.push(product);
          logStep("Product created", { productId: product.id, name: product.name });
        }

        // Create price based on tier type
        const priceData: any = {
          product: product.id,
          currency: tier.currency.toLowerCase(),
          metadata: {
            tier_id: tier.id,
            user_id: user.id
          }
        };

        if (tier.id === 'starter') {
          // Pay-as-you-go pricing
          priceData.unit_amount = Math.round(tier.price * 100); // $0.05 in cents
          priceData.billing_scheme = 'per_unit';
        } else if (tier.id === 'professional') {
          // One-time payment for credits
          priceData.unit_amount = Math.round(tier.price * 100); // $49 in cents
        } else if (tier.id === 'business' || tier.id === 'enterprise') {
          // Recurring subscription
          priceData.unit_amount = Math.round(tier.price * 100);
          priceData.recurring = {
            interval: 'month'
          };
        } else if (tier.id === 'trial') {
          // Free trial - create a $0 price
          priceData.unit_amount = 0;
        }

        // Check if price already exists
        const existingPrices = await stripe.prices.list({
          product: product.id,
          limit: 1
        });

        if (existingPrices.data.length === 0) {
          const price = await stripe.prices.create(priceData);
          results.prices.push(price);
          logStep("Price created", { priceId: price.id, amount: price.unit_amount });

          // Update product to set default price
          await stripe.products.update(product.id, {
            default_price: price.id
          });
        } else {
          logStep("Price already exists for product", { productId: product.id });
        }

      } catch (tierError: any) {
        logStep("Error processing tier", { tier: tier.name, error: tierError.message });
        results.errors.push(`${tier.name}: ${tierError.message}`);
      }
    }

    logStep("Products creation completed", {
      products: results.products.length,
      prices: results.prices.length,
      errors: results.errors.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        summary: {
          products_created: results.products.length,
          prices_created: results.prices.length,
          errors: results.errors.length
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
