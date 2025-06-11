
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId, apiKey } = await req.json();

    if (!customerId || !apiKey) {
      throw new Error('Missing required parameters');
    }

    const stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
    });

    // Get customer's credit grants
    const creditGrants = await stripe.customers.listCreditGrants(customerId);
    
    const credits = creditGrants.data.map(grant => ({
      id: grant.id,
      customer_id: customerId,
      amount: grant.amount.value,
      remaining_balance: grant.amount.remaining,
      currency: grant.amount.currency,
      expires_at: grant.expires_at ? new Date(grant.expires_at * 1000).toISOString() : null,
      created_at: new Date(grant.created * 1000).toISOString(),
      metadata: grant.metadata
    }));

    return new Response(
      JSON.stringify({ credits }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error getting customer credits:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
