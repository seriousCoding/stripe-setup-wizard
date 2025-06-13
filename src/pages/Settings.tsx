
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { emailService } from '@/services/emailService';
import DashboardLayout from '@/components/DashboardLayout';
import StripeManagement from '@/components/StripeManagement';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  useEffect(() => {
    // Load settings from local storage or database
    // For now, just initialize to true
    setIsNotificationsEnabled(true);
  }, []);

  const saveSettings = async () => {
    // Save settings to local storage or database
    toast({
      title: "Settings Saved",
      description: "Your settings have been saved.",
    });
  };

  const testEmailNotification = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No user email found",
        variant: "destructive",
      });
      return;
    }

    setIsTestingEmail(true);
    
    const result = await emailService.sendGeneralAlert(
      user.email,
      "Test Email Notification",
      "This is a test email to verify your notification settings are working correctly. If you receive this message, your email notifications are properly configured!"
    );

    if (result.success) {
      toast({
        title: "Test Email Sent",
        description: "Check your email inbox for the test notification.",
      });
    } else {
      toast({
        title: "Email Test Failed",
        description: result.error || "Failed to send test email. Please check your SMTP configuration.",
        variant: "destructive",
      });
    }

    setIsTestingEmail(false);
  };

  return (
    <DashboardLayout title="Settings" description="Manage your account settings and preferences">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>View and update your basic account information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || 'N/A'} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your Name" defaultValue={user?.user_metadata?.full_name || ''} />
            </div>
            <Button onClick={saveSettings}>Update Profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage your notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <Switch
                id="notifications"
                checked={isNotificationsEnabled}
                onCheckedChange={(checked) => setIsNotificationsEnabled(checked)}
              />
            </div>
            <Button onClick={saveSettings}>Save Notification Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Test your email notification settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testEmailNotification} disabled={isTestingEmail}>
              {isTestingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <StripeManagement />
      </div>
    </DashboardLayout>
  );
};

export default Settings;
