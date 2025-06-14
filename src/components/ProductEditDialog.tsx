
import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StripeProduct } from "@/services/stripeService";
import { ProductEditForm } from "./ProductEditForm";

interface ProductEditDialogProps {
  product: StripeProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated?: () => void;
}

export const ProductEditDialog: React.FC<ProductEditDialogProps> = ({
  product,
  open,
  onOpenChange,
  onProductUpdated,
}) => {
  if (!product) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Edit Product</DialogTitle>
        <ProductEditForm
          product={product}
          onProductUpdated={() => {
            onOpenChange(false);
            if (onProductUpdated) onProductUpdated();
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditDialog;
