
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-USAGE-SUMMARY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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

    const user = data.user;
    logStep("User authenticated", { userId: user.id });

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'current_month';

    // Calculate period dates
    let periodStart: Date;
    let periodEnd: Date;
    const now = new Date();

    switch (period) {
      case 'current_month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last_month':
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'current_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        periodStart = startOfWeek;
        periodEnd = new Date(now);
        break;
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    logStep("Period calculated", { period, periodStart, periodEnd });

    // Get usage summary with meter details
    const { data: usageSummary, error: summaryError } = await supabaseClient
      .from('usage_events')
      .select(`
        meter_id,
        usage_meters!inner(name, display_name, unit_label),
        value
      `)
      .eq('user_id', user.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());

    if (summaryError) {
      throw new Error(`Failed to fetch usage summary: ${summaryError.message}`);
    }

    // Aggregate usage by meter
    const aggregatedUsage = usageSummary.reduce((acc: any, event: any) => {
      const meterName = event.usage_meters.name;
      if (!acc[meterName]) {
        acc[meterName] = {
          meter_name: meterName,
          display_name: event.usage_meters.display_name,
          unit_label: event.usage_meters.unit_label,
          total_usage: 0,
          event_count: 0
        };
      }
      acc[meterName].total_usage += parseFloat(event.value);
      acc[meterName].event_count += 1;
      return acc;
    }, {});

    const summary = Object.values(aggregatedUsage);

    logStep("Usage summary calculated", { summaryCount: summary.length });

    return new Response(
      JSON.stringify({ 
        success: true,
        period,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        usage_summary: summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in get-usage-summary", { message: error.message });
    
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
