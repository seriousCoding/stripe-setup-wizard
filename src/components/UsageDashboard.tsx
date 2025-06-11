
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { useUsageTracking } from '@/hooks/useUsageTracking';

interface UsageDashboardProps {
  period?: string;
  limits?: Record<string, number>;
}

const UsageDashboard: React.FC<UsageDashboardProps> = ({ 
  period = 'current_month',
  limits = {} 
}) => {
  const { usage, isLoading, error } = useUsageTracking(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Usage Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-300 rounded mb-2"></div>
                <div className="h-2 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Usage Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Usage Overview</span>
          <Badge variant="outline" className="ml-auto">
            {period === 'current_month' ? 'This Month' : 
             period === 'current_week' ? 'This Week' : 
             'Last Month'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {usage.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No usage data available</p>
          ) : (
            usage.map((item) => {
              const limit = limits[item.meter_name];
              const percentage = limit ? Math.min((item.total_usage / limit) * 100, 100) : 0;
              const isNearLimit = percentage > 80;
              const isOverLimit = percentage >= 100;

              return (
                <div key={item.meter_name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">{item.display_name}</h4>
                      <p className="text-sm text-slate-500">
                        {item.total_usage.toLocaleString()} {item.unit_label}
                        {limit && (
                          <span className="ml-1">/ {limit.toLocaleString()} {item.unit_label}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isOverLimit && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {isNearLimit && !isOverLimit && <TrendingUp className="h-4 w-4 text-orange-500" />}
                      <Badge variant={isOverLimit ? "destructive" : isNearLimit ? "secondary" : "outline"}>
                        {item.event_count} events
                      </Badge>
                    </div>
                  </div>
                  {limit && (
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${
                        isOverLimit ? 'bg-red-100' : 
                        isNearLimit ? 'bg-orange-100' : 
                        'bg-green-100'
                      }`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageDashboard;
