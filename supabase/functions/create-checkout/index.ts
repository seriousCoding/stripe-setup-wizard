
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting create-checkout function v2');
    
    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      console.error('Please ensure STRIPE_SECRET_KEY is added to Supabase Edge Function secrets');
      throw new Error('Stripe secret key not configured in Supabase secrets. Please add STRIPE_SECRET_KEY to your edge function secrets.');
    }

    console.log('Stripe secret key found and ready to use');

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
      console.error('Auth error:', authError);
      throw new Error('User not authenticated');
    }

    const user = data.user;
    console.log('User authenticated:', user.email);

    const { priceId, planName, amount, currency, mode, packageCredits, meterRate } = await req.json();

    if (!priceId || !planName || amount === undefined) {
      throw new Error('Missing required parameters: priceId, planName, or amount');
    }

    console.log('Request params:', { priceId, planName, amount, currency, mode });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('Existing customer found:', customerId);
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log('New customer created:', customerId);
    }

    // Create price object with package and meter rate information
    const priceData: any = {
      currency: currency || 'usd',
      unit_amount: amount,
      product_data: {
        name: `${planName} Plan`,
        description: `${planName} subscription plan${packageCredits ? ` - ${packageCredits} credits included` : ''}${meterRate ? ` - $${meterRate} per transaction after limit` : ''}`,
        metadata: {
          package_credits: packageCredits?.toString() || '0',
          meter_rate: meterRate?.toString() || '0',
          plan_type: mode === 'subscription' ? 'recurring' : 'package'
        }
      },
    };

    if (mode === 'subscription') {
      priceData.recurring = { interval: 'month' };
    }

    const price = await stripe.prices.create(priceData);
    console.log('Price created:', price.id);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: mode || 'payment',
      success_url: `${req.headers.get('origin')}/pricing?success=true&plan=${priceId}`,
      cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_id: priceId,
        plan_name: planName,
        package_credits: packageCredits?.toString() || '0',
        meter_rate: meterRate?.toString() || '0',
        auto_renewal: mode === 'subscription' ? 'true' : 'false'
      },
      subscription_data: mode === 'subscription' ? {
        metadata: {
          package_credits: packageCredits?.toString() || '0',
          meter_rate: meterRate?.toString() || '0'
        }
      } : undefined,
    });

    console.log('Checkout session created successfully:', session.id);
    console.log('Checkout URL:', session.url);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
