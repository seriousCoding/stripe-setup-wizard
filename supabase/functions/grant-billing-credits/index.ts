
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GRANT-BILLING-CREDITS] ${step}${detailsStr}`);
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

    const { customerId, amount, currency = 'usd', category = 'paid', expiresInDays = 365 } = await req.json();

    if (!customerId || !amount) {
      throw new Error('Missing required parameters: customerId and amount');
    }

    logStep("Request validated", { customerId, amount, currency, category });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Calculate expiration date (1 year from now by default)
    const expiresAt = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);

    // Grant billing credits
    const creditGrant = await stripe.billing.creditGrants.create({
      customer: customerId,
      category: category,
      amount: {
        type: 'monetary',
        monetary: {
          value: amount,
          currency: currency.toLowerCase()
        }
      },
      applicability_config: {
        scope: {
          price_type: 'metered'
        }
      },
      expires_at: expiresAt
    });

    logStep("Credit grant created successfully", { 
      creditGrantId: creditGrant.id, 
      amount: amount,
      expiresAt: new Date(expiresAt * 1000).toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        credit_grant: creditGrant,
        expires_at: expiresAt,
        expires_date: new Date(expiresAt * 1000).toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in grant-billing-credits", { message: error.message });
    
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
