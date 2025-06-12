
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 shadow-2xl z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => (
          <Link key={item.href} to={item.href} className="flex-1">
            <div className={`flex flex-col items-center py-3 px-2 transition-all duration-200 ${
              location.pathname === item.href 
                ? 'text-orange-400' 
                : 'text-white/70 hover:text-white'
            }`}>
              <div className={`p-2 rounded-xl transition-all duration-200 ${
                location.pathname === item.href 
                  ? 'bg-orange-400/20 shadow-lg transform scale-110' 
                  : 'hover:bg-white/10'
              }`}>
                <item.icon className={`h-5 w-5 transition-transform duration-200 ${
                  location.pathname === item.href ? 'text-orange-400 scale-110' : ''
                }`} />
              </div>
              <span className={`text-xs font-medium mt-1 transition-colors duration-200 ${
                location.pathname === item.href ? 'text-orange-400' : 'text-white/80'
              }`}>
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
