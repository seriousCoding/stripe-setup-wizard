import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const StripeManagement = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const { toast } = useToast();

  const initializeBilling = async () => {
    setIsInitializing(true);
    try {
      console.log('Initializing Stripe billing system...');
      
      const { data, error } = await supabase.functions.invoke('initialize-stripe-billing');

      if (error) {
        throw error;
      }

      console.log('Billing initialization result:', data);
      
      if (data?.success) {
        toast({
          title: "Billing System Initialized",
          description: `Successfully set up ${data.summary?.plans_created || 0} billing plans with usage meters.`,
        });
      } else {
        throw new Error(data?.error || 'Failed to initialize billing system');
      }
    } catch (error: any) {
      console.error('Billing initialization error:', error);
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize Stripe billing system",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const cleanupStripe = async () => {
    setIsCleaningUp(true);
    try {
      console.log('Cleaning up Stripe products and prices...');
      
      const { data, error } = await supabase.functions.invoke('cleanup-stripe-products');

      if (error) {
        throw error;
      }

      console.log('Cleanup result:', data);
      
      if (data?.success) {
        toast({
          title: "Stripe Cleanup Complete",
          description: data.message || "Stripe products and prices cleaned up successfully.",
        });
      } else {
        throw new Error(data?.error || 'Failed to cleanup Stripe products and prices');
      }
    } catch (error: any) {
      console.error('Stripe cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to cleanup Stripe products and prices",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Management</CardTitle>
        <CardDescription>
          Manage your Stripe integration and billing setup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={initializeBilling}
            disabled={isInitializing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Initialize Billing System
              </>
            )}
          </Button>

          <Button
            onClick={cleanupStripe}
            disabled={isCleaningUp}
            className="bg-red-600 hover:bg-red-700"
          >
            {isCleaningUp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cleaning Up...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Cleanup Stripe Products
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StripeManagement;
