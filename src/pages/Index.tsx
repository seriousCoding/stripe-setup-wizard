
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SpreadsheetUpload from '@/components/SpreadsheetUpload';
import BillingModelGenerator from '@/components/BillingModelGenerator';
import BillingModelAnalyzer from '@/components/BillingModelAnalyzer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { billingModelService } from '@/services/billingModelService';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [analyzedData, setAnalyzedData] = useState<any[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const { subscriptionStatus, isLoading: subLoading } = useSubscription();
  const { usage, isLoading: usageLoading } = useUsageTracking();
  const { toast } = useToast();

  // Calculate dynamic stats based on real data
  const stats = [
    { 
      label: 'Subscription Status', 
      value: subLoading ? 'Loading...' : (subscriptionStatus.subscribed ? subscriptionStatus.subscription_tier || 'Active' : 'None'), 
      icon: subscriptionStatus.subscribed ? CheckCircle : AlertCircle, 
      change: subscriptionStatus.subscribed ? 'Active' : 'Upgrade needed',
      color: subscriptionStatus.subscribed ? 'text-green-600' : 'text-orange-600'
    },
    { 
      label: 'Total Usage Events', 
      value: usageLoading ? 'Loading...' : usage.reduce((sum, u) => sum + u.event_count, 0).toString(), 
      icon: TrendingUp, 
      change: '+12%',
      color: 'text-indigo-600'
    },
    { 
      label: 'Active Meters', 
      value: usageLoading ? 'Loading...' : usage.length.toString(), 
      icon: DollarSign, 
      change: '+8%',
      color: 'text-blue-600'
    },
    { 
      label: 'Data Processed', 
      value: uploadedData.length > 0 ? `${uploadedData.length} items` : '0 items', 
      icon: Users, 
      change: uploadedData.length > 0 ? 'Ready for processing' : 'Upload data',
      color: 'text-purple-600'
    }
  ];

  const handleDataUploaded = async (data: any[]) => {
    console.log('Data uploaded in Index:', data);
    setUploadedData(data);
    
    if (data.length > 0) {
      try {
        // Use AI service to analyze and recommend billing model
        const analysis = billingModelService.analyzeDataAndRecommend(data);
        setAnalyzedData(analysis.optimizedItems);
        setShowAnalyzer(true);
        
        toast({
          title: "Data Analyzed Successfully",
          description: `Found ${data.length} items. ${analysis.reasoning}`,
        });
      } catch (error) {
        console.error('Analysis error:', error);
        toast({
          title: "Analysis Warning",
          description: "Data uploaded but analysis failed. You can still proceed manually.",
          variant: "destructive",
        });
      }
    }
  };

  const handleModelSelect = (modelType: string) => {
    setShowAnalyzer(false);
    setShowGenerator(true);
    toast({
      title: "Model Selected",
      description: `Proceeding with ${modelType} billing model setup.`,
    });
  };

  const handleModelGenerated = (model: any) => {
    console.log('Model generated:', model);
    toast({
      title: "Billing Model Generated",
      description: "Your billing model has been created and saved successfully.",
    });
  };

  return (
    <DashboardLayout
      title="Data Upload & Billing Configuration"
      description="Upload your pricing data and let AI help you create optimized Stripe billing models"
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
                  <stat.icon className={`h-8 w-8 ${stat.color || 'text-indigo-600'}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data Upload Section */}
        {!showGenerator && (
          <SpreadsheetUpload onDataUploaded={handleDataUploaded} />
        )}

        {/* AI Analysis Results */}
        {showAnalyzer && analyzedData.length > 0 && !showGenerator && (
          <BillingModelAnalyzer 
            analyzedData={analyzedData}
            onModelSelect={handleModelSelect}
          />
        )}

        {/* Billing Model Generator */}
        {showGenerator && uploadedData.length > 0 && (
          <BillingModelGenerator
            uploadedData={analyzedData.length > 0 ? analyzedData : uploadedData}
            onModelGenerated={handleModelGenerated}
          />
        )}

        {/* Usage Summary */}
        {usage.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Current Usage Summary</CardTitle>
              <CardDescription>Your current metered usage across all services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usage.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium">{item.display_name}</span>
                      <div className="text-sm text-muted-foreground">
                        {item.meter_name} • {item.unit_label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.total_usage}</div>
                      <div className="text-xs text-muted-foreground">{item.event_count} events</div>
                    </div>
                  </div>
                ))}
                {usage.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    +{usage.length - 5} more meters...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest billing configuration activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { 
                  action: uploadedData.length > 0 ? `Processed ${uploadedData.length} pricing items` : 'No data uploaded yet', 
                  time: uploadedData.length > 0 ? 'Just now' : 'Waiting', 
                  status: uploadedData.length > 0 ? 'success' : 'pending' 
                },
                { 
                  action: subscriptionStatus.subscribed ? `Subscription: ${subscriptionStatus.subscription_tier}` : 'No active subscription', 
                  time: subscriptionStatus.subscribed ? 'Active' : 'Pending', 
                  status: subscriptionStatus.subscribed ? 'success' : 'warning' 
                },
                { 
                  action: `${usage.length} meters configured`, 
                  time: usage.length > 0 ? 'Active' : 'None', 
                  status: usage.length > 0 ? 'success' : 'pending' 
                },
                { 
                  action: 'AI analysis ready for uploaded data', 
                  time: analyzedData.length > 0 ? 'Ready' : 'Waiting for data', 
                  status: analyzedData.length > 0 ? 'success' : 'pending' 
                }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`h-2 w-2 rounded-full ${
                      item.status === 'success' ? 'bg-green-500' : 
                      item.status === 'warning' ? 'bg-yellow-500' : 'bg-gray-400'
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
