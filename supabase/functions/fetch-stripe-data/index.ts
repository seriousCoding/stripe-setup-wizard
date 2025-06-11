
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FETCH-STRIPE-DATA] ${step}${detailsStr}`);
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

    // Fetch existing products with their default prices
    const products = await stripe.products.list({ 
      limit: 100,
      expand: ['data.default_price']
    });

    logStep("Fetched products", { count: products.data.length });

    // If no products exist, create test data
    if (products.data.length === 0) {
      logStep("No existing products found, creating test data");
      await createTestData(stripe, user);
      
      // Fetch the newly created products
      const newProducts = await stripe.products.list({ 
        limit: 100,
        expand: ['data.default_price']
      });
      
      logStep("Test data created, refetched products", { count: newProducts.data.length });
      
      return new Response(
        JSON.stringify({ 
          success: true,
          products: newProducts.data,
          test_data_created: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Return existing products
    return new Response(
      JSON.stringify({ 
        success: true,
        products: products.data,
        test_data_created: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in fetch-stripe-data", { message: error.message });
    
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

async function createTestData(stripe: Stripe, user: any) {
  logStep("Creating test data for empty Stripe account");

  const testProducts = [
    {
      name: "Professional Plan",
      description: "Monthly subscription with included usage",
      type: "recurring",
      unit_amount: 4999, // $49.99
      currency: "usd",
      interval: "month"
    },
    {
      name: "API Calls",
      description: "Usage-based API calls",
      type: "metered",
      unit_amount: 10, // $0.10
      currency: "usd",
      eventName: "api_call"
    },
    {
      name: "Storage Overage",
      description: "Additional storage beyond included limit",
      type: "metered",
      unit_amount: 50, // $0.50
      currency: "usd",
      eventName: "storage_overage"
    },
    {
      name: "Bandwidth Overage",
      description: "Additional bandwidth usage",
      type: "metered",
      unit_amount: 25, // $0.25
      currency: "usd",
      eventName: "bandwidth_overage"
    }
  ];

  for (const testProduct of testProducts) {
    try {
      // Create product
      const product = await stripe.products.create({
        name: testProduct.name,
        description: testProduct.description,
        type: 'service',
        metadata: {
          user_id: user.id,
          created_by: 'stripe-setup-pilot-test-data',
          billing_type: testProduct.type
        }
      });

      logStep("Test product created", { name: product.name, id: product.id });

      // Create price
      const priceData: any = {
        product: product.id,
        unit_amount: testProduct.unit_amount,
        currency: testProduct.currency,
        metadata: {
          user_id: user.id,
          test_data: 'true'
        }
      };

      if (testProduct.type === 'recurring') {
        priceData.recurring = {
          interval: testProduct.interval
        };
      } else if (testProduct.type === 'metered') {
        priceData.billing_scheme = 'per_unit';
        priceData.usage_type = 'metered';
        priceData.recurring = {
          interval: 'month',
          usage_type: 'metered',
          aggregate_usage: 'sum'
        };
      }

      const price = await stripe.prices.create(priceData);
      logStep("Test price created", { priceId: price.id, amount: price.unit_amount });

      // Update product to set default price
      await stripe.products.update(product.id, {
        default_price: price.id
      });

      // Create meter for metered items
      if (testProduct.type === 'metered' && testProduct.eventName) {
        try {
          const meter = await stripe.billing.meters.create({
            display_name: testProduct.name,
            event_name: testProduct.eventName,
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
          logStep("Test meter created", { meterId: meter.id, eventName: meter.event_name });
        } catch (meterError: any) {
          logStep("Test meter creation failed", { error: meterError.message });
        }
      }
    } catch (error: any) {
      logStep("Error creating test product", { product: testProduct.name, error: error.message });
    }
  }

  logStep("Test data creation completed");
}
