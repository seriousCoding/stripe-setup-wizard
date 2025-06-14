import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeaders } from "../_shared/cors.ts";
import { logStep } from "../_shared/logger.ts";
import { METER_CONFIGS } from "./_config/meter-configs.ts";
import { authenticateUser } from "./_services/auth-service.ts";
import { processMeters } from "./_services/meter-service.ts";
import { processBillingPlans } from "./_services/plan-service.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured in Supabase secrets');
    }
    logStep("Stripe secret key found");

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or Anon Key not configured in Supabase secrets');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    await authenticateUser(req, supabaseClient);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const stripeMeterIdsMap = await processMeters(stripe, supabaseClient);
    const planProcessingResults = await processBillingPlans(stripe, stripeMeterIdsMap);

    const processedMetersList = METER_CONFIGS
      .filter(config => stripeMeterIdsMap[config.event_name])
      .map(config => ({
        event_name: config.event_name,
        stripe_meter_id: stripeMeterIdsMap[config.event_name],
        display_name: config.display_name
      }));

    logStep("Stripe billing initialization complete", {
      results: planProcessingResults.length,
      meters_processed: processedMetersList.length,
      all_recurring_monthly: true // This was part of original log, keeping it
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stripe billing system initialized successfully - all plans are recurring monthly',
        results: planProcessingResults,
        meters: processedMetersList,
        summary: {
          products_created: planProcessingResults.filter(r => r.status === 'success').length,
          errors: planProcessingResults.filter(r => r.status === 'error').length,
          meters_created_or_verified: processedMetersList.length,
          all_recurring_monthly: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in initialize-stripe-billing", { message: error.message, stack: error.stack });
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
