
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Save, Mail, RefreshCw, Trash2, Shield, Lock, Key, Eye, EyeOff, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { emailService } from '@/services/emailService';
import DashboardLayout from '@/components/DashboardLayout';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ADMIN_PASSWORD, setADMIN_PASSWORD] = useState('stripe-admin-2024');
  
  // User settings
  const [userSettings, setUserSettings] = useState({
    displayName: '',
    email: '',
    company: '',
    phone: '',
    country: '',
    emailNotifications: true,
    marketingEmails: false,
    bio: ''
  });

  // Email test settings
  const [emailTest, setEmailTest] = useState({
    recipient: '',
    subject: 'Test Email from Stripe Setup Pilot',
    message: 'This is a test email to verify the email configuration is working correctly.'
  });

  useEffect(() => {
    if (user) {
      setUserSettings(prev => ({
        ...prev,
        email: user.email || '',
        displayName: user.user_metadata?.full_name || ''
      }));
      setEmailTest(prev => ({
        ...prev,
        recipient: user.email || ''
      }));
    }
  }, [user]);

  const handlePasswordSubmit = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
      toast({
        title: "Access Granted",
        description: "You now have access to Stripe management functions.",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "The passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setADMIN_PASSWORD(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setShowResetDialog(false);
    toast({
      title: "Password Updated",
      description: "Admin password has been successfully changed.",
    });
  };

  const handleCleanupStripeData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-stripe-products');

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Cleanup Completed",
          description: `Cleaned up ${data.summary?.products_processed || 0} products`,
        });
      }
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to cleanup Stripe data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeBilling = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-stripe-billing');

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Billing Initialized",
          description: `Created ${data.summary?.products_created || 0} products with meters and pricing`,
        });
      }
    } catch (error: any) {
      console.error('Initialize error:', error);
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize billing system. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () =>  {
    setIsLoading(true);
    try {
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: userSettings.displayName,
          company: userSettings.company,
          phone: userSettings.phone,
          country: userSettings.country,
          bio: userSettings.bio,
          email_notifications: userSettings.emailNotifications,
          marketing_emails: userSettings.marketingEmails
        }
      });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your settings have been successfully updated.",
      });
    } catch (error: any) {
      console.error('Save settings error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setIsLoading(true);
    try {
      const result = await emailService.sendGeneralAlert(
        emailTest.recipient,
        emailTest.subject,
        emailTest.message
      );

      if (result.success) {
        toast({
          title: "Email Sent",
          description: "Test email has been sent successfully.",
        });
      } else {
        throw new Error(result.error || 'Email sending failed');
      }
    } catch (error: any) {
      console.error('Email test error:', error);
      toast({
        title: "Email Test Failed",
        description: error.message || "Failed to send test email. Please check your email configuration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout 
      title="Settings" 
      description="Manage your account settings and preferences"
    >
      <div className="space-y-6 max-w-4xl">
        {/* User Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={userSettings.displayName}
                  onChange={(e) => setUserSettings({ ...userSettings, displayName: e.target.value })}
                  placeholder="Enter your display name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userSettings.email}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={userSettings.company}
                  onChange={(e) => setUserSettings({ ...userSettings, company: e.target.value })}
                  placeholder="Enter your company name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={userSettings.phone}
                  onChange={(e) => setUserSettings({ ...userSettings, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={userSettings.country}
                  onChange={(e) => setUserSettings({ ...userSettings, country: e.target.value })}
                  placeholder="Enter your country"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={userSettings.bio}
                onChange={(e) => setUserSettings({ ...userSettings, bio: e.target.value })}
                placeholder="Tell us about yourself"
                rows={3}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Notification Preferences</h4>
              <div className="flex items-center space-x-2">
                <Switch
                  id="emailNotifications"
                  checked={userSettings.emailNotifications}
                  onCheckedChange={(checked) => setUserSettings({ ...userSettings, emailNotifications: checked })}
                />
                <Label htmlFor="emailNotifications">Email Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="marketingEmails"
                  checked={userSettings.marketingEmails}
                  onCheckedChange={(checked) => setUserSettings({ ...userSettings, marketingEmails: checked })}
                />
                <Label htmlFor="marketingEmails">Marketing Emails</Label>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Email Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Email Configuration</span>
            </CardTitle>
            <CardDescription>
              Test your email configuration to ensure notifications are working properly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emailRecipient">Test Recipient</Label>
              <Input
                id="emailRecipient"
                type="email"
                value={emailTest.recipient}
                onChange={(e) => setEmailTest({ ...emailTest, recipient: e.target.value })}
                placeholder="Enter recipient email"
              />
            </div>
            <div>
              <Label htmlFor="emailSubject">Subject</Label>
              <Input
                id="emailSubject"
                value={emailTest.subject}
                onChange={(e) => setEmailTest({ ...emailTest, subject: e.target.value })}
                placeholder="Enter email subject"
              />
            </div>
            <div>
              <Label htmlFor="emailMessage">Message</Label>
              <Textarea
                id="emailMessage"
                value={emailTest.message}
                onChange={(e) => setEmailTest({ ...emailTest, message: e.target.value })}
                placeholder="Enter email message"
                rows={3}
              />
            </div>
            <Button onClick={handleTestEmail} disabled={isLoading} variant="outline">
              <TestTube className="h-4 w-4 mr-2" />
              Send Test Email
            </Button>
          </CardContent>
        </Card>

        {/* Stripe Management */}
        <Card className="shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 transform z-10 relative">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Stripe Management</span>
              {isAuthenticated ? (
                <Badge variant="outline" className="text-green-600 border-green-600 shadow-lg">Authenticated</Badge>
              ) : (
                <Badge variant="destructive" className="shadow-lg">Protected</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isAuthenticated 
                ? "Manage your Stripe products, prices, and test data"
                : "Enter the admin password to access Stripe management functions"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAuthenticated ? (
              <>
                <div>
                  <Label htmlFor="admin-password">Admin Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    className="shadow-inner hover:shadow-lg transition-shadow duration-300"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handlePasswordSubmit}
                    disabled={!password.trim()}
                    className="flex-1 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Authenticate
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowResetDialog(true)}
                    className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={handleInitializeBilling}
                    disabled={isLoading}
                    className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Initialize Billing
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        disabled={isLoading}
                        className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cleanup Stripe Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="shadow-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete all Stripe products, 
                          prices, and associated data from your Stripe account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="shadow-lg hover:shadow-xl transition-all duration-300">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleCleanupStripeData}
                          className="bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Yes, delete everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsAuthenticated(false)}
                    className="flex-1 text-gray-600 hover:text-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Lock Management Panel
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowResetDialog(true)}
                    className="shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Password Reset Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent className="shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{isAuthenticated ? 'Change' : 'Reset'} Admin Password</AlertDialogTitle>
              <AlertDialogDescription>
                Create a new admin password. Make sure it's at least 8 characters long.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 my-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600">Passwords do not match</p>
              )}
              {newPassword && newPassword.length < 8 && (
                <p className="text-sm text-red-600">Password must be at least 8 characters long</p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setNewPassword('');
                setConfirmPassword('');
                setShowNewPassword(false);
                setShowConfirmPassword(false);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handlePasswordReset}
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
              >
                Update Password
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
