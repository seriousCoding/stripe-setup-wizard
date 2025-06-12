
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-PRODUCTS] ${step}${detailsStr}`);
};

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

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Generate unique timestamp for lookup keys to avoid conflicts
    const timestamp = Date.now();

    // Define the subscription products with graduated usage-based pricing
    const productDefinitions = [
      {
        id: 'trial',
        name: 'Free Trial',
        description: 'Free trial with 500 included transactions.',
        lookup_key: `trial_monthly_${timestamp}`,
        metadata: {
          tier_id: 'trial',
          plan_type: 'trial',
          billing_model_type: 'free_trial',
          created_via: 'subscription_billing_v4'
        },
        base_amount: 0,
        included_usage: 500,
        tiers: [
          {
            up_to: 500,
            unit_amount: 0,
            flat_amount: 0
          },
          {
            up_to: 'inf',
            unit_amount: 500, // $0.05 per transaction after 500
            flat_amount: 0
          }
        ]
      },
      {
        id: 'starter',
        name: 'Starter',
        description: 'Perfect for small teams with graduated pricing.',
        lookup_key: `starter_monthly_${timestamp}`,
        metadata: {
          tier_id: 'starter',
          plan_type: 'usage_based',
          billing_model_type: 'fixed_fee_graduated',
          created_via: 'subscription_billing_v4'
        },
        base_amount: 1900, // $19.00 base fee
        included_usage: 1000,
        tiers: [
          {
            up_to: 1000,
            unit_amount: 0,
            flat_amount: 1900 // $19 flat fee for first 1000
          },
          {
            up_to: 'inf',
            unit_amount: 200, // $0.02 per transaction after 1000
            flat_amount: 0
          }
        ]
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Great for growing businesses with graduated pricing.',
        lookup_key: `professional_monthly_${timestamp}`,
        metadata: {
          tier_id: 'professional',
          plan_type: 'usage_based',
          billing_model_type: 'fixed_fee_graduated',
          created_via: 'subscription_billing_v4'
        },
        base_amount: 4900, // $49.00 base fee
        included_usage: 5000,
        tiers: [
          {
            up_to: 5000,
            unit_amount: 0,
            flat_amount: 4900 // $49 flat fee for first 5000
          },
          {
            up_to: 'inf',
            unit_amount: 150, // $0.015 per transaction after 5000
            flat_amount: 0
          }
        ]
      },
      {
        id: 'business',
        name: 'Business',
        description: 'Unlimited transactions with predictable monthly costs.',
        lookup_key: `business_monthly_${timestamp}`,
        metadata: {
          tier_id: 'business',
          plan_type: 'flat_rate',
          billing_model_type: 'flat_recurring',
          created_via: 'subscription_billing_v4'
        },
        base_amount: 9900, // $99.00 monthly flat rate
        included_usage: 'unlimited',
        tiers: [
          {
            up_to: 'inf',
            unit_amount: 0,
            flat_amount: 9900 // $99 flat monthly fee, unlimited usage
          }
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Per-seat pricing with unlimited features for large teams.',
        lookup_key: `enterprise_monthly_${timestamp}`,
        metadata: {
          tier_id: 'enterprise',
          plan_type: 'per_seat',
          billing_model_type: 'per_seat',
          created_via: 'subscription_billing_v4'
        },
        base_amount: 2500, // $25.00 per user/month
        included_usage: 'unlimited',
        tiers: [
          {
            up_to: 'inf',
            unit_amount: 2500, // $25 per seat
            flat_amount: 0
          }
        ]
      }
    ];

    const results = [];

    // First, create a billing meter for usage tracking
    let meter;
    try {
      logStep("Creating billing meter for transaction tracking");
      meter = await stripe.billing.meters.create({
        display_name: 'Transaction Usage',
        event_name: 'transaction_usage',
        customer_mapping: {
          event_payload_key: 'customer_id',
          type: 'by_id'
        },
        default_aggregation: {
          formula: 'sum'
        },
        value_settings: {
          event_payload_key: 'value'
        }
      });
      logStep("Billing meter created", { meterId: meter.id });
    } catch (error: any) {
      logStep("Meter creation failed, continuing without meter", { error: error.message });
      meter = null;
    }

    for (const productDef of productDefinitions) {
      logStep(`Creating subscription product: ${productDef.name}`);
      
      try {
        // Create the product
        const product = await stripe.products.create({
          name: productDef.name,
          description: productDef.description,
          metadata: {
            ...productDef.metadata,
            meter_id: meter?.id || 'none'
          }
        });

        logStep(`Product created: ${product.id}`, { name: product.name });

        // Create graduated pricing based on the product type
        let priceCreateData: any = {
          currency: 'usd',
          product: product.id,
          lookup_key: productDef.lookup_key,
          metadata: {
            ...productDef.metadata,
            price_type: 'recurring_usage_based',
            included_usage: productDef.included_usage?.toString() || '0'
          },
          recurring: {
            interval: 'month',
            usage_type: productDef.id === 'business' || productDef.id === 'enterprise' ? 'licensed' : 'metered'
          }
        };

        // For usage-based plans, create graduated pricing
        if (productDef.id !== 'business' && productDef.id !== 'enterprise') {
          priceCreateData.billing_scheme = 'tiered';
          priceCreateData.tiers_mode = 'graduated';
          priceCreateData.tiers = productDef.tiers.map(tier => ({
            up_to: tier.up_to === 'inf' ? null : tier.up_to,
            unit_amount: tier.unit_amount,
            flat_amount: tier.flat_amount
          }));
          
          if (meter) {
            priceCreateData.recurring.meter = meter.id;
          }
        } else {
          // For flat-rate plans (business/enterprise)
          priceCreateData.billing_scheme = 'per_unit';
          priceCreateData.unit_amount = productDef.base_amount;
        }

        const price = await stripe.prices.create(priceCreateData);
        logStep(`Price created: ${price.id}`, { 
          billing_scheme: priceCreateData.billing_scheme,
          tiers_mode: priceCreateData.tiers_mode,
          lookup_key: productDef.lookup_key 
        });

        // Set the price as default for the product
        await stripe.products.update(product.id, {
          default_price: price.id
        });

        results.push({
          product_id: product.id,
          price_id: price.id,
          tier_id: productDef.id,
          name: productDef.name,
          lookup_key: productDef.lookup_key,
          billing_scheme: priceCreateData.billing_scheme,
          tiers_mode: priceCreateData.tiers_mode,
          base_amount: productDef.base_amount,
          included_usage: productDef.included_usage,
          meter_id: meter?.id,
          status: 'success'
        });

        logStep(`Subscription product setup complete for ${productDef.name}`, {
          productId: product.id,
          priceId: price.id,
          lookupKey: productDef.lookup_key,
          billingScheme: priceCreateData.billing_scheme
        });

      } catch (error: any) {
        logStep(`Error creating product ${productDef.name}`, { error: error.message });
        results.push({
          tier_id: productDef.id,
          name: productDef.name,
          error: error.message,
          status: 'error'
        });
      }
    }

    logStep("Subscription product creation complete", { 
      results: results.length,
      meter_created: !!meter
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription products created successfully',
        results,
        meter: meter ? { id: meter.id, display_name: meter.display_name } : null,
        summary: {
          products_created: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length,
          meter_created: !!meter
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in create-subscription-products", { message: error.message });
    
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
