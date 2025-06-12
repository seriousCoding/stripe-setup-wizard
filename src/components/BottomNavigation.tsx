
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Upload, DollarSign, FileSpreadsheet, Settings, CreditCard } from 'lucide-react';

const BottomNavigation = () => {
  const location = useLocation();

  const navItems = [
    { href: '/', icon: Upload, label: 'Upload' },
    { href: '/billing-models', icon: DollarSign, label: 'Billing' },
    { href: '/products', icon: FileSpreadsheet, label: 'Products' },
    { href: '/stripe-pricing', icon: CreditCard, label: 'Stripe' },
    { href: '/pricing', icon: CreditCard, label: 'Plans' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/20 shadow-2xl z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => (
          <Link key={item.href} to={item.href} className="flex-1">
            <div className={`flex flex-col items-center p-2 transition-all duration-200 hover:scale-110 hover:-translate-y-1 ${
              location.pathname === item.href 
                ? 'text-blue-400' 
                : 'text-white/70 hover:text-white'
            }`}>
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
