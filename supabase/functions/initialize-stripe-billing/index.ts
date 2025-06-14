import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INITIALIZE-STRIPE-BILLING] ${step}${detailsStr}`);
};

// Define meter configurations
const METER_CONFIGS = [
  {
    supabase_name: 'transaction_usage_meter', // Unique name for Supabase `usage_meters.name`
    display_name: 'Transaction Usage',    // Stripe meter display name
    event_name: 'transaction_usage',      // Stripe meter event_name (unique in Stripe)
    unit_label: 'transactions',
    customer_mapping: { event_payload_key: 'stripe_customer_id', type: 'by_id' as const },
    default_aggregation: { formula: 'sum' as const },
    value_settings: { event_payload_key: 'value' },
  },
  {
    supabase_name: 'ai_processing_meter',
    display_name: 'AI Processing Usage',
    event_name: 'ai_processing_usage',
    unit_label: 'requests',
    customer_mapping: { event_payload_key: 'stripe_customer_id', type: 'by_id' as const },
    default_aggregation: { formula: 'sum' as const },
    value_settings: { event_payload_key: 'value' },
  }
];

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

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // IMPORTANT: Use service role key for admin operations like writing to usage_meters
      // For this example, assuming anon key is sufficient for user auth check,
      // but for updating usage_meters table, you might need service_role if RLS restricts anon.
      // If this function is owner-only, then service_role is fine.
      // For simplicity in example, will use anon for auth, but actual upsert needs appropriate rights.
      // If using service_role for Supabase client:
      // { global: { headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` } } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: authUserData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !authUserData.user) {
      logStep("Auth error", { error: authError });
      throw new Error('User not authenticated');
    }

    logStep("User authenticated", { email: authUserData.user.email });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Function to get or create Stripe Meter ID and store/update in Supabase
    async function getOrCreateStripeMeter(config: typeof METER_CONFIGS[0]) {
      logStep(`Processing meter: ${config.display_name}`);

      // Check Supabase first for an existing meter by event_name
      let { data: dbMeter, error: dbFetchError } = await supabaseClient
        .from('usage_meters')
        .select('id, stripe_meter_id')
        .eq('event_name', config.event_name)
        .single();

      if (dbFetchError && dbFetchError.code !== 'PGRST116') { // PGRST116: no rows found
        logStep(`Error fetching meter ${config.event_name} from Supabase: ${dbFetchError.message}`);
        // Depending on RLS, this might fail if user doesn't have permission.
        // Consider using a service_role client for these operations.
      }

      if (dbMeter && dbMeter.stripe_meter_id) {
        logStep(`Meter ${config.display_name} found in Supabase with Stripe ID: ${dbMeter.stripe_meter_id}`);
        try {
            await stripe.billing.meters.retrieve(dbMeter.stripe_meter_id);
            logStep(`Stripe meter ${dbMeter.stripe_meter_id} confirmed active.`);
            return dbMeter.stripe_meter_id;
        } catch (retrieveError: any) {
            logStep(`Stripe meter ${dbMeter.stripe_meter_id} not found or error retrieving. Will attempt to recreate. Error: ${retrieveError.message}`);
            // Ensure supabase client has rights to update this table
            await supabaseClient.from('usage_meters').update({ stripe_meter_id: null }).eq('event_name', config.event_name);
        }
      } else if (dbMeter && !dbMeter.stripe_meter_id) {
        logStep(`Meter ${config.display_name} found in Supabase but without Stripe ID. Will create in Stripe.`);
      } else {
        logStep(`Meter ${config.display_name} not found in Supabase by event_name. Will create in Stripe and Supabase.`);
      }
      
      logStep(`Creating Stripe meter for ${config.display_name} (event: ${config.event_name})`);
      const stripeMeter = await stripe.billing.meters.create({
        display_name: config.display_name,
        event_name: config.event_name,
        default_aggregation: config.default_aggregation,
        customer_mapping: config.customer_mapping,
        value_settings: config.value_settings,
      });
      logStep(`Stripe meter created: ${stripeMeter.id} for ${config.display_name}`);

      const { error: upsertError } = await supabaseClient
        .from('usage_meters')
        .upsert({
          name: config.supabase_name,
          display_name: config.display_name,
          event_name: config.event_name,
          stripe_meter_id: stripeMeter.id,
          unit_label: config.unit_label,
          updated_at: new Date().toISOString()
        }, { onConflict: 'event_name' });

      if (upsertError) {
        // Non-fatal, log and continue. The meter exists in Stripe.
        logStep(`Error upserting meter ${config.event_name} into Supabase: ${upsertError.message}. Stripe Meter ID: ${stripeMeter.id}`);
      } else {
        logStep(`Upserted meter ${config.event_name} into Supabase with Stripe ID: ${stripeMeter.id}`);
      }
      return stripeMeter.id;
    }

    // Create/Verify meters in Stripe and get their IDs
    const stripeMeterIdsMap: { [key: string]: string | undefined } = {};
    for (const config of METER_CONFIGS) {
      try {
        stripeMeterIdsMap[config.event_name] = await getOrCreateStripeMeter(config);
      } catch (meterError: any) {
        logStep(`Failed to process meter ${config.event_name}: ${meterError.message}. This meter will not be available for pricing.`);
        stripeMeterIdsMap[config.event_name] = undefined; // Mark as unavailable
      }
    }
    logStep("All defined meters processed. Available Stripe Meter IDs:", stripeMeterIdsMap);
    
    const transactionMeterId = stripeMeterIdsMap['transaction_usage'];
    const aiProcessingMeterId = stripeMeterIdsMap['ai_processing_usage'];

    // Define the billing plans - ALL AS RECURRING MONTHLY
    const billingPlans = [
      {
        id: 'starter',
        name: 'Starter',
        subtitle: 'Fixed Fee + Overage',
        description: 'Perfect for small teams with 1,000 included transactions monthly.',
        price: 1900, // $19.00 per month
        type: 'recurring',
        interval: 'month',
        metadata: {
          tier_id: 'starter',
          billing_model_type: 'fixed_fee_graduated',
          usage_limit_transactions: '1000',
          usage_limit_ai_processing: '100',
          overage_rate: '0.02',
          subtitle: 'Fixed Fee + Overage'
        }
      },
      {
        id: 'professional',
        name: 'Professional',
        subtitle: 'Fixed Fee + Overage',
        description: 'Great for growing businesses with 5,000 included transactions monthly.',
        price: 4900, // $49.00 per month
        type: 'recurring',
        interval: 'month',
        metadata: {
          tier_id: 'professional',
          billing_model_type: 'fixed_fee_graduated',
          usage_limit_transactions: '5000',
          usage_limit_ai_processing: '500',
          overage_rate: '0.015',
          popular: 'true',
          subtitle: 'Fixed Fee + Overage'
        }
      },
      {
        id: 'business',
        name: 'Business',
        subtitle: 'Flat Fee',
        description: 'Unlimited transactions with predictable monthly costs.',
        price: 9900, // $99 per month
        type: 'recurring',
        interval: 'month',
        metadata: {
          tier_id: 'business',
          billing_model_type: 'flat_recurring',
          usage_limit_transactions: 'unlimited',
          usage_limit_ai_processing: 'unlimited',
          subtitle: 'Flat Fee'
        }
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        subtitle: 'Per Seat',
        description: 'Scale with your team size and organizational needs.',
        price: 2500, // $25 per user/month
        type: 'recurring',
        interval: 'month',
        metadata: {
          tier_id: 'enterprise',
          billing_model_type: 'per_seat',
          usage_limit_transactions: 'unlimited',
          usage_limit_ai_processing: 'unlimited',
          subtitle: 'Per Seat'
        }
      },
      {
        id: 'trial',
        name: 'Free Trial',
        subtitle: 'Trial',
        description: 'Try all features risk-free with 500 included transactions monthly.',
        price: 0, // Free
        type: 'recurring',
        interval: 'month',
        metadata: {
          tier_id: 'trial',
          billing_model_type: 'free_trial',
          usage_limit_transactions: '500',
          usage_limit_ai_processing: '50',
          overage_rate: '0.05',
          badge: 'Free Trial',
          subtitle: 'Trial'
        }
      }
    ];

    const results = [];

    for (const plan of billingPlans) {
      logStep(`Creating billing plan: ${plan.name}`);
      
      try {
        // Create the product
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: {
            ...plan.metadata,
            created_via: 'stripe_billing_pilot'
          }
        });

        logStep(`Product created: ${product.id}`, { name: product.name });

        // Create the main recurring price - ALL PLANS ARE RECURRING MONTHLY
        const priceData: Stripe.PriceCreateParams = {
          currency: 'usd',
          product: product.id,
          recurring: { 
            interval: plan.interval as Stripe.PriceCreateParams.Recurring.Interval | undefined || 'month',
            usage_type: 'licensed' // Base subscription fee
          },
          unit_amount: plan.price,
          metadata: {
            ...plan.metadata,
            price_type: 'recurring_base'
          }
        };

        const price = await stripe.prices.create(priceData);
        logStep(`Main recurring price created: ${price.id}`, { amount: plan.price });

        // Create graduated pricing for usage limits if applicable
        const additionalPrices = [];
        if (plan.metadata.overage_rate) {
          // Create overage pricing for transactions if transactionMeterId is available
          if (transactionMeterId) {
            const transactionOveragePrice = await stripe.prices.create({
              currency: 'usd',
              product: product.id,
              billing_scheme: 'tiered',
              tiers_mode: 'graduated',
              recurring: {
                interval: 'month',
                usage_type: 'metered',
                meter: transactionMeterId // Use the obtained Stripe Meter ID
              },
              tiers: [
                {
                  up_to: parseInt(plan.metadata.usage_limit_transactions) || 1000,
                  unit_amount: 0, // Free up to limit
                  flat_amount: 0
                },
                {
                  up_to: null, // 'inf' equivalent for Stripe API is null for up_to in last tier
                  unit_amount: Math.round(parseFloat(plan.metadata.overage_rate) * 100), // Convert to cents
                  flat_amount: 0
                }
              ],
              metadata: {
                ...plan.metadata,
                price_type: 'overage_transactions',
                meter_id: transactionMeterId // Store Stripe Meter ID
              }
            });
            additionalPrices.push(transactionOveragePrice);
            logStep(`Transaction overage price created: ${transactionOveragePrice.id} using meter ${transactionMeterId}`);
          } else {
            logStep(`Skipping transaction overage price for ${plan.name} as transaction meter ID is unavailable.`);
          }

          // Create overage pricing for AI processing if aiProcessingMeterId is available
          if (aiProcessingMeterId) {
            const aiOveragePrice = await stripe.prices.create({
              currency: 'usd',
              product: product.id,
              billing_scheme: 'tiered',
              tiers_mode: 'graduated',
              recurring: {
                interval: 'month',
                usage_type: 'metered',
                meter: aiProcessingMeterId // Use the obtained Stripe Meter ID
              },
              tiers: [
                {
                  up_to: parseInt(plan.metadata.usage_limit_ai_processing) || 100,
                  unit_amount: 0, // Free up to limit
                  flat_amount: 0
                },
                {
                  up_to: null,
                  unit_amount: Math.round(parseFloat(plan.metadata.overage_rate) * 100),
                  flat_amount: 0
                }
              ],
              metadata: {
                ...plan.metadata,
                price_type: 'overage_ai_processing',
                meter_id: aiProcessingMeterId // Store Stripe Meter ID
              }
            });
            additionalPrices.push(aiOveragePrice);
            logStep(`AI processing overage price created: ${aiOveragePrice.id} using meter ${aiProcessingMeterId}`);
          } else {
            logStep(`Skipping AI processing overage price for ${plan.name} as AI processing meter ID is unavailable.`);
          }
        }

        // Set the main price as default
        await stripe.products.update(product.id, {
          default_price: price.id
        });

        results.push({
          product_id: product.id,
          price_id: price.id,
          additional_prices: additionalPrices.map(p => p.id),
          tier_id: plan.id,
          name: plan.name,
          subtitle: plan.subtitle,
          amount: plan.price,
          type: plan.type,
          interval: plan.interval,
          status: 'success'
        });

        logStep(`Billing plan setup complete for ${plan.name}`, {
          productId: product.id,
          priceId: price.id,
          additionalPrices: additionalPrices.length,
          recurringMonthly: true
        });

      } catch (error: any) {
        logStep(`Error creating billing plan ${plan.name}`, { error: error.message });
        results.push({
          tier_id: plan.id,
          name: plan.name,
          error: error.message,
          status: 'error'
        });
      }
    }

    const processedMetersList = METER_CONFIGS
      .filter(config => stripeMeterIdsMap[config.event_name])
      .map(config => ({ 
        event_name: config.event_name, 
        stripe_meter_id: stripeMeterIdsMap[config.event_name],
        display_name: config.display_name 
      }));

    logStep("Stripe billing initialization complete", { 
      results: results.length,
      meters_processed: processedMetersList.length,
      all_recurring_monthly: true
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Stripe billing system initialized successfully - all plans are recurring monthly',
        results,
        meters: processedMetersList,
        summary: {
          products_created: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length,
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
