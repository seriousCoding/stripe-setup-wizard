
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BillingModelTypeTabs from '@/components/BillingModelTypeTabs';
import ServiceDefinition from '@/components/ServiceDefinition';
import PayAsYouGoForm from '@/components/PayAsYouGoForm';
import FlatRecurringForm from '@/components/FlatRecurringForm';
import FixedOverageForm from '@/components/FixedOverageForm';
import PerSeatForm from '@/components/PerSeatForm';
import StripeConnectionStatus from '@/components/StripeConnectionStatus';
import StripeManagement from '@/components/StripeManagement';
import BillingModelGenerator from '@/components/BillingModelGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

const BillingModels = () => {
  const [activeTab, setActiveTab] = useState('pay-as-you-go');
  const [detectedServices, setDetectedServices] = useState<any[]>([]);
  const [minimizedCards, setMinimizedCards] = useState<Record<string, boolean>>({});

  const handleServicesDetected = (services: any[]) => {
    console.log('Services detected in BillingModels:', services);
    setDetectedServices(services);
  };

  const toggleCardMinimized = (cardId: string) => {
    setMinimizedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const MinimizableCard = ({ 
    id, 
    title, 
    children, 
    className = "" 
  }: { 
    id: string; 
    title: string; 
    children: React.ReactNode; 
    className?: string; 
  }) => {
    const isMinimized = minimizedCards[id];
    
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleCardMinimized(id)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {!isMinimized && <CardContent>{children}</CardContent>}
      </Card>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'pay-as-you-go':
        return <PayAsYouGoForm />;
      case 'flat-recurring':
        return <FlatRecurringForm />;
      case 'fixed-overage':
        return <FixedOverageForm />;
      case 'per-seat':
        return <PerSeatForm />;
      default:
        return <PayAsYouGoForm />;
    }
  };

  return (
    <DashboardLayout
      title="Billing Models"
      description="Set up common billing patterns with guided forms"
    >
      <div className="space-y-6">
        <MinimizableCard id="stripe-connection" title="Stripe Connection">
          <StripeConnectionStatus />
        </MinimizableCard>

        <MinimizableCard id="stripe-management" title="Stripe Management">
          <StripeManagement />
        </MinimizableCard>

        <MinimizableCard id="service-definition" title="Service Definition">
          <ServiceDefinition
            pasteData=""
            setPasteData={() => {}}
            handlePasteData={() => {}}
            handleScanImage={() => {}}
            handleFileUpload={() => {}}
            isDragOver={false}
            setIsDragOver={() => {}}
            onServicesDetected={handleServicesDetected}
          />
        </MinimizableCard>

        {detectedServices.length > 0 && (
          <MinimizableCard id="billing-generator" title="Generated Billing Model">
            <BillingModelGenerator 
              uploadedData={detectedServices}
              onModelGenerated={(model) => console.log('Model generated:', model)}
            />
          </MinimizableCard>
        )}

        <MinimizableCard id="billing-forms" title="Manual Billing Model Setup">
          <div className="space-y-4">
            <BillingModelTypeTabs activeTab={activeTab} onTabChange={setActiveTab} />
            {renderContent()}
          </div>
        </MinimizableCard>
      </div>
    </DashboardLayout>
  );
};

export default BillingModels;
