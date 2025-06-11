
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Eye, Download, Calendar, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { billingModelService } from '@/services/billingModelService';
import type { BillingModel } from '@/services/stripeService';

const SavedModelsList = () => {
  const [models, setModels] = useState<BillingModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadModels = async () => {
    setLoading(true);
    const { models: savedModels, error } = await billingModelService.getBillingModels();
    
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      setModels(savedModels || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleDelete = async (modelId: string) => {
    setDeletingId(modelId);
    
    const { error } = await billingModelService.deleteBillingModel(modelId);
    
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Model Deleted",
        description: "Billing model has been removed.",
      });
      // Reload models to reflect changes
      await loadModels();
    }
    
    setDeletingId(null);
  };

  const handleDownload = (model: BillingModel) => {
    const config = billingModelService.generateStripeConfiguration(model);
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.name.toLowerCase().replace(/\s+/g, '_')}_stripe_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Configuration Downloaded",
      description: "Stripe configuration file has been downloaded.",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (models.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Saved Models</CardTitle>
          <CardDescription>
            You haven't created any billing models yet. Upload data to get started.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Saved Billing Models ({models.length})</h3>
        <Button variant="outline" onClick={loadModels}>
          Refresh
        </Button>
      </div>
      
      <div className="grid gap-4">
        {models.map((model) => (
          <Card key={model.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{model.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {model.description || 'No description provided'}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{model.type}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(model)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(model.id)}
                    disabled={deletingId === model.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    {deletingId === model.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span>{model.items.length} items</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{new Date(model.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">Recurring:</span>
                  <span>{model.items.filter(i => i.type === 'recurring').length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">Metered:</span>
                  <span>{model.items.filter(i => i.type === 'metered').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SavedModelsList;
