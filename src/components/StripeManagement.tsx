
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Shield, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const StripeManagement = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simple password for demo - in production this should be more secure
  const ADMIN_PASSWORD = 'stripe-admin-2024';

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

  const handleCleanupStripeData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cleanup-stripe-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Cleanup Completed",
          description: "All Stripe products and prices have been removed.",
        });
      } else {
        throw new Error('Cleanup failed');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to cleanup Stripe data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReseedStripeData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/seed-stripe-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Reseed Completed",
          description: "Sample Stripe products and prices have been created.",
        });
      } else {
        throw new Error('Reseed failed');
      }
    } catch (error) {
      console.error('Reseed error:', error);
      toast({
        title: "Reseed Failed",
        description: "Failed to reseed Stripe data. Please try again.",
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
          <Button 
            onClick={handlePasswordSubmit}
            disabled={!password.trim()}
            className="w-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform"
          >
            <Shield className="h-4 w-4 mr-2" />
            Authenticate
          </Button>
        </CardContent>
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

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                disabled={isLoading}
                className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reseed Test Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Reseed Stripe Test Data</AlertDialogTitle>
                <AlertDialogDescription>
                  This will create sample products and prices in your Stripe account for testing purposes.
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

        <Button 
          variant="ghost" 
          onClick={() => setIsAuthenticated(false)}
          className="w-full text-gray-600 hover:text-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Lock Management Panel
        </Button>
      </CardContent>
    </Card>
  );
};

export default StripeManagement;
