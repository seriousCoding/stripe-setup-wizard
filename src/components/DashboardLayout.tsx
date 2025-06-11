
import React from 'react';
import { Card } from '@/components/ui/card';
import { Upload, DollarSign, FileSpreadsheet, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserMenu from './UserMenu';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const DashboardLayout = ({ children, title, description }: DashboardLayoutProps) => {
  const navItems = [
    { href: '/', icon: Upload, label: 'Data Upload', description: 'Upload and configure from spreadsheet' },
    { href: '/billing-models', icon: DollarSign, label: 'Billing Models', description: 'Set up common billing patterns' },
    { href: '/products', icon: FileSpreadsheet, label: 'Products', description: 'Manage existing products' },
    { href: '/settings', icon: Settings, label: 'Settings', description: 'API keys and preferences' },
  ];

  return (
    <div className="min-h-screen bg-gradient-blue-purple">
      <div className="border-b border-white/20 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">
                Stripe Setup Pilot
              </h1>
              <p className="text-sm text-white/80">Automate your Stripe product and billing configuration</p>
            </div>
            <div className="flex items-center space-x-4">
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href}>
                  <Card className="card-on-gradient p-4 hover:shadow-md transition-all duration-200 hover:border-white/30 cursor-pointer group">
                    <div className="flex items-start space-x-3">
                      <item.icon className="h-5 w-5 text-purple-400 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <h3 className="font-medium text-sm text-white">{item.label}</h3>
                        <p className="text-xs text-white/70 mt-1">{item.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-black">{title}</h2>
              {description && (
                <p className="text-white/90 mt-2">{description}</p>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
