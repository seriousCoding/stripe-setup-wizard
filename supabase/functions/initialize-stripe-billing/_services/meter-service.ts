
import Stripe from "https://esm.sh/stripe@14.21.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logStep } from "../../../_shared/logger.ts";
import { METER_CONFIGS, MeterConfig } from "../_config/meter-configs.ts";

async function getOrCreateStripeMeter(
  stripe: Stripe,
  supabaseClient: SupabaseClient,
  config: MeterConfig
): Promise<string | undefined> {
  logStep(`Processing meter: ${config.display_name}`);

  let { data: dbMeter, error: dbFetchError } = await supabaseClient
    .from('usage_meters')
    .select('id, stripe_meter_id')
    .eq('event_name', config.event_name)
    .single();

  if (dbFetchError && dbFetchError.code !== 'PGRST116') {
    logStep(`Error fetching meter ${config.event_name} from Supabase: ${dbFetchError.message}`);
  }

  if (dbMeter && dbMeter.stripe_meter_id) {
    logStep(`Meter ${config.display_name} found in Supabase with Stripe ID: ${dbMeter.stripe_meter_id}`);
    try {
      await stripe.billing.meters.retrieve(dbMeter.stripe_meter_id);
      logStep(`Stripe meter ${dbMeter.stripe_meter_id} confirmed active.`);
      return dbMeter.stripe_meter_id;
    } catch (retrieveError: any) {
      logStep(`Stripe meter ${dbMeter.stripe_meter_id} not found or error retrieving. Will attempt to recreate. Error: ${retrieveError.message}`);
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
    logStep(`Error upserting meter ${config.event_name} into Supabase: ${upsertError.message}. Stripe Meter ID: ${stripeMeter.id}`);
  } else {
    logStep(`Upserted meter ${config.event_name} into Supabase with Stripe ID: ${stripeMeter.id}`);
  }
  return stripeMeter.id;
}

export async function processMeters(
  stripe: Stripe,
  supabaseClient: SupabaseClient
): Promise<{ [key: string]: string | undefined }> {
  const stripeMeterIdsMap: { [key: string]: string | undefined } = {};
  for (const config of METER_CONFIGS) {
    try {
      stripeMeterIdsMap[config.event_name] = await getOrCreateStripeMeter(stripe, supabaseClient, config);
    } catch (meterError: any) {
      logStep(`Failed to process meter ${config.event_name}: ${meterError.message}. This meter will not be available for pricing.`);
      stripeMeterIdsMap[config.event_name] = undefined;
    }
  }
  logStep("All defined meters processed. Available Stripe Meter IDs:", stripeMeterIdsMap);
  return stripeMeterIdsMap;
}
