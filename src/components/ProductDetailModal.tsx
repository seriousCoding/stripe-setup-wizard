
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, CreditCard, Zap, Users, Calendar } from 'lucide-react';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSelectPlan: (tierId: string) => void;
}

const ProductDetailModal = ({ isOpen, onClose, product, onSelectPlan }: ProductDetailModalProps) => {
  if (!product) return null;

  const getBillingIcon = (billingType: string) => {
    switch (billingType) {
      case 'pay_as_you_go': return <Zap className="h-4 w-4" />;
      case 'credit_burndown': return <CreditCard className="h-4 w-4" />;
      case 'flat_recurring': return <Calendar className="h-4 w-4" />;
      case 'per_seat': return <Users className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const formatPrice = (amount: number) => {
    if (amount === 0) return '$0';
    if (amount < 100) return `$${(amount / 100).toFixed(2)}`;
    return `$${Math.round(amount / 100)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{product.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{product.name}</h2>
                <p className="text-sm text-slate-400">{product.subtitle}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-slate-300">{product.description}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              {getBillingIcon(product.id)}
              <span>Pricing Details</span>
            </h3>
            <div className="bg-slate-700/40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Price</span>
                <span className="text-2xl font-bold text-blue-400">{formatPrice(product.price)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Billing Model</span>
                <Badge className="bg-blue-600">{product.subtitle}</Badge>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Features Included</h3>
            <div className="space-y-2">
              {product.features.map((feature: string, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-slate-200">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {product.usageLimits && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Usage Limits & Rates</h3>
              <div className="bg-slate-700/40 rounded-lg p-4">
                <div className="space-y-3">
                  {product.usageLimits.map((limit: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-slate-400">{limit.name}</span>
                      <span className="font-medium text-white">{limit.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {product.id === 'professional' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Credit Burndown Benefits</h3>
              <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-green-300">Pay Amount</span>
                    <span className="font-bold text-green-200">{formatPrice(product.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-300">Credit Value</span>
                    <span className="font-bold text-green-200">{formatPrice(product.price * 1.2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-300">Bonus</span>
                    <span className="font-bold text-green-200">20% Extra Credits</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700" 
              onClick={() => onSelectPlan(product.id)}
            >
              Select {product.name} Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
