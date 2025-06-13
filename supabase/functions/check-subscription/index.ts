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

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }
    logStep("Stripe secret key found");

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

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
    });

    // Get or create customer
    const customers = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
      logStep("Customer found", { customerId: customer.id });
    } else {
      customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      logStep("Customer created", { customerId: customer.id });
    }

    // Get subscriptions with limited expansion to avoid API errors
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      expand: ['data.items.data.price'], // Reduced expansion to avoid the 4-level limit
    });

    logStep("Subscriptions retrieved", { count: subscriptions.data.length });

    const activeSubscriptions = subscriptions.data.filter(sub => 
      ['active', 'trialing', 'past_due'].includes(sub.status)
    );

    // Store customer info in Supabase
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { error: upsertError } = await supabaseService
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        stripe_customer_id: customer.id,
        subscription_status: activeSubscriptions.length > 0 ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      logStep("Warning: Could not store subscription info", { error: upsertError });
    }

    logStep("Check subscription completed successfully", {
      hasActiveSubscription: activeSubscriptions.length > 0,
      totalSubscriptions: subscriptions.data.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: customer.id,
          email: customer.email,
        },
        subscriptions: {
          active: activeSubscriptions.length,
          total: subscriptions.data.length,
          hasActive: activeSubscriptions.length > 0,
        },
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
