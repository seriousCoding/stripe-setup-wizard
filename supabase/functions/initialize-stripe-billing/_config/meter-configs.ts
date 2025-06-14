
export interface MeterConfig {
  supabase_name: string;
  display_name: string;
  event_name: string;
  unit_label: string;
  customer_mapping: { event_payload_key: string; type: 'by_id' };
  default_aggregation: { formula: 'sum' };
  value_settings: { event_payload_key: string };
}

export const METER_CONFIGS: MeterConfig[] = [
  {
    supabase_name: 'transaction_usage_meter',
    display_name: 'Transaction Usage',
    event_name: 'transaction_usage',
    unit_label: 'transactions',
    customer_mapping: { event_payload_key: 'stripe_customer_id', type: 'by_id' as const },
    default_aggregation: { formula: 'sum' as const },
    value_settings: { event_payload_key: 'value' },
  },
  {
    supabase_name: 'ai_processing_meter',
    display_name: 'AI Processing Usage',
    event_name: 'ai_processing_usage',
    unit_label: 'requests',
    customer_mapping: { event_payload_key: 'stripe_customer_id', type: 'by_id' as const },
    default_aggregation: { formula: 'sum' as const },
    value_settings: { event_payload_key: 'value' },
  }
];
