
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECORD-USAGE-EVENT] ${step}${detailsStr}`);
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

    const { meter_name, value = 1, metadata = {} } = await req.json();

    if (!meter_name) {
      throw new Error('meter_name is required');
    }

    // Get meter configuration
    const { data: meter, error: meterError } = await supabaseClient
      .from('usage_meters')
      .select('*')
      .eq('name', meter_name)
      .single();

    if (meterError || !meter) {
      throw new Error(`Meter not found: ${meter_name}`);
    }

    logStep("Meter found", { meterId: meter.id, eventName: meter.event_name });

    // Record usage event in Supabase
    const { data: usageEvent, error: usageError } = await supabaseClient
      .from('usage_events')
      .insert({
        user_id: user.id,
        meter_id: meter.id,
        event_name: meter.event_name,
        value: parseFloat(value),
        metadata
      })
      .select()
      .single();

    if (usageError) {
      throw new Error(`Failed to record usage event: ${usageError.message}`);
    }

    logStep("Usage event recorded", { eventId: usageEvent.id });

    // Send to Stripe if meter has Stripe integration
    let stripeEventId = null;
    if (meter.stripe_meter_id) {
      try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (stripeSecretKey) {
          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-10-16',
          });

          // Get customer ID
          const customers = await stripe.customers.list({
            email: user.email,
            limit: 1,
          });

          if (customers.data.length > 0) {
            const customerId = customers.data[0].id;

            const meterEvent = await stripe.billing.meterEvents.create({
              event_name: meter.event_name,
              payload: {
                customer_id: customerId,
                value: parseFloat(value),
                ...metadata
              }
            });

            stripeEventId = meterEvent.identifier;
            logStep("Stripe meter event created", { eventId: stripeEventId });

            // Update usage event with Stripe ID
            await supabaseClient
              .from('usage_events')
              .update({ stripe_event_id: stripeEventId })
              .eq('id', usageEvent.id);
          }
        }
      } catch (stripeError: any) {
        logStep("Stripe error (non-fatal)", { error: stripeError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        event_id: usageEvent.id,
        stripe_event_id: stripeEventId,
        message: 'Usage event recorded successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in record-usage-event", { message: error.message });
    
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
