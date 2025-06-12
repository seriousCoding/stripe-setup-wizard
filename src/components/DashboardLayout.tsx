
import React from 'react';
import TopNavigation from './TopNavigation';
import BottomNavigation from './BottomNavigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const DashboardLayout = ({ children, title, description }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-blue-purple">
      <TopNavigation />

      <div className="container mx-auto px-6 py-8 pb-20 md:pb-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-black">{title}</h2>
          {description && (
            <p className="text-white/90 mt-2">{description}</p>
          )}
        </div>
        {children}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default DashboardLayout;
