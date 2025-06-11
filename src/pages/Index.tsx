
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SpreadsheetUpload from '@/components/SpreadsheetUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

        <SpreadsheetUpload />

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest Stripe configuration activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'Created product "API Service Pro"', time: '2 hours ago', status: 'success' },
                { action: 'Updated pricing for "Storage Plan"', time: '1 day ago', status: 'success' },
                { action: 'Added meter "Database Queries"', time: '2 days ago', status: 'success' },
                { action: 'Validation failed for pricing data', time: '3 days ago', status: 'error' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`h-2 w-2 rounded-full ${
                      item.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm">{item.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;
