
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
    <div className="border-b border-white/20 bg-black/20 backdrop-blur-sm shadow-2xl z-40 relative">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="transform hover:scale-105 transition-all duration-300 hover:shadow-lg">
            <h1 className="text-2xl font-bold text-black shadow-sm">
              Stripe Setup Pilot
            </h1>
            <p className="text-sm text-white/80 shadow-sm">Automate your Stripe product and billing configuration</p>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Card className={`p-3 transition-all duration-300 hover:shadow-2xl hover:scale-110 hover:-translate-y-2 cursor-pointer group shadow-lg z-10 relative transform ${
                  location.pathname === item.href 
                    ? 'bg-blue-600/30 border-blue-400 shadow-2xl shadow-blue-500/30 scale-105 -translate-y-1' 
                    : 'card-on-gradient hover:border-white/40 hover:bg-white/10'
                }`}>
                  <div className="flex items-center space-x-2">
                    <item.icon className={`h-4 w-4 group-hover:scale-125 transition-all duration-300 ${
                      location.pathname === item.href ? 'text-blue-300' : 'text-blue-400'
                    }`} />
                    <span className="text-sm font-medium text-white group-hover:text-blue-100 transition-colors duration-300">
                      {item.label}
                    </span>
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
