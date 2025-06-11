
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsageSummary {
  meter_name: string;
  display_name: string;
  unit_label: string;
  total_usage: number;
  event_count: number;
}

interface UseUsageTrackingReturn {
  usage: UsageSummary[];
  isLoading: boolean;
  error: string | null;
  recordUsage: (meterName: string, value?: number, metadata?: any) => Promise<void>;
  refetch: () => void;
}

export const useUsageTracking = (period: string = 'current_month'): UseUsageTrackingReturn => {
  const [usage, setUsage] = useState<UsageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('get-usage-summary', {
        body: { period }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setUsage(data.usage_summary || []);
      } else {
        throw new Error(data?.error || 'Failed to fetch usage summary');
      }
    } catch (err: any) {
      console.error('Error fetching usage:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const recordUsage = async (meterName: string, value: number = 1, metadata: any = {}) => {
    try {
      const { data, error } = await supabase.functions.invoke('record-usage-event', {
        body: {
          meter_name: meterName,
          value,
          metadata
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to record usage');
      }

      // Refresh usage data after recording
      fetchUsage();
    } catch (err: any) {
      console.error('Error recording usage:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [period]);

  return {
    usage,
    isLoading,
    error,
    recordUsage,
    refetch: fetchUsage
  };
};
