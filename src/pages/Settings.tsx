
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Key, Bell, Shield, Trash2, Mail, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import StripeConnectionStatus from '@/components/StripeConnectionStatus';
import StripeManagement from '@/components/StripeManagement';
import { emailService } from '@/services/emailService';
import { useCustomToast } from '@/hooks/useCustomToast';

const Settings = () => {
  const { user, profile } = useAuth();
  const { toast } = useCustomToast();
  
  const [settings, setSettings] = useState({
    companyName: profile?.company_name || '',
    defaultCurrency: 'USD',
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

  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const handleSave = async () => {
    try {
      // Here you would save settings to your backend/database
      // For now, we'll just show a success message
      
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTestEmail = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No email address found for testing.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingEmail(true);
    
    try {
      const result = await emailService.sendGeneralAlert(
        user.email,
        "Test Email Notification",
        "This is a test email to verify your notification settings are working correctly. If you receive this message, your email notifications are properly configured!"
      );

      if (result.success) {
        toast({
          title: "Test Email Sent",
          description: "Check your inbox for the test notification email.",
          variant: "success",
        });
      } else {
        toast({
          title: "Email Test Failed",
          description: result.error || "Failed to send test email.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Email Test Failed",
        description: error.message || "Failed to send test email.",
        variant: "destructive",
      });
    } finally {
      setIsTestingEmail(false);
    }
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

        {/* Stripe Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Stripe Integration</span>
            </CardTitle>
            <CardDescription>
              Connect your Stripe account to enable billing model deployment and subscription management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StripeConnectionStatus />
            <StripeManagement />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Email Notifications</span>
            </CardTitle>
            <CardDescription>
              Configure how you want to receive updates and alerts via email
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
            
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Test Email Notifications</Label>
                  <p className="text-sm text-gray-600">
                    Send a test email to verify your notification settings
                  </p>
                </div>
                <Button 
                  onClick={handleTestEmail}
                  disabled={isTestingEmail}
                  variant="outline"
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isTestingEmail ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Preferences</CardTitle>
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
