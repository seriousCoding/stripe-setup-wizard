
import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PriceEditForm } from '@/components/PriceEditForm';
import { StripePrice } from '@/services/stripeService';

interface PriceEditDialogProps {
  open: boolean;
  priceToEdit: StripePrice | null;
  onOpenChange: (open: boolean) => void;
  onPriceUpdated: () => void;
  onCancel: () => void;
}

export const PriceEditDialog: React.FC<PriceEditDialogProps> = ({
  open, priceToEdit, onOpenChange, onPriceUpdated, onCancel
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogTitle>Edit Price</DialogTitle>
      <DialogDescription>
        Update allowed fields for this Stripe price. Changes are immediate—save to apply, or Cancel to discard.
      </DialogDescription>
      {priceToEdit && (
        <div className="py-2">
          <PriceEditForm
            price={priceToEdit}
            onPriceUpdated={onPriceUpdated}
            onCancel={onCancel}
          />
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default PriceEditDialog;
