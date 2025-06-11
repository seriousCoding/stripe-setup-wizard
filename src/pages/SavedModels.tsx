
import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SavedModelsList from '@/components/SavedModelsList';

const SavedModels = () => {
  return (
    <DashboardLayout
      title="Saved Billing Models"
      description="Manage your saved billing model configurations"
    >
      <SavedModelsList />
    </DashboardLayout>
  );
};

export default SavedModels;
