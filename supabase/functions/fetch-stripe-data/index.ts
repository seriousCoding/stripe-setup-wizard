
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FETCH-STRIPE-DATA] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Check for Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      logStep("ERROR - Stripe secret key not configured");
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

    // Fetch products with their default prices
    const products = await stripe.products.list({
      expand: ['data.default_price'],
      active: true,
      limit: 100
    });

    logStep("Products fetched from Stripe", { count: products.data.length });

    return new Response(
      JSON.stringify({ 
        success: true,
        products: products.data 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR in fetch-stripe-data", { message: error.message });
    
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
