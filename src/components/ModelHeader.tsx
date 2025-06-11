
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Wand2 } from 'lucide-react';

interface ModelHeaderProps {
  modelName: string;
  setModelName: (value: string) => void;
  modelDescription: string;
  setModelDescription: (value: string) => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  modelType: string;
}

const ModelHeader = ({
  modelName,
  setModelName,
  modelDescription,
  setModelDescription,
  isEditing,
  setIsEditing,
  modelType
}: ModelHeaderProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wand2 className="h-5 w-5 text-indigo-600" />
          <span>Generated Billing Model</span>
          <Badge variant="secondary">{modelType}</Badge>
        </CardTitle>
        <CardDescription>
          Edit and customize your billing model based on the uploaded data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model-name">Model Name</Label>
            <Input
              id="model-name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., API Service Pricing Model"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-description">Model Description</Label>
            <Input
              id="model-description"
              value={modelDescription}
              onChange={(e) => setModelDescription(e.target.value)}
              placeholder="Brief description of this billing model"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            checked={isEditing}
            onCheckedChange={setIsEditing}
          />
          <Label>Enable editing mode</Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelHeader;
