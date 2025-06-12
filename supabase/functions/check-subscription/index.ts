
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
      logStep("Authentication failed", { error: authError?.message });
      throw new Error('User not authenticated');
    }

    const user = data.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Find customer by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(
        JSON.stringify({ 
          subscribed: false,
          subscription_tier: null,
          subscription_status: 'no_customer',
          customer_id: null
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const customer = customers.data[0];
    logStep("Customer found", { customerId: customer.id });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      expand: ['data.items.data.price.product'],
      limit: 10
    });

    logStep("Active subscriptions found", { count: subscriptions.data.length });

    if (subscriptions.data.length === 0) {
      // Check for one-time payments/credits by looking at recent payment intents
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 10
      });

      const recentSuccessfulPayment = paymentIntents.data.find(
        pi => pi.status === 'succeeded' && 
        pi.created > Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Last 30 days
      );

      if (recentSuccessfulPayment) {
        logStep("Found recent successful payment, checking for credit plans");
        
        // This could be a credit purchase - determine tier based on amount
        const amount = recentSuccessfulPayment.amount;
        let creditTier = 'starter';
        
        if (amount >= 4900) { // $49 or more
          creditTier = 'professional';
        }

        return new Response(
          JSON.stringify({ 
            subscribed: true,
            subscription_tier: creditTier,
            subscription_status: 'credit_active',
            customer_id: customer.id,
            payment_intent_id: recentSuccessfulPayment.id,
            price_amount: amount
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      logStep("No subscriptions or recent payments found");
      return new Response(
        JSON.stringify({ 
          subscribed: false,
          subscription_tier: null,
          subscription_status: 'no_subscription',
          customer_id: customer.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process the most recent active subscription
    const subscription = subscriptions.data[0];
    const price = subscription.items.data[0].price;
    
    logStep("Processing subscription", { 
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      priceId: price.id
    });
    
    // Determine tier based on product metadata or price amount
    let subscriptionTier = 'unknown';
    const amount = price.unit_amount || 0;
    
    // Get the product to check for tier metadata
    let product = null;
    if (price.product && typeof price.product === 'object') {
      product = price.product;
    } else if (typeof price.product === 'string') {
      try {
        product = await stripe.products.retrieve(price.product);
      } catch (error) {
        logStep("Error retrieving product", { error: error.message });
      }
    }

    if (product) {
      logStep("Product retrieved", { productId: product.id, metadata: product.metadata });
      
      // Check for tier_id in product metadata first
      if (product.metadata?.tier_id) {
        subscriptionTier = product.metadata.tier_id;
        logStep("Tier from metadata", { tier: subscriptionTier });
      } else {
        // Fallback to price-based tier determination
        if (amount === 9900) {
          subscriptionTier = 'business';
        } else if (amount === 2500) {
          subscriptionTier = 'enterprise';
        } else if (amount >= 4900) {
          subscriptionTier = 'professional';
        } else if (amount <= 99) {
          subscriptionTier = 'starter';
        }
        logStep("Tier from price amount", { amount, tier: subscriptionTier });
      }
    }

    // Check if subscription is currently active
    const isActive = subscription.status === 'active';
    const isTrialing = subscription.status === 'trialing';
    const subscribed = isActive || isTrialing;

    // For recurring subscriptions, check if meters are properly set up
    if (subscribed && price.recurring) {
      try {
        const meters = await stripe.billing.meters.list({ limit: 100 });
        const transactionMeter = meters.data.find(m => m.event_name === 'transaction_usage');
        
        if (transactionMeter) {
          logStep("Transaction meter found", { meterId: transactionMeter.id });
        } else {
          logStep("No transaction meter found - subscription may not be fully configured");
        }
      } catch (meterError) {
        logStep("Error checking meters", { error: meterError.message });
      }
    }

    logStep("Final subscription status", { 
      subscribed,
      tier: subscriptionTier,
      status: subscription.status,
      amount: amount,
      isRecurring: !!price.recurring
    });

    return new Response(
      JSON.stringify({ 
        subscribed: subscribed,
        subscription_tier: subscriptionTier,
        subscription_status: subscription.status,
        subscription_id: subscription.id,
        customer_id: customer.id,
        current_period_end: subscription.current_period_end,
        price_amount: amount,
        is_recurring: !!price.recurring,
        product_id: product?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in check-subscription", { message: error.message });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        subscribed: false,
        subscription_tier: null,
        subscription_status: 'error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
