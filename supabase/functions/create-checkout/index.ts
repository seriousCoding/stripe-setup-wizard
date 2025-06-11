
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

    // Map plan IDs to actual Stripe price IDs from your Stripe products
    const stripePriceMap: Record<string, string> = {
      'trial': 'price_trial', // Replace with actual Stripe price ID
      'starter': 'price_starter', // Replace with actual Stripe price ID  
      'professional': 'price_professional', // Replace with actual Stripe price ID
      'business': 'price_business', // Replace with actual Stripe price ID
      'enterprise': 'price_enterprise' // Replace with actual Stripe price ID
    };

    // For now, let's fetch the products from Stripe and find matching prices
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    logStep("Found products", { count: products.data.length });

    // Find the product that matches our plan
    let targetPrice = null;
    for (const product of products.data) {
      if (product.metadata?.created_via === 'billing_app_v1') {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });
        
        // Match based on plan tier
        if (product.metadata?.tier === priceId || product.name.toLowerCase().includes(planName.toLowerCase())) {
          targetPrice = prices.data[0];
          logStep("Found matching price", { priceId: targetPrice?.id, productName: product.name });
          break;
        }
      }
    }

    if (!targetPrice) {
      // Fallback: create a simple price for the plan
      logStep("No existing price found, creating new price");
      
      const priceAmount = {
        'trial': 0,
        'starter': 99, // $0.99
        'professional': 4900, // $49
        'business': 9900, // $99
        'enterprise': 2500 // $25
      }[priceId] || 0;

      const product = await stripe.products.create({
        name: `${planName} Plan`,
        metadata: {
          tier: priceId,
          created_via: 'checkout_fallback'
        }
      });

      const priceData: any = {
        currency: 'usd',
        unit_amount: priceAmount,
        product: product.id,
      };

      if (priceId === 'business' || priceId === 'enterprise') {
        priceData.recurring = { interval: 'month' };
      }

      targetPrice = await stripe.prices.create(priceData);
      logStep("Created new price", { priceId: targetPrice.id, amount: priceAmount });
    }

    // Determine mode based on plan type
    const mode = (priceId === 'business' || priceId === 'enterprise') ? 'subscription' : 'payment';
    
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
      },
    };

    if (mode === 'subscription') {
      sessionData.subscription_data = {
        metadata: {
          plan_id: priceId,
          plan_name: planName,
        }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    logStep('Checkout session created successfully', { 
      sessionId: session.id, 
      mode: mode,
      priceId: targetPrice.id
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
