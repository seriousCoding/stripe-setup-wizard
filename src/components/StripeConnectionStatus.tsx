
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectionData {
  connected: boolean;
  account_id?: string;
  business_profile?: string;
  error?: string;
}

const StripeConnectionStatus = () => {
  const [connectionData, setConnectionData] = useState<StripeConnectionData>({ connected: false });
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkStripeConnection = async () => {
    setIsChecking(true);
    try {
      console.log('Checking Stripe connection...');
      const { data, error } = await supabase.functions.invoke('check-stripe-connection');
      
      if (error) {
        console.error('Error checking Stripe connection:', error);
        setConnectionData({ connected: false, error: error.message });
        toast({
          title: "Connection Check Failed",
          description: error.message || "Could not verify Stripe connection",
          variant: "destructive",
        });
      } else {
        console.log('Stripe connection response:', data);
        setConnectionData(data);
        
        if (data?.connected) {
          toast({
            title: "Stripe Connected!",
            description: `Connected to account: ${data.business_profile || data.account_id}`,
          });
        } else {
          toast({
            title: "Stripe Not Connected",
            description: data?.error || "Please configure your Stripe secret key",
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      console.error('Connection check error:', err);
      setConnectionData({ connected: false, error: err.message });
      toast({
        title: "Connection Error",
        description: "Failed to check Stripe connection",
        variant: "destructive",
      });
    }
    setIsChecking(false);
  };

  useEffect(() => {
    checkStripeConnection();
  }, []);

  const openStripeSettings = () => {
    window.open('https://dashboard.stripe.com/settings', '_blank');
  };

  const openSupabaseSettings = () => {
    window.open('https://supabase.com/dashboard/project/ayjhwpdchmywpmorgoxx/settings/functions', '_blank');
  };

  return (
    <Card className={`border-2 ${connectionData.connected ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {connectionData.connected ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-orange-600" />
            )}
            <div>
              <CardTitle className="text-lg">
                Stripe Connection {connectionData.connected ? 'Active' : 'Required'}
              </CardTitle>
              <CardDescription>
                {connectionData.connected 
                  ? `Connected to: ${connectionData.business_profile || connectionData.account_id}`
                  : 'Connect your Stripe account to create billing models'
                }
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={connectionData.connected ? "default" : "secondary"}>
              {connectionData.connected ? 'Connected' : 'Not Connected'}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={checkStripeConnection}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!connectionData.connected && (
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-orange-800">
              {connectionData.error || 'To create and deploy billing models, you need to configure your Stripe secret key in the Supabase edge function settings.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={checkStripeConnection}
                disabled={isChecking}
              >
                {isChecking ? 'Checking...' : 'Check Connection'}
              </Button>
              <Button variant="outline" onClick={openSupabaseSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Configure API Key
              </Button>
              <Button variant="outline" onClick={openStripeSettings}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Stripe Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default StripeConnectionStatus;
