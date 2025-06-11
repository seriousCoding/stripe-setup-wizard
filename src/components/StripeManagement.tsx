import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const StripeManagement = () => {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<any>(null);
  const [reseedResults, setReseedResults] = useState<any>(null);
  const { toast } = useToast();

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    setCleanupResults(null);
    
    try {
      console.log('Starting Stripe cleanup process...');
      const { data, error } = await supabase.functions.invoke('cleanup-stripe-products');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.success) {
        setCleanupResults(data);
        toast({
          title: "Cleanup Successful",
          description: `Deactivated ${data.summary?.deactivated_products || 0} products and ${data.summary?.deactivated_prices || 0} prices.`,
        });
        console.log('Cleanup completed successfully:', data);
      } else {
        throw new Error(data?.error || 'Cleanup failed');
      }
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleReseed = async () => {
    setIsReseeding(true);
    setReseedResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('reseed-stripe-products');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.success) {
        setReseedResults(data);
        toast({
          title: "Reseed Successful",
          description: `Created ${data.summary?.products_created || 0} new products.`,
        });
      } else {
        throw new Error(data?.error || 'Reseed failed');
      }
    } catch (error: any) {
      console.error('Reseed error:', error);
      toast({
        title: "Reseed Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReseeding(false);
    }
  };

  const handleFullReset = async () => {
    if (!confirm('This will cleanup all existing products and create new ones. Are you sure?')) {
      return;
    }
    
    // First cleanup, then reseed
    await handleCleanup();
    
    // Wait a moment for cleanup to complete
    setTimeout(async () => {
      await handleReseed();
    }, 2000);
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <CardTitle className="text-lg">Stripe Cleanup & Management</CardTitle>
              <CardDescription>
                Remove duplicates and clean up old products from your Stripe account
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-red-100">
            Cleanup Tools
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="destructive"
            onClick={handleCleanup}
            disabled={isCleaningUp || isReseeding}
            className="flex items-center space-x-2 h-auto p-4 flex-col"
          >
            {isCleaningUp ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
            <div className="text-center">
              <div className="font-medium">Remove Duplicates</div>
              <div className="text-xs opacity-90">
                Deactivate duplicate products
              </div>
            </div>
          </Button>

          <Button 
            variant="outline"
            onClick={handleReseed}
            disabled={isCleaningUp || isReseeding}
            className="flex items-center space-x-2 h-auto p-4 flex-col"
          >
            {isReseeding ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
            <div className="text-center">
              <div className="font-medium">Reseed</div>
              <div className="text-xs text-muted-foreground">
                Create new products
              </div>
            </div>
          </Button>

          <Button 
            onClick={handleFullReset}
            disabled={isCleaningUp || isReseeding}
            className="flex items-center space-x-2 h-auto p-4 flex-col bg-red-600 hover:bg-red-700"
          >
            <CheckCircle className="h-5 w-5" />
            <div className="text-center">
              <div className="font-medium">Full Reset</div>
              <div className="text-xs opacity-90">
                Cleanup + Reseed
              </div>
            </div>
          </Button>
        </div>

        {cleanupResults && (
          <div className="p-4 bg-white rounded-lg border border-green-200">
            <h4 className="font-medium mb-2 flex items-center text-green-700">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Cleanup Results
            </h4>
            <div className="text-sm space-y-1">
              <p>Products processed: {cleanupResults.summary?.products_processed || 0}</p>
              <p>Products deactivated: {cleanupResults.summary?.deactivated_products || 0}</p>
              <p>Prices deactivated: {cleanupResults.summary?.deactivated_prices || 0}</p>
            </div>
            {cleanupResults.results && cleanupResults.results.length > 0 && (
              <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                <p className="font-medium text-xs text-gray-600">Deactivated Products:</p>
                {cleanupResults.results
                  .filter((result: any) => result.action === 'deactivated' && result.status === 'success')
                  .map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                    <span className="truncate">{result.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      Removed
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {reseedResults && (
          <div className="p-4 bg-white rounded-lg border">
            <h4 className="font-medium mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Reseed Results
            </h4>
            <div className="text-sm space-y-1">
              <p>Products created: {reseedResults.summary?.products_created || 0}</p>
              <p>Errors: {reseedResults.summary?.errors || 0}</p>
            </div>
            {reseedResults.results && (
              <div className="mt-2 space-y-1">
                {reseedResults.results.map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span>{result.name}</span>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-red-800 bg-red-100 p-3 rounded-lg">
          <p className="font-medium mb-2">Cleanup Process:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Remove Duplicates:</strong> Deactivates old/duplicate products created by this app</li>
            <li><strong>Safe Operation:</strong> Only affects products with billing app metadata</li>
            <li><strong>Preserves Data:</strong> Products are deactivated, not permanently deleted</li>
            <li><strong>Price Cleanup:</strong> Associated prices are also deactivated</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default StripeManagement;
