
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

    // Authenticate user with enhanced verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep("ERROR: No authorization header provided");
      throw new Error('Authorization header missing - user must be logged in');
    }

    if (!authHeader.startsWith('Bearer ')) {
      logStep("ERROR: Invalid authorization header format");
      throw new Error('Invalid authorization header format');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token || token.trim() === '') {
      logStep("ERROR: Empty or invalid token");
      throw new Error('Invalid or empty authentication token');
    }

    logStep("Attempting to authenticate user with token", { tokenLength: token.length });
    
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      logStep("AUTH ERROR", { error: authError, code: authError.code, message: authError.message });
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!data || !data.user) {
      logStep("ERROR: No user data returned from auth");
      throw new Error('User not authenticated - no user data returned');
    }

    if (!data.user.email) {
      logStep("ERROR: User has no email", { userId: data.user.id });
      throw new Error('User account has no email address');
    }

    if (!data.user.email_confirmed_at && !data.user.phone_confirmed_at) {
      logStep("WARNING: User email/phone not confirmed", { 
        email: data.user.email, 
        emailConfirmed: !!data.user.email_confirmed_at,
        phoneConfirmed: !!data.user.phone_confirmed_at 
      });
      // Continue anyway but log the warning
    }

    logStep("User successfully authenticated", { 
      email: data.user.email, 
      userId: data.user.id,
      emailConfirmed: !!data.user.email_confirmed_at
    });

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

    // Handle free trial - create trial subscription directly
    if (priceId === 'trial') {
      logStep("Free trial selected - creating trial subscription directly");
      
      // Find the trial product - be more flexible in search
      const products = await stripe.products.list({
        active: true,
        limit: 100,
      });

      logStep("All products found", { count: products.data.length });

      // Look for trial product with multiple possible identifiers
      const trialProduct = products.data.find(p => 
        (p.metadata?.tier_id === 'trial') ||
        (p.name?.toLowerCase().includes('trial')) ||
        (p.metadata?.plan_type === 'trial')
      );

      if (!trialProduct) {
        logStep("ERROR: Trial product not found", { 
          availableProducts: products.data.map(p => ({
            id: p.id,
            name: p.name,
            metadata: p.metadata
          }))
        });
        throw new Error('Trial product not found. Please run create-subscription-products first.');
      }

      logStep("Found trial product", { productId: trialProduct.id, name: trialProduct.name });

      // Get any active price for the trial product - be very flexible
      const prices = await stripe.prices.list({
        product: trialProduct.id,
        active: true,
        limit: 10, // Get more prices to have options
      });

      logStep("Found prices for trial product", { 
        count: prices.data.length,
        prices: prices.data.map(p => ({
          id: p.id,
          type: p.type,
          billing_scheme: p.billing_scheme,
          unit_amount: p.unit_amount,
          recurring: p.recurring
        }))
      });

      if (prices.data.length === 0) {
        logStep("ERROR: No price found for trial product");
        throw new Error('No price found for trial product');
      }

      // Use the first available price, regardless of structure
      const trialPrice = prices.data[0];
      logStep("Using trial price", { 
        priceId: trialPrice.id, 
        billing_scheme: trialPrice.billing_scheme,
        type: trialPrice.type,
        recurring: trialPrice.recurring 
      });

      // Create trial subscription with flexible pricing
      const subscriptionData: any = {
        customer: customerId,
        items: [
          {
            price: trialPrice.id,
            quantity: 1,
          }
        ],
        metadata: {
          user_id: data.user.id,
          plan_id: priceId,
          plan_name: planName,
          product_id: trialProduct.id,
          billing_model: 'free_trial'
        }
      };

      // Add trial period if it's a recurring price
      if (trialPrice.type === 'recurring') {
        subscriptionData.trial_period_days = 14;
      }

      const subscription = await stripe.subscriptions.create(subscriptionData);
      
      logStep("Trial subscription created", { subscriptionId: subscription.id });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Free trial activated',
          subscription_id: subscription.id,
          redirect: `${req.headers.get('origin')}/pricing?success=true&plan=trial`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Find the appropriate subscription product for paid plans
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    logStep("Found products", { count: products.data.length });

    // More flexible product search
    const targetProduct = products.data.find(p => 
      (p.metadata?.tier_id === priceId) ||
      (p.name?.toLowerCase().includes(priceId.toLowerCase())) ||
      (p.metadata?.plan_type === priceId)
    );

    if (!targetProduct) {
      logStep("ERROR: Product not found", { 
        searchingFor: priceId,
        availableProducts: products.data.map(p => ({
          id: p.id,
          name: p.name,
          metadata: p.metadata
        }))
      });
      throw new Error(`No subscription product found for plan: ${priceId}. Please run create-subscription-products first.`);
    }

    logStep("Found target product", { productId: targetProduct.id, name: targetProduct.name });

    // Get any active price for this product - be very flexible
    const prices = await stripe.prices.list({
      product: targetProduct.id,
      active: true,
      limit: 10, // Get more prices to have options
    });

    logStep("Found prices for product", { 
      count: prices.data.length,
      prices: prices.data.map(p => ({
        id: p.id,
        type: p.type,
        billing_scheme: p.billing_scheme,
        unit_amount: p.unit_amount,
        recurring: p.recurring
      }))
    });

    if (prices.data.length === 0) {
      throw new Error('No price found for this product');
    }

    // Use the first available price, regardless of structure
    const productPrice = prices.data[0];
    logStep("Using product price", { 
      priceId: productPrice.id, 
      billing_scheme: productPrice.billing_scheme,
      tiers_mode: productPrice.tiers_mode,
      type: productPrice.type,
      recurring: productPrice.recurring
    });

    // Create checkout session for subscription
    const lineItems = [
      {
        price: productPrice.id,
        quantity: 1,
      }
    ];

    const sessionData: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/pricing?success=true&plan=${priceId}`,
      cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
      metadata: {
        user_id: data.user.id,
        plan_id: priceId,
        plan_name: planName,
        product_id: targetProduct.id,
        billing_model: targetProduct.metadata?.billing_model_type || 'subscription'
      },
      subscription_data: {
        metadata: {
          plan_id: priceId,
          plan_name: planName,
          user_id: data.user.id,
          product_id: targetProduct.id,
          billing_model: targetProduct.metadata?.billing_model_type || 'subscription'
        }
      }
    };

    // For enterprise plans, allow quantity adjustment
    if (priceId === 'enterprise') {
      sessionData.line_items[0].adjustable_quantity = {
        enabled: true,
        minimum: 1,
        maximum: 100
      };
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    logStep('Subscription checkout session created successfully', { 
      sessionId: session.id, 
      mode: 'subscription',
      lineItemCount: lineItems.length,
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
