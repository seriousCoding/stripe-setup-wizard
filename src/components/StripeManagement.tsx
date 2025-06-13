import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Shield, Lock, Eye, EyeOff, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const StripeManagement = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simple password for demo - in production this should be more secure
  const [ADMIN_PASSWORD, setADMIN_PASSWORD] = useState('stripe-admin-2024');

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
      console.log('Starting Stripe cleanup...');
      
      const { data, error } = await supabase.functions.invoke('cleanup-stripe-products', {
        body: {}
      });

      if (error) {
        console.error('Cleanup error:', error);
        throw new Error(error.message);
      }

      if (data?.success) {
        toast({
          title: "Cleanup Completed",
          description: data.message || "All Stripe products and prices have been archived.",
        });
      } else {
        throw new Error(data?.error || 'Cleanup failed');
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

  const handleReseedStripeData = async () => {
    setIsLoading(true);
    try {
      console.log('Starting Stripe reseed...');
      
      const { data, error } = await supabase.functions.invoke('reseed-stripe-products', {
        body: {}
      });

      if (error) {
        console.error('Reseed error:', error);
        throw new Error(error.message);
      }

      if (data?.success) {
        toast({
          title: "Reseed Completed",
          description: data.message || "Sample Stripe products and prices have been created.",
        });
      } else {
        throw new Error(data?.error || 'Reseed failed');
      }
    } catch (error: any) {
      console.error('Reseed error:', error);
      toast({
        title: "Reseed Failed",
        description: error.message || "Failed to reseed Stripe data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 transform z-10 relative">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>Stripe Management</span>
            <Badge variant="destructive" className="shadow-lg">Protected</Badge>
          </CardTitle>
          <CardDescription>
            Enter the admin password to access Stripe management functions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>

        {/* Password Reset Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent className="shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Admin Password</AlertDialogTitle>
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
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 transform z-10 relative">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Stripe Management</span>
          <Badge variant="outline" className="text-green-600 border-green-600 shadow-lg">Authenticated</Badge>
        </CardTitle>
        <CardDescription>
          Manage your Stripe products, prices, and test data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isLoading}
                className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isLoading ? 'Processing...' : 'Cleanup Stripe Data'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will archive all Stripe products, prices, and deactivate billing meters. 
                  This is reversible by reactivating them in the Stripe dashboard.
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
                  Yes, cleanup data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                disabled={isLoading}
                className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isLoading ? 'Processing...' : 'Reseed Test Data'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Reseed Stripe Test Data</AlertDialogTitle>
                <AlertDialogDescription>
                  This will create sample products, prices, and billing meters in your Stripe account for testing purposes.
                  This is safe to run multiple times.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="shadow-lg hover:shadow-xl transition-all duration-300">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleReseedStripeData}
                  className="shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Create Test Data
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
      </CardContent>

      {/* Password Reset Dialog for authenticated users */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Admin Password</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new admin password. Make sure it's at least 8 characters long.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="new-password-auth">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password-auth"
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
              <Label htmlFor="confirm-password-auth">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password-auth"
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
    </Card>
  );
};

export default StripeManagement;
