
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit, Check } from 'lucide-react';

interface ModelHeaderProps {
  modelName: string;
  setModelName: (name: string) => void;
  modelDescription: string;
  setModelDescription: (description: string) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
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
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-xl">Billing Model Configuration</CardTitle>
            <Badge variant="outline" className="bg-white">
              {modelType}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center space-x-2"
          >
            {isEditing ? (
              <>
                <Check className="h-4 w-4" />
                <span>Done Editing</span>
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                <span>Edit Details</span>
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Configure your billing model details and review the generated configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Enter a descriptive name for your billing model"
                className="bg-white"
              />
            </div>
            <div>
              <Label htmlFor="model-description">Description</Label>
              <Textarea
                id="model-description"
                value={modelDescription}
                onChange={(e) => setModelDescription(e.target.value)}
                placeholder="Describe how this billing model works"
                className="bg-white"
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <h3 className="font-semibold text-lg">{modelName || 'Untitled Billing Model'}</h3>
              <p className="text-gray-600">{modelDescription || 'No description provided'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelHeader;
