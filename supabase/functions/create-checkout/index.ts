
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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

    const { priceId, planName } = await req.json();

    if (!priceId || !planName) {
      throw new Error('Missing required parameters: priceId and planName');
    }

    logStep("Request params", { priceId, planName });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: data.user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep('Existing customer found', { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: data.user.email,
        metadata: {
          user_id: data.user.id,
        },
      });
      customerId = customer.id;
      logStep('New customer created', { customerId });
    }

    // Handle free trial - no checkout needed
    if (priceId === 'trial') {
      logStep("Free trial selected - no checkout needed");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Free trial activated',
          redirect: `${req.headers.get('origin')}/pricing?success=true&plan=trial`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Find products with proper subscription setup
    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price']
    });

    logStep("Found products", { count: products.data.length });

    let targetPrice = null;
    let targetProduct = null;

    // Look for existing properly configured subscription products
    for (const product of products.data) {
      if (product.metadata?.created_via === 'billing_app_v1' || 
          product.metadata?.tier_id === priceId ||
          product.name.toLowerCase().includes(planName.toLowerCase())) {
        
        // Get all prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });
        
        logStep("Checking product prices", { 
          productId: product.id, 
          productName: product.name, 
          priceCount: prices.data.length 
        });

        // For business and enterprise plans, we need recurring prices
        if (priceId === 'business' || priceId === 'enterprise') {
          const recurringPrice = prices.data.find(p => p.recurring?.interval === 'month');
          if (recurringPrice) {
            targetPrice = recurringPrice;
            targetProduct = product;
            logStep("Found recurring price for subscription plan", { 
              priceId: targetPrice.id, 
              amount: targetPrice.unit_amount,
              interval: targetPrice.recurring?.interval
            });
            break;
          }
        } else {
          // For starter and professional, we can use one-time prices
          const oneTimePrice = prices.data.find(p => !p.recurring);
          if (oneTimePrice) {
            targetPrice = oneTimePrice;
            targetProduct = product;
            logStep("Found one-time price for credit plan", { 
              priceId: targetPrice.id, 
              amount: targetPrice.unit_amount
            });
            break;
          }
        }
      }
    }

    // If no properly configured product found, create one
    if (!targetPrice || !targetProduct) {
      logStep("No existing properly configured product found, creating new subscription product");
      
      // Create product with proper metadata
      const productData = {
        name: `${planName} Plan`,
        description: `${planName} subscription plan with metered usage`,
        metadata: {
          tier_id: priceId,
          created_via: 'billing_app_v1',
          billing_model_type: priceId === 'business' || priceId === 'enterprise' ? 'flat_recurring' : 'credit_burndown'
        }
      };

      targetProduct = await stripe.products.create(productData);
      logStep("Created new product", { productId: targetProduct.id, name: targetProduct.name });

      // Create appropriate price based on plan type
      const priceAmount = {
        'starter': 99, // $0.99 - pay as you go
        'professional': 4900, // $49 - credit package
        'business': 9900, // $99/month - unlimited recurring
        'enterprise': 2500 // $25/month per user
      }[priceId] || 99;

      const priceData: any = {
        currency: 'usd',
        unit_amount: priceAmount,
        product: targetProduct.id,
        metadata: {
          tier_id: priceId,
          plan_name: planName
        }
      };

      // Add recurring billing for subscription plans
      if (priceId === 'business' || priceId === 'enterprise') {
        priceData.recurring = { interval: 'month' };
        logStep("Creating recurring price for subscription plan");
      } else {
        logStep("Creating one-time price for credit plan");
      }

      targetPrice = await stripe.prices.create(priceData);
      logStep("Created new price", { 
        priceId: targetPrice.id, 
        amount: priceAmount,
        recurring: !!priceData.recurring
      });

      // For subscription plans, ensure we have proper meters set up
      if (priceId === 'business' || priceId === 'enterprise') {
        try {
          // Check if meter exists
          const meters = await stripe.billing.meters.list({ limit: 100 });
          let transactionMeter = meters.data.find(m => m.event_name === 'transaction_usage');
          
          if (!transactionMeter) {
            // Create transaction usage meter
            transactionMeter = await stripe.billing.meters.create({
              display_name: 'Transaction Usage',
              event_name: 'transaction_usage',
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
            logStep("Created transaction usage meter", { meterId: transactionMeter.id });
          } else {
            logStep("Found existing transaction usage meter", { meterId: transactionMeter.id });
          }
        } catch (meterError) {
          logStep("Error setting up meters", { error: meterError.message });
          // Continue without meters for now - they can be set up later
        }
      }
    }

    // Determine checkout mode based on price type
    const mode = targetPrice.recurring ? 'subscription' : 'payment';
    logStep("Determined checkout mode", { mode, priceId: targetPrice.id });
    
    // Create checkout session
    const sessionData: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: targetPrice.id,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${req.headers.get('origin')}/pricing?success=true&plan=${priceId}`,
      cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
      metadata: {
        user_id: data.user.id,
        plan_id: priceId,
        plan_name: planName,
        product_id: targetProduct.id
      },
    };

    // Add subscription metadata only for subscription mode
    if (mode === 'subscription') {
      sessionData.subscription_data = {
        metadata: {
          plan_id: priceId,
          plan_name: planName,
          user_id: data.user.id,
          product_id: targetProduct.id
        }
      };
      logStep("Added subscription metadata");
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    logStep('Checkout session created successfully', { 
      sessionId: session.id, 
      mode: mode,
      priceId: targetPrice.id,
      productId: targetProduct.id,
      url: session.url
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in create-checkout", { message: error.message, stack: error.stack });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
