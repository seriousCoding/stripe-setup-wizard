
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BILLING-METER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Create billing meter function started");

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

    logStep("User authenticated", { userId: data.user.id });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
    });

    const requestBody = await req.json();
    logStep("Request body received", requestBody);

    const {
      display_name,
      event_name,
      aggregation_formula = 'sum',
      description
    } = requestBody;

    if (!display_name || !event_name) {
      throw new Error('display_name and event_name are required');
    }

    // Validate aggregation formula
    const validFormulas = ['sum', 'count', 'last_during_period', 'last_ever', 'max'];
    if (!validFormulas.includes(aggregation_formula)) {
      throw new Error(`Invalid aggregation formula. Must be one of: ${validFormulas.join(', ')}`);
    }

    logStep("Creating billing meter with validated parameters", {
      display_name,
      event_name,
      aggregation_formula,
      description
    });

    // Create the billing meter using Stripe's billing.meters API
    const meter = await stripe.billing.meters.create({
      display_name,
      event_name,
      customer_mapping: {
        event_payload_key: 'customer_id',
        type: 'by_id'
      },
      default_aggregation: {
        formula: aggregation_formula as 'sum' | 'count' | 'last_during_period' | 'last_ever' | 'max'
      },
      value_settings: {
        event_payload_key: 'value'
      }
    });

    logStep("Billing meter created successfully", {
      meterId: meter.id,
      displayName: meter.display_name,
      status: meter.status
    });

    return new Response(
      JSON.stringify({
        success: true,
        meter: {
          id: meter.id,
          display_name: meter.display_name,
          event_name: meter.event_name,
          status: meter.status,
          created: meter.created
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in create-billing-meter", { message: error.message, stack: error.stack });
    
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
