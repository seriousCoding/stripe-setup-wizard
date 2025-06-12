
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/20 shadow-2xl z-50">
      <div className="flex justify-around items-center py-2 px-1">
        {navItems.map((item) => (
          <Link key={item.href} to={item.href} className="flex-1">
            <div className={`flex flex-col items-center p-2 mx-1 rounded-lg transition-all duration-300 hover:scale-110 hover:-translate-y-2 hover:shadow-xl transform ${
              location.pathname === item.href 
                ? 'text-blue-400 bg-blue-600/20 shadow-lg shadow-blue-500/20 scale-105 -translate-y-1' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}>
              <item.icon className="h-5 w-5 mb-1 transition-transform duration-300 hover:scale-125" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
