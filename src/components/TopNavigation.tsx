
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
    <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 border-b border-purple-500/30 shadow-xl z-50 relative">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-2 rounded-lg shadow-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Stripe Setup Pilot
              </h1>
              <p className="text-sm text-purple-200">Automate your Stripe configuration</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-purple-600/50 group ${
                  location.pathname === item.href 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' 
                    : 'text-purple-100 hover:text-white'
                }`}>
                  <item.icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                    location.pathname === item.href ? 'text-white' : 'text-purple-200'
                  }`} />
                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavigation;
