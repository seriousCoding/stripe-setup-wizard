
-- Create usage_meters table to define different meter types
CREATE TABLE public.usage_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  event_name TEXT NOT NULL UNIQUE,
  stripe_meter_id TEXT,
  unit_label TEXT DEFAULT 'units',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create usage_events table to log individual usage events
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES public.usage_meters(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  value DECIMAL(10,4) NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  stripe_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_usage_summary table for aggregated usage data
CREATE TABLE public.user_usage_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES public.usage_meters(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_usage DECIMAL(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, meter_id, period_start, period_end)
);

-- Enable RLS on all tables
ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_meters (readable by all authenticated users)
CREATE POLICY "Everyone can view usage meters" ON public.usage_meters
  FOR SELECT TO authenticated
  USING (true);

-- RLS policies for usage_events (users can only see their own events)
CREATE POLICY "Users can view their own usage events" ON public.usage_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own usage events" ON public.usage_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS policies for user_usage_summary (users can only see their own summaries)
CREATE POLICY "Users can view their own usage summary" ON public.user_usage_summary
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own usage summary" ON public.user_usage_summary
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own usage summary" ON public.user_usage_summary
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Insert default meters
INSERT INTO public.usage_meters (name, display_name, event_name, unit_label) VALUES
  ('api_calls', 'API Calls', 'api_call', 'calls'),
  ('transactions', 'Transactions', 'transaction', 'transactions'),
  ('ai_processing', 'AI Processing', 'ai_process', 'requests'),
  ('data_exports', 'Data Exports', 'data_export', 'exports');
