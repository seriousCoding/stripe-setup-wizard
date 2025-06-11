
import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PayAsYouGoForm from '@/components/PayAsYouGoForm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, DollarSign, CheckCircle } from 'lucide-react';

const Index = () => {
  const stats = [
    { label: 'Products Created', value: '24', icon: TrendingUp, change: '+12%' },
    { label: 'Active Billing Rules', value: '156', icon: DollarSign, change: '+8%' },
    { label: 'API Calls Saved', value: '1,247', icon: CheckCircle, change: '+45%' },
    { label: 'Time Saved', value: '18hrs', icon: Users, change: 'This month' }
  ];

  return (
    <DashboardLayout
      title="Data Upload & Configuration"
      description="Upload your product data and let AI help you set up your Stripe billing configuration"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {stat.change}
                    </Badge>
                  </div>
                  <stat.icon className="h-8 w-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <PayAsYouGoForm />
      </div>
    </DashboardLayout>
  );
};

export default Index;
