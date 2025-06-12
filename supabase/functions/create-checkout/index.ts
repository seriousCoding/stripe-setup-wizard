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

    const { priceId, planName, mode } = await req.json();

    if (!priceId || !planName) {
      throw new Error('Missing required parameters: priceId and planName');
    }

    logStep("Request params", { priceId, planName, mode });

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

    // Find or create the appropriate product and price
    let targetPrice = null;
    let targetProduct = null;

    // Enhanced product finding logic
    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price']
    });

    logStep("Found products", { count: products.data.length });

    // Look for existing properly configured products
    for (const product of products.data) {
      if (product.metadata?.tier_id === priceId || 
          product.name.toLowerCase().includes(planName.toLowerCase())) {
        
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });
        
        logStep("Checking product prices", { 
          productId: product.id, 
          productName: product.name, 
          priceCount: prices.data.length 
        });

        // Select appropriate price based on plan type
        if (priceId === 'business' || priceId === 'enterprise') {
          // These need recurring prices
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
          // Starter and Professional use one-time prices
          const oneTimePrice = prices.data.find(p => !p.recurring);
          if (oneTimePrice) {
            targetPrice = oneTimePrice;
            targetProduct = product;
            logStep("Found one-time price", { 
              priceId: targetPrice.id, 
              amount: targetPrice.unit_amount
            });
            break;
          }
        }
      }
    }

    // If no existing product found, create one
    if (!targetPrice || !targetProduct) {
      logStep("No existing product found, creating new one");
      
      const billingModelType = {
        'starter': 'pay_as_you_go',
        'professional': 'credit_burndown', 
        'business': 'flat_recurring',
        'enterprise': 'per_seat'
      }[priceId] || 'pay_as_you_go';

      const productData = {
        name: `${planName} Plan`,
        description: getProductDescription(priceId),
        metadata: {
          tier_id: priceId,
          created_via: 'billing_app_v1',
          billing_model_type: billingModelType
        }
      };

      targetProduct = await stripe.products.create(productData);
      logStep("Created new product", { productId: targetProduct.id, name: targetProduct.name });

      // Create appropriate price based on plan type
      const priceAmount = {
        'starter': 99, // $0.99 per transaction
        'professional': 4900, // $49 for credits
        'business': 9900, // $99/month
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
        logStep("Creating one-time price");
      }

      targetPrice = await stripe.prices.create(priceData);
      logStep("Created new price", { 
        priceId: targetPrice.id, 
        amount: priceAmount,
        recurring: !!priceData.recurring
      });
    }

    // Determine checkout mode and session data
    const checkoutMode = targetPrice.recurring ? 'subscription' : 'payment';
    logStep("Determined checkout mode", { mode: checkoutMode, priceId: targetPrice.id });
    
    // Create checkout session with enhanced metadata
    const sessionData: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: targetPrice.id,
          quantity: 1,
        },
      ],
      mode: checkoutMode,
      success_url: `${req.headers.get('origin')}/pricing?success=true&plan=${priceId}`,
      cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
      metadata: {
        user_id: data.user.id,
        plan_id: priceId,
        plan_name: planName,
        product_id: targetProduct.id,
        billing_model: targetProduct.metadata?.billing_model_type || 'standard'
      },
    };

    // Add subscription-specific metadata
    if (checkoutMode === 'subscription') {
      sessionData.subscription_data = {
        metadata: {
          plan_id: priceId,
          plan_name: planName,
          user_id: data.user.id,
          product_id: targetProduct.id
        }
      };
      logStep("Added subscription metadata");
    } else if (priceId === 'professional') {
      // Add credit-specific metadata for professional plan
      sessionData.metadata.credit_amount = '12000'; // $120 in cents
      sessionData.metadata.purchase_amount = '4900'; // $49 in cents
      sessionData.metadata.credit_multiplier = '1.2'; // 20% bonus
      logStep("Added credit purchase metadata");
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    logStep('Checkout session created successfully', { 
      sessionId: session.id, 
      mode: checkoutMode,
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

// Helper function to get product descriptions
function getProductDescription(priceId: string): string {
  const descriptions = {
    'starter': 'True pay-as-you-go pricing with no commitments or limits.',
    'professional': 'Prepaid credit system with 20% bonus credits included.',
    'business': 'Unlimited usage with predictable monthly costs.',
    'enterprise': 'Per-user pricing with enterprise-grade features.'
  };
  return descriptions[priceId] || 'Custom pricing plan';
}
