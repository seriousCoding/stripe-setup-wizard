
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

    // Sample products to create
    const sampleProducts = [
      {
        name: "Basic Plan",
        description: "Basic subscription plan with essential features",
        prices: [
          { amount: 999, currency: 'usd', interval: 'month' },
          { amount: 9999, currency: 'usd', interval: 'year' }
        ]
      },
      {
        name: "Pro Plan",
        description: "Professional plan with advanced features",
        prices: [
          { amount: 2999, currency: 'usd', interval: 'month' },
          { amount: 29999, currency: 'usd', interval: 'year' }
        ]
      },
      {
        name: "API Usage",
        description: "Pay-per-use API access",
        prices: [
          { amount: 50, currency: 'usd', billing_scheme: 'per_unit' }
        ]
      }
    ];

    const createdItems: any[] = [];

    for (const productData of sampleProducts) {
      // Create product
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        type: 'service',
        metadata: {
          created_via: 'stripe_setup_pilot_reseed',
          created_at: new Date().toISOString()
        }
      });

      logStep("Created product", { productId: product.id, name: product.name });

      // Create prices for this product
      const productPrices = [];
      for (const priceData of productData.prices) {
        const priceConfig: any = {
          product: product.id,
          unit_amount: priceData.amount,
          currency: priceData.currency,
          metadata: {
            created_via: 'stripe_setup_pilot_reseed'
          }
        };

        if (priceData.interval) {
          priceConfig.recurring = {
            interval: priceData.interval,
            usage_type: 'licensed'
          };
        }

        if (priceData.billing_scheme) {
          priceConfig.billing_scheme = priceData.billing_scheme;
        }

        const price = await stripe.prices.create(priceConfig);
        productPrices.push(price);
        
        logStep("Created price", { 
          priceId: price.id, 
          amount: price.unit_amount,
          interval: price.recurring?.interval || 'one-time'
        });
      }

      createdItems.push({
        product,
        prices: productPrices
      });
    }

    // Create a sample billing meter
    const meter = await stripe.billing.meters.create({
      display_name: "API Requests",
      event_name: "api_request_usage",
      customer_mapping: {
        event_payload_key: 'stripe_customer_id',
        type: 'by_id'
      },
      default_aggregation: {
        formula: 'sum'
      },
      value_settings: {
        event_payload_key: 'value'
      }
    });

    logStep("Created billing meter", { meterId: meter.id });

    logStep("Reseed completed successfully", { 
      productsCreated: createdItems.length,
      totalPrices: createdItems.reduce((sum, item) => sum + item.prices.length, 0),
      metersCreated: 1
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Reseed completed. Created ${createdItems.length} products with sample pricing and 1 billing meter.`,
        data: {
          products: createdItems.map(item => ({
            id: item.product.id,
            name: item.product.name,
            prices: item.prices.length
          })),
          meter: {
            id: meter.id,
            name: meter.display_name
          }
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
