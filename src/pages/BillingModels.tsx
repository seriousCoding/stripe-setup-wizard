
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BillingModelTypeTabs from '@/components/BillingModelTypeTabs';
import SpreadsheetUpload from '@/components/SpreadsheetUpload';
import PayAsYouGoForm from '@/components/PayAsYouGoForm';
import FlatRecurringForm from '@/components/FlatRecurringForm';
import FixedOverageForm from '@/components/FixedOverageForm';
import PerSeatForm from '@/components/PerSeatForm';
import StripeConnectionStatus from '@/components/StripeConnectionStatus';
import StripeManagement from '@/components/StripeManagement';

const BillingModels = () => {
  const [activeTab, setActiveTab] = useState('pay-as-you-go');

  const handleDataUploaded = (data: any[]) => {
    console.log('Data uploaded in BillingModels:', data);
    // Handle the uploaded data here
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'pay-as-you-go':
        return <SpreadsheetUpload onDataUploaded={handleDataUploaded} />;
      case 'flat-recurring':
        return <FlatRecurringForm />;
      case 'fixed-overage':
        return <FixedOverageForm />;
      case 'per-seat':
        return <PerSeatForm />;
      default:
        return <SpreadsheetUpload onDataUploaded={handleDataUploaded} />;
    }
  };

  return (
    <DashboardLayout
      title="Billing Models"
      description="Set up common billing patterns with guided forms"
    >
      <div className="space-y-6">
        <StripeConnectionStatus />
        <StripeManagement />
        <BillingModelTypeTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default BillingModels;
