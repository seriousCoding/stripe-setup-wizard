
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
    logStep("Function started");

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

    const user = data.user;
    logStep("User authenticated", { userId: user.id });

    const { display_name, event_name, aggregation_formula = 'sum', description } = await req.json();

    if (!display_name || !event_name) {
      throw new Error('Display name and event name are required');
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    logStep("Creating Stripe billing meter", { display_name, event_name, aggregation_formula });

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
    });

    // Create the billing meter according to Stripe documentation
    const meter = await stripe.billing.meters.create({
      display_name,
      event_name,
      customer_mapping: {
        event_payload_key: 'stripe_customer_id',
        type: 'by_id'
      },
      default_aggregation: {
        formula: aggregation_formula as 'sum' | 'count' | 'last_during_period' | 'last_ever' | 'max'
      },
      value_settings: {
        event_payload_key: 'value'
      }
    });

    logStep("Stripe billing meter created successfully", { meterId: meter.id });

    // Store meter info in Supabase for tracking
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: meterRecord, error: insertError } = await supabaseService
      .from('usage_meters')
      .insert({
        name: event_name,
        display_name: display_name,
        event_name: event_name,
        stripe_meter_id: meter.id,
        unit_label: 'units',
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      logStep("Error storing meter in Supabase", { error: insertError });
      // Don't fail the request if we can't store in Supabase, meter is created in Stripe
    } else {
      logStep("Meter stored in Supabase", { recordId: meterRecord.id });
    }

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
