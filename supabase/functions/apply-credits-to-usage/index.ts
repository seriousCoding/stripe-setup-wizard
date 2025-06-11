
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
    const { customerId, usageAmount, currency, apiKey } = await req.json();

    if (!customerId || !usageAmount || !apiKey) {
      throw new Error('Missing required parameters');
    }

    const stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
    });

    // Get customer's credit grants
    const creditGrants = await stripe.customers.listCreditGrants(customerId);
    
    let appliedAmount = 0;
    let remainingUsage = usageAmount;
    const creditsUsed = [];

    // Sort by expiration date (earliest first) to use credits that expire soonest
    const availableCredits = creditGrants.data
      .filter(grant => grant.amount.remaining > 0)
      .sort((a, b) => {
        if (!a.expires_at && !b.expires_at) return 0;
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return a.expires_at - b.expires_at;
      });

    for (const credit of availableCredits) {
      if (remainingUsage <= 0) break;

      const availableCredit = credit.amount.remaining;
      const amountToUse = Math.min(availableCredit, remainingUsage);

      if (amountToUse > 0) {
        // Record credit usage
        creditsUsed.push({
          id: credit.id,
          amount_used: amountToUse,
          description: `Applied to usage charges`,
          created_at: new Date().toISOString()
        });

        appliedAmount += amountToUse;
        remainingUsage -= amountToUse;
      }
    }

    console.log(`Applied ${appliedAmount} in credits to ${customerId}, remaining charge: ${remainingUsage}`);

    return new Response(
      JSON.stringify({
        appliedAmount,
        remainingUsage,
        creditsUsed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error applying credits:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
