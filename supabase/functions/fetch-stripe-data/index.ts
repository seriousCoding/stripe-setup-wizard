
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
      throw new Error('Stripe secret key not configured in Supabase secrets. Please add STRIPE_SECRET_KEY to your edge function secrets.');
    }
    logStep("Stripe secret key found", { keyPrefix: stripeSecretKey.substring(0, 7) });

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

    // Fetch ALL active products with their default prices
    const products = await stripe.products.list({
      expand: ['data.default_price'],
      active: true,
      limit: 100
    });

    logStep("All products fetched from Stripe", { count: products.data.length });

    // Show all products - no filtering
    const allProducts = products.data;

    logStep("Showing all customer products", { 
      totalCount: allProducts.length 
    });

    // Enhance products with meter information and usage limits
    const enhancedProducts = await Promise.all(
      allProducts.map(async (product) => {
        const enhanced = {
          ...product,
          usage_limits: {},
          meter_info: null,
          graduated_pricing: null
        };

        // Parse usage limits from metadata if they exist
        if (product.metadata) {
          enhanced.usage_limits = {
            transactions: parseInt(product.metadata.usage_limit_transactions || '0'),
            ai_processing: parseInt(product.metadata.usage_limit_ai_processing || '0'),
            data_exports: parseInt(product.metadata.usage_limit_data_exports || '0'),
            api_calls: parseInt(product.metadata.usage_limit_api_calls || '0'),
            meter_rate: parseFloat(product.metadata.meter_rate || '0'),
            package_credits: parseInt(product.metadata.package_credits || '0'),
            included_usage: parseInt(product.metadata.included_usage || '0'),
            usage_unit: product.metadata.usage_unit || 'units',
            tier_id: product.metadata.tier_id || '',
            billing_model_type: product.metadata.billing_model_type || ''
          };
        }

        // If this is a metered product, try to find associated meter
        if (product.metadata?.meter_name || product.metadata?.event_name) {
          try {
            const meters = await stripe.billing.meters.list({
              limit: 100
            });
            
            const associatedMeter = meters.data.find(
              meter => meter.event_name === (product.metadata.meter_name || product.metadata.event_name) ||
                      meter.display_name === product.name
            );
            
            if (associatedMeter) {
              enhanced.meter_info = {
                id: associatedMeter.id,
                event_name: associatedMeter.event_name,
                display_name: associatedMeter.display_name,
                status: associatedMeter.status,
                aggregation: associatedMeter.default_aggregation
              };
            }
          } catch (meterError) {
            logStep("Error fetching meter info", { productId: product.id, error: meterError.message });
          }
        }

        // If this has a default price with graduated pricing, fetch tier details
        if (product.default_price && typeof product.default_price === 'object') {
          const price = product.default_price as any;
          if (price.billing_scheme === 'tiered' && price.tiers) {
            enhanced.graduated_pricing = {
              billing_scheme: price.billing_scheme,
              tiers: price.tiers,
              tiers_mode: price.tiers_mode
            };
          }
        }

        return enhanced;
      })
    );

    logStep("Enhanced products with usage limits and meter info", { 
      enhancedCount: enhancedProducts.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        products: enhancedProducts,
        total_count: enhancedProducts.length,
        showing_all_products: true,
        filtered: false
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
