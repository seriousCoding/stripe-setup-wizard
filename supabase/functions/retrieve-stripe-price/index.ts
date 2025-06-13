
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { price_id, apiKey } = await req.json()

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe API key is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!price_id) {
      return new Response(
        JSON.stringify({ error: 'Price ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
    })

    console.log(`Retrieving price: ${price_id}`)

    const price = await stripe.prices.retrieve(price_id, {
      expand: ['product']
    })

    console.log(`Successfully retrieved price: ${price.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        price: price 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: any) {
    console.error('Error retrieving price:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to retrieve price',
        details: error.code || 'unknown_error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
