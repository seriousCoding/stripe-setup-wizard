
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BillingModelTypeTabs from '@/components/BillingModelTypeTabs';

const BillingModels = () => {
  return (
    <DashboardLayout
      title="Billing Models"
      description="Set up common billing patterns with guided forms"
    >
      <BillingModelTypeTabs />
    </DashboardLayout>
  );
};

export default BillingModels;
