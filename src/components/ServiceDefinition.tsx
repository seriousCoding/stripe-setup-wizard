
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText } from 'lucide-react';

interface ServiceDefinitionProps {
  pasteData: string;
  setPasteData: (value: string) => void;
  handlePasteData: () => void;
  handleScanImage: () => void;
  handleFileUpload: (file: File) => void;
  isDragOver: boolean;
  setIsDragOver: (value: boolean) => void;
}

const ServiceDefinition = ({
  pasteData,
  setPasteData,
  handlePasteData,
  handleScanImage,
  handleFileUpload,
  isDragOver,
  setIsDragOver
}: ServiceDefinitionProps) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="h-4 w-4 text-blue-600" />
        <Label className="font-medium">Define Services (Optional)</Label>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Define metered services by uploading a file, pasting data, or scanning with your camera. These will populate the service list below for review.
      </p>
      
      <div className="flex space-x-2 mb-4">
        <Button variant="outline" size="sm">
          📁 Upload File
        </Button>
        <Button variant="outline" size="sm" onClick={handlePasteData}>
          📋 Paste Data
        </Button>
        <Button variant="outline" size="sm" onClick={handleScanImage}>
          📷 Scan Image
        </Button>
      </div>

      <Card 
        className={`border-2 border-dashed transition-all duration-200 ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-border'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-blue-600 mb-1">Click to upload</p>
            <p className="text-xs text-muted-foreground">or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">CSV or XLSX files</p>
            
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild size="sm" className="mt-2">
                <span>Choose File</span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <Label>Paste Service Data</Label>
        <Textarea
          value={pasteData}
          onChange={(e) => setPasteData(e.target.value)}
          placeholder="Paste your service pricing data here..."
          rows={3}
        />
        {pasteData && (
          <Button size="sm" onClick={handlePasteData} className="mt-2">
            Parse Data
          </Button>
        )}
      </div>
    </div>
  );
};

export default ServiceDefinition;
