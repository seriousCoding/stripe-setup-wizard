
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Stripe Setup Pilot
              </h1>
              <p className="text-sm text-muted-foreground">Automate your Stripe product and billing configuration</p>
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
                  <Card className="p-4 hover:shadow-md transition-all duration-200 hover:border-indigo-200 cursor-pointer group">
                    <div className="flex items-start space-x-3">
                      <item.icon className="h-5 w-5 text-indigo-600 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <h3 className="font-medium text-sm">{item.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-foreground">{title}</h2>
              {description && (
                <p className="text-muted-foreground mt-2">{description}</p>
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
