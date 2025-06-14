
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { stripeService } from "@/services/stripeService";
import { Plus } from "lucide-react";

interface ProductCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated?: () => void;
}

export const ProductCreateDialog: React.FC<ProductCreateDialogProps> = ({
  open,
  onOpenChange,
  onProductCreated,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "service",
    metadata: {} as Record<string, string>
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newMetadataKey, setNewMetadataKey] = useState("");
  const [newMetadataValue, setNewMetadataValue] = useState("");

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const { product, error } = await stripeService.createProduct({
        name: formData.name,
        description: formData.description,
        type: formData.type as "service" | "good",
        metadata: formData.metadata
      });

      if (error) throw new Error(error);

      toast({ title: "Product Created", description: "A new product was created." });
      setFormData({ name: "", description: "", type: "service", metadata: {} });
      onOpenChange(false);
      if (onProductCreated) onProductCreated();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error creating product",
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          <Plus className="inline mr-2" /> Create Product
        </DialogTitle>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              disabled={isLoading}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Name"
              required
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              disabled={isLoading}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={val => setFormData({ ...formData, type: val as "service" | "good" })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="good">Good</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Metadata Inputs */}
          <div>
            <Label>Metadata</Label>
            <div className="space-y-2">
              {Object.entries(formData.metadata).map(([k, v]) => (
                <div key={k} className="flex items-center border rounded p-2">
                  <span className="text-sm font-medium mr-2">{k}:</span>
                  <span className="text-sm text-gray-600 break-all mr-2">{v}</span>
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveMetadata(k)} type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Key"
                  value={newMetadataKey}
                  onChange={e => setNewMetadataKey(e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Input
                  placeholder="Value"
                  value={newMetadataValue}
                  onChange={e => setNewMetadataValue(e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={handleAddMetadata}
                  disabled={!newMetadataKey || !newMetadataValue || isLoading}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
          <div className="flex space-x-2 pt-2">
            <Button onClick={handleCreate} disabled={isLoading || !formData.name}>
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductCreateDialog;
