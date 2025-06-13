
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESEED-STRIPE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Reseed function started");

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

    logStep("Starting reseed of Stripe test data");

    // Create sample products and prices
    const sampleProducts = [
      {
        name: 'Basic Plan',
        description: 'Perfect for individuals and small teams getting started',
        prices: [
          { amount: 999, interval: 'month' },
          { amount: 9999, interval: 'year' }
        ]
      },
      {
        name: 'Pro Plan',
        description: 'Advanced features for growing businesses',
        prices: [
          { amount: 2999, interval: 'month' },
          { amount: 29999, interval: 'year' }
        ]
      },
      {
        name: 'API Usage',
        description: 'Pay-as-you-go API usage charges',
        prices: [
          { amount: 50, type: 'one_time' }
        ]
      }
    ];

    const createdProducts = [];
    const createdPrices = [];
    const createdMeters = [];

    for (const productData of sampleProducts) {
      // Create product
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        type: 'service',
        metadata: {
          created_via: 'stripe_setup_pilot',
          tier_id: productData.name.toLowerCase().replace(' ', '_')
        }
      });

      logStep("Created product", { productId: product.id, name: product.name });
      createdProducts.push(product);

      // Create prices for this product
      for (const priceData of productData.prices) {
        const priceConfig: any = {
          product: product.id,
          unit_amount: priceData.amount,
          currency: 'usd',
          metadata: {
            created_via: 'stripe_setup_pilot'
          }
        };

        if (priceData.type === 'one_time') {
          // One-time price
        } else {
          // Recurring price
          priceConfig.recurring = {
            interval: priceData.interval,
            usage_type: 'licensed'
          };
        }

        const price = await stripe.prices.create(priceConfig);
        logStep("Created price", { 
          priceId: price.id, 
          amount: price.unit_amount, 
          interval: priceData.interval || 'one-time'
        });
        createdPrices.push(price);
      }

      // Create a billing meter for usage-based products
      if (productData.name === 'API Usage') {
        try {
          const meter = await stripe.billing.meters.create({
            display_name: `${productData.name} Meter`,
            event_name: `${productData.name.toLowerCase().replace(' ', '_')}_events`,
            customer_mapping: {
              event_payload_key: 'customer_id',
              type: 'by_id'
            },
            default_aggregation: {
              formula: 'sum'
            },
            value_settings: {
              event_payload_key: 'value'
            }
          });
          
          logStep("Created meter", { meterId: meter.id, displayName: meter.display_name });
          createdMeters.push(meter);
        } catch (meterError: any) {
          logStep("Warning: Could not create meter", { error: meterError.message });
        }
      }
    }

    logStep("Reseed completed successfully", { 
      productsCreated: createdProducts.length,
      pricesCreated: createdPrices.length,
      metersCreated: createdMeters.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Reseed completed. Created ${createdProducts.length} products, ${createdPrices.length} prices, and ${createdMeters.length} meters.`,
        data: {
          products: createdProducts.length,
          prices: createdPrices.length,
          meters: createdMeters.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in reseed-stripe-products", { message: error.message, stack: error.stack });
    
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
