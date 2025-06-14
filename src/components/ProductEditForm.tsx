
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { stripeService, StripeProduct } from "@/services/stripeService";

interface ProductEditFormProps {
  product: StripeProduct;
  onProductUpdated: (product: StripeProduct) => void;
  onCancel: () => void;
}

export const ProductEditForm: React.FC<ProductEditFormProps> = ({
  product,
  onProductUpdated,
  onCancel,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description || "",
    active: product.active,
    metadata: { ...product.metadata }, // removed '|| {}' to fix TS2872
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newMetadataKey, setNewMetadataKey] = useState("");
  const [newMetadataValue, setNewMetadataValue] = useState("");

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates = {
        name: formData.name,
        description: formData.description,
        active: formData.active,
        metadata: formData.metadata,
      };
      const { product: updatedProduct, error } = await stripeService.updateProduct(product.id, updates);
      if (error) throw new Error(error);
      toast({
        title: "Product updated",
        description: "Product details were successfully saved.",
      });
      if (updatedProduct) {
        onProductUpdated(updatedProduct);
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMetadata = () => {
    if (newMetadataKey && newMetadataValue) {
      setFormData({
        ...formData,
        metadata: {
          ...formData.metadata,
          [newMetadataKey]: newMetadataValue
        }
      });
      setNewMetadataKey('');
      setNewMetadataValue('');
    }
  };

  const handleRemoveMetadata = (key: string) => {
    const updatedMetadata = { ...formData.metadata };
    delete updatedMetadata[key];
    setFormData({
      ...formData,
      metadata: updatedMetadata
    });
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Edit Product: 
          <span className="font-semibold">{product.name}</span>
          {!product.active && <Badge variant="destructive" className="ml-2">Inactive</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form 
          onSubmit={e => { e.preventDefault(); handleSave(); }}
          className="space-y-6"
        >
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description (optional)"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={checked => setFormData({ ...formData, active: checked })}
                disabled={isLoading}
              />
              <Label htmlFor="active">Active (Sellable)</Label>
            </div>
            <Separator />
            <div>
              <Label>Metadata</Label>
              <div className="space-y-2">
                {Object.entries(formData.metadata).map(([k, v]) => (
                  <div key={k} className="flex items-center border rounded p-2">
                    <span className="text-sm font-medium mr-2">{k}:</span>
                    <span className="text-sm text-gray-600 break-all mr-2">{v}</span>
                    <Button size="icon" variant="ghost" onClick={() => handleRemoveMetadata(k)} type="button">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Key"
                    value={newMetadataKey}
                    onChange={e => setNewMetadataKey(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={newMetadataValue}
                    onChange={e => setNewMetadataValue(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={handleAddMetadata}
                    disabled={!newMetadataKey || !newMetadataValue}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

