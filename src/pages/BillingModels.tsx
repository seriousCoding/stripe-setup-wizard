
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BillingModelSelector from '@/components/BillingModelSelector';
import PayAsYouGoForm from '@/components/PayAsYouGoForm';
import FlatRecurringForm from '@/components/FlatRecurringForm';
import FixedOverageForm from '@/components/FixedOverageForm';
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

  const getFormTitle = () => {
    switch (selectedModel) {
      case 'pay-as-you-go':
        return 'Pay As You Go Setup';
      case 'flat-recurring':
        return 'Flat Recurring Fee Setup';
      case 'fixed-overage':
        return 'Fixed Fee + Overage Setup';
      default:
        return '';
    }
  };

  const renderForm = () => {
    switch (selectedModel) {
      case 'pay-as-you-go':
        return <PayAsYouGoForm />;
      case 'flat-recurring':
        return <FlatRecurringForm />;
      case 'fixed-overage':
        return <FixedOverageForm />;
      default:
        return null;
    }
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
              {getFormTitle()}
            </h3>
          </div>
          
          {renderForm()}
        </div>
      )}
    </DashboardLayout>
  );
};

export default BillingModels;
