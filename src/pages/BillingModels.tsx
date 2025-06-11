
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BillingModelTypeTabs from '@/components/BillingModelTypeTabs';
import SpreadsheetUpload from '@/components/SpreadsheetUpload';
import FlatRecurringForm from '@/components/FlatRecurringForm';
import FixedOverageForm from '@/components/FixedOverageForm';
import PerSeatForm from '@/components/PerSeatForm';
import StripeConnectionStatus from '@/components/StripeConnectionStatus';

const BillingModels = () => {
  const [activeTab, setActiveTab] = useState('pay-as-you-go');

  const renderContent = () => {
    switch (activeTab) {
      case 'pay-as-you-go':
        return <SpreadsheetUpload />;
      case 'flat-recurring':
        return <FlatRecurringForm />;
      case 'fixed-overage':
        return <FixedOverageForm />;
      case 'per-seat':
        return <PerSeatForm />;
      default:
        return <SpreadsheetUpload />;
    }
  };

  return (
    <DashboardLayout
      title="Billing Models"
      description="Set up common billing patterns with guided forms"
    >
      <div className="space-y-6">
        <StripeConnectionStatus />
        <BillingModelTypeTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default BillingModels;
