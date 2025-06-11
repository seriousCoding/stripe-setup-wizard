
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Key, Bell, Shield, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const Settings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    companyName: profile?.company_name || '',
    defaultCurrency: 'USD',
    stripeApiKey: '',
    webhookEndpoint: '',
    notifications: {
      emailAlerts: true,
      billingUpdates: true,
      systemMaintenance: false
    },
    preferences: {
      autoSave: true,
      darkMode: false,
      compactView: false
    }
  });

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleStripeConnection = () => {
    toast({
      title: "Stripe Connection",
      description: "Stripe OAuth flow would be initiated here.",
    });
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast({
        title: "Account Deletion",
        description: "Account deletion process would be initiated here.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout
      title="Settings"
      description="Manage your account preferences and integrations"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Account Information</span>
            </CardTitle>
            <CardDescription>
              Basic account details and company information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={settings.companyName}
                  onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                  placeholder="Enter your company name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="default-currency">Default Currency</Label>
              <select
                id="default-currency"
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({...settings, defaultCurrency: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Stripe Integration</span>
            </CardTitle>
            <CardDescription>
              Connect your Stripe account to enable billing model deployment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Stripe Account</h4>
                <p className="text-sm text-gray-600">Not connected</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Disconnected</Badge>
                <Button onClick={handleStripeConnection}>
                  Connect Stripe
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="webhook-endpoint">Webhook Endpoint (Optional)</Label>
              <Input
                id="webhook-endpoint"
                value={settings.webhookEndpoint}
                onChange={(e) => setSettings({...settings, webhookEndpoint: e.target.value})}
                placeholder="https://your-app.com/webhooks/stripe"
              />
              <p className="text-xs text-gray-500 mt-1">
                Configure webhook endpoint for real-time payment notifications
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Configure how you want to receive updates and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {Object.entries({
                emailAlerts: 'Email Alerts',
                billingUpdates: 'Billing Updates',
                systemMaintenance: 'System Maintenance'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key}>{label}</Label>
                    <p className="text-sm text-gray-600">
                      {key === 'emailAlerts' && 'Receive important notifications via email'}
                      {key === 'billingUpdates' && 'Get notified about billing model changes'}
                      {key === 'systemMaintenance' && 'Alerts about scheduled maintenance'}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={settings.notifications[key as keyof typeof settings.notifications]}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          [key]: checked
                        }
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Customize your application experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {Object.entries({
                autoSave: 'Auto-save billing models',
                darkMode: 'Dark mode interface',
                compactView: 'Compact view layout'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key}>{label}</Label>
                  <Switch
                    id={key}
                    checked={settings.preferences[key as keyof typeof settings.preferences]}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        preferences: {
                          ...settings.preferences,
                          [key]: checked
                        }
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that will permanently affect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
              <div>
                <h4 className="font-medium text-red-600">Delete Account</h4>
                <p className="text-sm text-gray-600">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex space-x-3">
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          <Button variant="outline">
            Reset to Defaults
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
