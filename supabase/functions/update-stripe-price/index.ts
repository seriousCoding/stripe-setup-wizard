import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { price_id, updates, apiKey } = await req.json()

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe API key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!price_id) {
      return new Response(
        JSON.stringify({ error: 'Price ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
    })

    console.log(`Updating price: ${price_id}`, updates)

    // Accept all allowed update fields according to Stripe API
    const allowedUpdates: any = {}

    if (updates.metadata !== undefined) allowedUpdates.metadata = updates.metadata
    if (updates.nickname !== undefined) allowedUpdates.nickname = updates.nickname
    if (updates.active !== undefined) allowedUpdates.active = updates.active
    if (updates.tax_behavior !== undefined) allowedUpdates.tax_behavior = updates.tax_behavior

    // New: Support advanced Stripe fields
    if (updates.lookup_key !== undefined) allowedUpdates.lookup_key = updates.lookup_key
    if (updates.transfer_lookup_key !== undefined) allowedUpdates.transfer_lookup_key = updates.transfer_lookup_key
    if (updates.currency_options !== undefined) allowedUpdates.currency_options = updates.currency_options

    const price = await stripe.prices.update(price_id, allowedUpdates)

    console.log(`Successfully updated price: ${price.id}`)

    return new Response(
      JSON.stringify({ success: true, price }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error updating price:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to update price', details: error.code || 'unknown_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
