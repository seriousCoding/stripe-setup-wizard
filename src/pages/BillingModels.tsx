
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BillingModelSelector from '@/components/BillingModelSelector';
import PayAsYouGoForm from '@/components/PayAsYouGoForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const BillingModels = () => {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showForm, setShowForm] = useState(false);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
    setSelectedModel('');
  };

  return (
    <DashboardLayout
      title="Billing Models"
      description="Set up common billing patterns with guided forms"
    >
      {!showForm ? (
        <BillingModelSelector 
          onSelect={handleModelSelect}
          selectedModel={selectedModel}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Models
            </Button>
            <div className="h-6 border-l border-border"></div>
            <h3 className="text-lg font-medium">
              {selectedModel === 'pay-as-you-go' && 'Pay As You Go Setup'}
              {selectedModel === 'flat-recurring' && 'Flat Recurring Fee Setup'}
              {selectedModel === 'fixed-overage' && 'Fixed Fee + Overage Setup'}
            </h3>
          </div>
          
          {selectedModel === 'pay-as-you-go' && <PayAsYouGoForm />}
          {selectedModel === 'flat-recurring' && (
            <div className="text-center py-12 text-muted-foreground">
              Flat recurring form coming soon...
            </div>
          )}
          {selectedModel === 'fixed-overage' && (
            <div className="text-center py-12 text-muted-foreground">
              Fixed + overage form coming soon...
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default BillingModels;
