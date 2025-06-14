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
      logStep("Auth error", { error: authError });
      throw new Error('User not authenticated');
    }

    logStep("User authenticated", { email: data.user.email });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Find customer by email
    const customers = await stripe.customers.list({
      email: data.user.email,
      limit: 1
    });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(
        JSON.stringify({
          subscribed: false,
          subscription_tier: null,
          subscription_status: 'no_customer',
          customer_id: null,
          subscription_id: null,
          current_period_end: null,
          price_amount: null,
          price_id: null // Add price_id here
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions found");
      return new Response(
        JSON.stringify({
          subscribed: false,
          subscription_tier: null,
          subscription_status: 'no_active_subscription',
          customer_id: customerId,
          subscription_id: null,
          current_period_end: null,
          price_amount: null,
          price_id: null // Add price_id here
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const subscription = subscriptions.data[0];
    const subscriptionItem = subscription.items.data[0];
    
    const price = await stripe.prices.retrieve(subscriptionItem.price.id);
    
    logStep("Active subscription found", {
      subscriptionId: subscription.id,
      priceId: price.id,
      amount: price.unit_amount
    });

    // Determine subscription tier from price amount
    let subscriptionTier = 'unknown';
    const priceAmount = price.unit_amount || 0;
    
    if (priceAmount === 0) {
      subscriptionTier = 'trial';
    } else if (priceAmount === 1900) {
      subscriptionTier = 'starter';
    } else if (priceAmount === 4900) {
      subscriptionTier = 'professional';
    } else if (priceAmount === 9900) {
      subscriptionTier = 'business';
    } else if (priceAmount === 2500) {
      subscriptionTier = 'enterprise';
    }

    logStep("Subscription details determined", {
      tier: subscriptionTier,
      amount: priceAmount,
      currentPeriodEnd: subscription.current_period_end,
      priceId: price.id // Log the priceId
    });

    return new Response(
      JSON.stringify({
        subscribed: true,
        subscription_tier: subscriptionTier,
        subscription_status: subscription.status,
        customer_id: customerId,
        subscription_id: subscription.id,
        current_period_end: subscription.current_period_end,
        price_amount: priceAmount,
        price_id: price.id // Return price_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in check-subscription", { message: error.message, stack: error.stack });
    
    return new Response(
      JSON.stringify({
        subscribed: false,
        subscription_tier: null,
        subscription_status: 'error',
        error: error.message,
        customer_id: null,
        subscription_id: null,
        current_period_end: null,
        price_amount: null,
        price_id: null // Add price_id here
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      }
    );
  }
});
