import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0"; // Ensure version matches other functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"; // Ensure version matches

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewPriceConfig {
  unit_amount: number; // In cents
  currency: string;
  type: 'one_time' | 'recurring';
  recurring?: {
    interval: 'month' | 'year' | 'week' | 'day';
    interval_count: number;
    usage_type: 'licensed' | 'metered';
    aggregate_usage?: 'sum' | 'last_during_period' | 'last_ever' | 'max'; // For metered
  };
  billing_scheme: 'per_unit' | 'tiered'; // For simplicity, initial replacement might focus on per_unit
  // Carry-over fields
  nickname?: string | null;
  tax_behavior?: 'inclusive' | 'exclusive' | 'unspecified';
  metadata?: Record<string, string>;
  active?: boolean; // New price should be active
  // For metered billing if a new meter is also needed or linked
  meter_data?: { 
    event_name: string; // if linking to an existing meter, this would be its event_name
    // Potentially other meter config if creating a new one implicitly, 
    // but for price replacement, usually linking to existing or just setting usage_type
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for admin actions
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error(userError?.message || 'User not authenticated');
    }
    const user = userData.user;

    const {
      product_id,
      old_price_id,
      new_price_config,
      api_key: clientApiKey, // API key passed from client-side stripeService
    } = await req.json();

    if (!product_id || !old_price_id || !new_price_config) {
      throw new Error('Product ID, Old Price ID, and New Price Configuration are required.');
    }
    
    const stripeKey = clientApiKey || Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe API key not configured.');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16', // Specify API version
    });

    // 1. Create the new price
    const priceCreateParams: Stripe.PriceCreateParams = {
      product: product_id,
      unit_amount: new_price_config.unit_amount,
      currency: new_price_config.currency.toLowerCase(),
      active: new_price_config.active !== undefined ? new_price_config.active : true, // Default to active
      nickname: new_price_config.nickname || undefined,
      tax_behavior: new_price_config.tax_behavior || undefined,
      metadata: { 
        ...new_price_config.metadata,
        replaced_price_id: old_price_id, // Add metadata linking to the old price
        created_by_user_id: user.id,
      },
      billing_scheme: new_price_config.billing_scheme,
    };

    if (new_price_config.type === 'recurring' && new_price_config.recurring) {
      priceCreateParams.recurring = {
        interval: new_price_config.recurring.interval,
        interval_count: new_price_config.recurring.interval_count,
        usage_type: new_price_config.recurring.usage_type,
      };
      if (new_price_config.recurring.usage_type === 'metered') {
        priceCreateParams.recurring.aggregate_usage = new_price_config.recurring.aggregate_usage || 'sum';
        // If new_price_config.meter_data.event_name is provided, link to existing meter
        // For now, we assume metered price creation details are handled in new_price_config
      }
    }
    // Add tiered configuration if billing_scheme is 'tiered' (future enhancement, complex)
    // if (new_price_config.billing_scheme === 'tiered' && new_price_config.tiers) {
    // priceCreateParams.tiers = new_price_config.tiers;
    // priceCreateParams.tiers_mode = new_price_config.tiers_mode;
    // }

    const newPrice = await stripe.prices.create(priceCreateParams);

    // 2. Archive the old price
    const archivedPrice = await stripe.prices.update(old_price_id, { active: false });

    // 3. Check if old price was the default and update product if so
    const product = await stripe.products.retrieve(product_id);
    if (product.default_price === old_price_id) {
      await stripe.products.update(product_id, { default_price: newPrice.id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        newPrice,
        archivedPrice,
        message: 'Price replaced successfully. New price created, old price archived.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error replacing price:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
