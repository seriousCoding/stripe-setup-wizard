
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Copy, RefreshCw, Key, Bell, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [stripeApiKey, setStripeApiKey] = useState('sk_test_...');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    webhooks: true
  });
  const { toast } = useToast();

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(stripeApiKey);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been successfully updated.",
    });
  };

  return (
    <DashboardLayout
      title="Settings"
      description="Configure your API keys, preferences, and integrations"
    >
      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Stripe API Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure your Stripe API keys to enable product and billing management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stripe-key">Stripe Secret Key</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      id="stripe-key"
                      type={showApiKey ? "text" : "password"}
                      value={stripeApiKey}
                      onChange={(e) => setStripeApiKey(e.target.value)}
                      placeholder="sk_test_..."
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleCopyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Find your API keys in your Stripe Dashboard under Developers → API keys
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook Endpoint URL (Optional)</Label>
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://yourapp.com/webhook"
                />
                <p className="text-xs text-muted-foreground">
                  Configure webhooks to receive real-time updates from Stripe
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <div className="flex-1">
                  <Badge variant="secondary" className="mr-2">Test Mode</Badge>
                  <span className="text-sm text-muted-foreground">
                    Currently using Stripe test environment
                  </span>
                </div>
                <Button onClick={handleSaveSettings}>Save API Settings</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Current status of your integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Stripe API</span>
                  </div>
                  <Badge variant="outline">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Webhooks</span>
                  </div>
                  <Badge variant="secondary">Not Configured</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about important events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates for successful operations and errors
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notifications.email}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, email: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get browser notifications for real-time updates
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={notifications.push}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, push: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="webhook-notifications">Webhook Events</Label>
                  <p className="text-sm text-muted-foreground">
                    Forward important events to your webhook endpoint
                  </p>
                </div>
                <Switch
                  id="webhook-notifications"
                  checked={notifications.webhooks}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, webhooks: checked }))
                  }
                />
              </div>

              <Button onClick={handleSaveSettings} className="w-full">
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Manage your account security and data protection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>API Key Security</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your API keys are encrypted and stored securely
                  </p>
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rotate API Keys
                  </Button>
                </div>

                <div>
                  <Label>Data Export</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download your configuration data and audit logs
                  </p>
                  <Button variant="outline" className="w-full">
                    Export Data
                  </Button>
                </div>

                <div>
                  <Label>Account Deletion</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete your account and all associated data
                  </p>
                  <Button variant="destructive" className="w-full">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Settings;
