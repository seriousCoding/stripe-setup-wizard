
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREDIT-INVOICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

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
      throw new Error('User not authenticated');
    }

    const { 
      customerId, 
      amount, 
      currency = 'usd', 
      description = 'Prepaid Credits',
      creditMultiplier = 1.2 // Default 20% bonus credits
    } = await req.json();

    if (!customerId || !amount) {
      throw new Error('Missing required parameters: customerId and amount');
    }

    logStep("Creating credit invoice", { customerId, amount, currency, description });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Create the invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      description: description,
      collection_method: 'charge_automatically',
      metadata: {
        type: 'credit_purchase',
        credit_amount: (amount * creditMultiplier).toString(),
        credit_multiplier: creditMultiplier.toString(),
        user_id: data.user.id
      }
    });

    logStep("Invoice created", { invoiceId: invoice.id });

    // Add the credit purchase item to the invoice
    const invoiceItem = await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      currency: currency.toLowerCase(),
      unit_amount_decimal: (amount * 100).toString(), // Convert to cents
      description: `${description} - $${(amount * creditMultiplier / 100).toFixed(2)} in credits`,
      metadata: {
        credit_value: (amount * creditMultiplier).toString(),
        purchase_amount: amount.toString()
      }
    });

    logStep("Invoice item added", { invoiceItemId: invoiceItem.id });

    // Finalize and send the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
      auto_advance: true
    });

    logStep("Invoice finalized", { 
      invoiceId: finalizedInvoice.id, 
      status: finalizedInvoice.status,
      hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        invoice: finalizedInvoice,
        invoice_url: finalizedInvoice.hosted_invoice_url,
        credit_amount: amount * creditMultiplier,
        purchase_amount: amount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in create-credit-invoice", { message: error.message });
    
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
