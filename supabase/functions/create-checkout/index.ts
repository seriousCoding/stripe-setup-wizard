
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
      throw new Error('User not authenticated');
    }

    const user = data.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tier_id, price_id, user_email } = await req.json();
    logStep("Request body", { tier_id, price_id, user_email });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;
      logStep("Created new customer", { customerId });
    }

    // Find the right price for this tier
    let priceToUse = price_id;
    
    if (!priceToUse) {
      // Get products with billing_app_v1 metadata
      const products = await stripe.products.list({
        active: true,
        limit: 100
      });

      const appProducts = products.data.filter(product => 
        product.metadata?.created_via === 'billing_app_v1' &&
        product.metadata?.tier_id === tier_id
      );

      logStep("Found app products for tier", { tier_id, count: appProducts.length });

      if (appProducts.length > 0) {
        const product = appProducts[0];
        
        // Get prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true
        });

        if (prices.data.length > 0) {
          priceToUse = prices.data[0].id;
          logStep("Found price for product", { productId: product.id, priceId: priceToUse });
        }
      }
    }

    // If still no price found, create a default based on tier
    if (!priceToUse) {
      logStep("No price found, creating default for tier", { tier_id });
      
      let unitAmount = 0;
      let productName = '';
      
      switch (tier_id) {
        case 'trial':
          unitAmount = 0;
          productName = 'Free Trial';
          break;
        case 'starter':
          unitAmount = 1900; // $19.00
          productName = 'Starter Plan';
          break;
        case 'professional':
          unitAmount = 4900; // $49.00
          productName = 'Professional Plan';
          break;
        case 'business':
          unitAmount = 9900; // $99.00
          productName = 'Business Plan';
          break;
        case 'enterprise':
          unitAmount = 2500; // $25.00 per seat
          productName = 'Enterprise Plan';
          break;
        default:
          throw new Error(`Unknown tier: ${tier_id}`);
      }

      // Create product if it doesn't exist
      const product = await stripe.products.create({
        name: productName,
        metadata: {
          created_via: 'billing_app_v1',
          tier_id: tier_id
        }
      });

      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: 'usd',
        recurring: tier_id !== 'trial' ? { interval: 'month' } : undefined,
        metadata: {
          tier_id: tier_id
        }
      });

      priceToUse = price.id;
      logStep("Created new product and price", { productId: product.id, priceId: priceToUse, unitAmount });
    }

    // Handle free trial separately
    if (tier_id === 'trial') {
      logStep("Handling free trial signup");
      
      // For free trial, we might want to create a subscription with a $0 price
      // or just redirect to a success page
      return new Response(
        JSON.stringify({ 
          success: true,
          url: `${req.headers.get('origin')}/payment-success?tier=trial`,
          message: 'Free trial activated'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{
        price: priceToUse,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment-cancel`,
      metadata: {
        user_id: user.id,
        tier_id: tier_id
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ 
        success: true,
        url: session.url,
        session_id: session.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    
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
