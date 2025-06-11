
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
      limit: 10
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions found");
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

    const subscription = subscriptions.data[0];
    const price = subscription.items.data[0].price;
    
    // Determine tier based on price amount
    let subscriptionTier = 'unknown';
    const amount = price.unit_amount || 0;
    
    if (amount === 0) {
      subscriptionTier = 'trial';
    } else if (amount === 99) {
      subscriptionTier = 'starter';
    } else if (amount === 4900) {
      subscriptionTier = 'professional';
    } else if (amount === 9900) {
      subscriptionTier = 'business';
    } else if (amount === 2500) {
      subscriptionTier = 'enterprise';
    }

    logStep("Active subscription found", { 
      subscriptionId: subscription.id,
      tier: subscriptionTier,
      amount: amount,
      status: subscription.status
    });

    return new Response(
      JSON.stringify({ 
        subscribed: true,
        subscription_tier: subscriptionTier,
        subscription_status: subscription.status,
        subscription_id: subscription.id,
        customer_id: customer.id,
        current_period_end: subscription.current_period_end,
        price_amount: amount
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
        status: 500,
      }
    );
  }
});
