
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Eye, Download, Trash2, RefreshCw, Plus } from 'lucide-react';
import { billingModelService } from '@/services/billingModelService';
import { BillingModel } from '@/services/stripeService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SavedModels = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [models, setModels] = useState<BillingModel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadModels = async () => {
    setLoading(true);
    const { models: fetchedModels, error } = await billingModelService.getBillingModels();
    
    if (error) {
      toast({
        title: "Error Loading Models",
        description: error,
        variant: "destructive",
      });
    } else if (fetchedModels) {
      setModels(fetchedModels);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadModels();
  }, []);

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this billing model?')) {
      return;
    }

    const { error } = await billingModelService.deleteBillingModel(modelId);
    
    if (error) {
      toast({
        title: "Error Deleting Model",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Model Deleted",
        description: "Billing model has been deleted successfully.",
      });
      loadModels();
    }
  };

  const downloadModel = (model: BillingModel) => {
    const config = billingModelService.generateStripeConfiguration(model);
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.name.toLowerCase().replace(/\s+/g, '_')}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Configuration Downloaded",
      description: `${model.name} configuration has been downloaded.`,
    });
  };

  const getModelTypeColor = (type: string) => {
    switch (type) {
      case 'pay-as-you-go':
        return 'bg-blue-100 text-blue-800';
      case 'flat-recurring':
        return 'bg-green-100 text-green-800';
      case 'fixed-overage':
        return 'bg-purple-100 text-purple-800';
      case 'per-seat':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && models.length === 0) {
    return (
      <DashboardLayout
        title="Saved Billing Models"
        description="Manage your saved billing configurations"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Saved Billing Models"
      description="Manage your saved billing configurations"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={loadModels}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              className="bg-gradient-to-r from-indigo-600 to-purple-600"
              onClick={() => navigate('/billing-models')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Model
            </Button>
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Loading billing models...</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((model) => (
            <Card key={model.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    <CardDescription className="mt-1">{model.description}</CardDescription>
                  </div>
                  <Badge className={getModelTypeColor(model.type)}>
                    {model.type.replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Configuration</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>Items: {model.items.length}</div>
                      <div>Recurring: {model.items.filter(i => i.type === 'recurring').length}</div>
                      <div>Metered: {model.items.filter(i => i.type === 'metered').length}</div>
                      <div>One-time: {model.items.filter(i => i.type === 'one-time').length}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {new Date(model.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="View Details"
                        onClick={() => {
                          // In a real app, you'd navigate to a detail view
                          toast({
                            title: "Model Details",
                            description: `${model.name} - ${model.items.length} items`,
                          });
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="Download Configuration"
                        onClick={() => downloadModel(model)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="Delete Model"
                        onClick={() => deleteModel(model.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredModels.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchTerm ? 'No models found matching your search.' : 'No billing models saved yet.'}
            </div>
            {!searchTerm && (
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600"
                onClick={() => navigate('/billing-models')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Billing Model
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SavedModels;
