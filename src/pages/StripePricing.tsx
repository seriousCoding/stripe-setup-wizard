
import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StripePricingForm from '@/components/StripePricingForm';

const StripePricing = () => {
  const handleSavePrices = (prices: any[]) => {
    console.log('Saved prices:', prices);
    // Here you would typically send the prices to your backend/Stripe
  };

  return (
    <DashboardLayout
      title="Stripe Pricing Configuration"
      description="Create and manage pricing models for your products"
    >
      <StripePricingForm onSave={handleSavePrices} />
    </DashboardLayout>
  );
};

export default StripePricing;
