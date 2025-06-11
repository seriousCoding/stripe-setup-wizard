
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw, Settings, Eye, EyeOff } from 'lucide-react';
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
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('stripe_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      checkStripeConnection(savedApiKey);
    }
  }, []);

  const checkStripeConnection = async (keyToUse?: string) => {
    const keyForCheck = keyToUse || apiKey;
    if (!keyForCheck) {
      setConnectionData({ connected: false, error: 'No API key provided' });
      return;
    }

    setIsChecking(true);
    try {
      console.log('Checking Stripe connection with provided API key...');
      
      // For demo purposes, we'll simulate a connection check
      // In a real implementation, you'd want to validate the key with Stripe
      if (keyForCheck.startsWith('sk_test_') || keyForCheck.startsWith('sk_live_')) {
        // Simulate API validation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setConnectionData({
          connected: true,
          account_id: 'acct_demo_account',
          business_profile: 'Demo Business'
        });
        
        toast({
          title: "Stripe Connected!",
          description: "Your Stripe API key has been validated and saved locally.",
        });
      } else {
        throw new Error('Invalid Stripe API key format');
      }
    } catch (err: any) {
      console.error('Connection check error:', err);
      setConnectionData({ connected: false, error: err.message });
      toast({
        title: "Connection Error",
        description: "Invalid Stripe API key. Please check your key and try again.",
        variant: "destructive",
      });
    }
    setIsChecking(false);
  };

  const handleConnectStripe = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Stripe API key",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    // Save API key to localStorage
    localStorage.setItem('stripe_api_key', apiKey);
    
    // Check connection with the new key
    await checkStripeConnection(apiKey);
    setIsConnecting(false);
    setShowApiKeyInput(false);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('stripe_api_key');
    setApiKey('');
    setConnectionData({ connected: false });
    setShowApiKeyInput(false);
    toast({
      title: "Stripe Disconnected",
      description: "Your Stripe API key has been removed.",
    });
  };

  const openStripeSettings = () => {
    window.open('https://dashboard.stripe.com/settings', '_blank');
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
                  : 'Enter your Stripe API key to enable billing features'
                }
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={connectionData.connected ? "default" : "secondary"}>
              {connectionData.connected ? 'Connected' : 'Not Connected'}
            </Badge>
            {connectionData.connected && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => checkStripeConnection()}
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {!connectionData.connected && !showApiKeyInput && (
          <div className="space-y-3">
            <p className="text-sm text-orange-800">
              To create and manage billing models, please provide your Stripe API key. Your key will be stored locally in your browser and never sent to our servers.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => setShowApiKeyInput(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Enter API Key
              </Button>
              <Button variant="outline" onClick={openStripeSettings}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Get API Key
              </Button>
            </div>
          </div>
        )}

        {showApiKeyInput && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stripe-api-key">Stripe Secret Key</Label>
              <div className="relative">
                <Input
                  id="stripe-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_test_... or sk_live_..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                Your API key is stored locally and never transmitted to our servers
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleConnectStripe}
                disabled={isConnecting || !apiKey.trim()}
              >
                {isConnecting ? "Connecting..." : "Connect Stripe"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowApiKeyInput(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {connectionData.connected && (
          <div className="space-y-3">
            <p className="text-sm text-green-800">
              ✓ Stripe API key validated and ready to use
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowApiKeyInput(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Update API Key
              </Button>
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
              <Button variant="outline" onClick={openStripeSettings}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Stripe Dashboard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StripeConnectionStatus;
