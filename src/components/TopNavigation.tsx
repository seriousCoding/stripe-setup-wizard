
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Upload, DollarSign, FileSpreadsheet, Settings, CreditCard } from 'lucide-react';
import UserMenu from './UserMenu';

const TopNavigation = () => {
  const location = useLocation();

  const navItems = [
    { href: '/', icon: Upload, label: 'Upload', description: 'Upload and configure data' },
    { href: '/billing-models', icon: DollarSign, label: 'Billing', description: 'Set up billing patterns' },
    { href: '/products', icon: FileSpreadsheet, label: 'Products', description: 'Manage products' },
    { href: '/stripe-pricing', icon: CreditCard, label: 'Stripe', description: 'Create pricing models' },
    { href: '/pricing', icon: CreditCard, label: 'Plans', description: 'View pricing plans' },
    { href: '/settings', icon: Settings, label: 'Settings', description: 'API keys and preferences' },
  ];

  return (
    <div className="border-b border-white/20 bg-black/20 backdrop-blur-sm shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Stripe Setup Pilot
            </h1>
            <p className="text-sm text-white/80">Automate your Stripe product and billing configuration</p>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Card className={`p-3 transition-all duration-200 hover:shadow-lg hover:scale-105 hover:-translate-y-1 cursor-pointer group ${
                  location.pathname === item.href 
                    ? 'bg-blue-600/20 border-blue-400 shadow-md shadow-blue-500/20' 
                    : 'card-on-gradient hover:border-white/30'
                }`}>
                  <div className="flex items-center space-x-2">
                    <item.icon className={`h-4 w-4 group-hover:scale-110 transition-transform ${
                      location.pathname === item.href ? 'text-blue-400' : 'text-blue-400'
                    }`} />
                    <span className="text-sm font-medium text-white">{item.label}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavigation;
