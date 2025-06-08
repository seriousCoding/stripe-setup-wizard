
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data?: any[];
}

const SpreadsheetUpload = () => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    // Simulate file processing
    setTimeout(() => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: [
          { product: 'API Calls', price: 0.001, currency: 'USD', type: 'metered' },
          { product: 'Storage GB', price: 0.05, currency: 'USD', type: 'metered' },
          { product: 'Pro Plan', price: 29.99, currency: 'USD', type: 'recurring', interval: 'month' }
        ]
      });
      setIsProcessing(false);
    }, 1500);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-6">
      <Card 
        className={`border-2 border-dashed transition-all duration-200 ${
          isDragOver 
            ? 'border-indigo-500 bg-indigo-50/50' 
            : 'border-border hover:border-indigo-300'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
      >
        <CardContent className="p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload Product Data</h3>
            <p className="text-muted-foreground mb-6">
              Drop your CSV or Excel file here, or click to browse
            </p>
            
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <span>Choose File</span>
              </Button>
            </label>
            
            <div className="mt-4 text-xs text-muted-foreground">
              Supported formats: CSV, Excel (.xlsx, .xls) • Max size: 10MB
            </div>
          </div>
        </CardContent>
      </Card>

      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span>Processing your file...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {uploadedFile && !isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <span>File Uploaded Successfully</span>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardTitle>
            <CardDescription>
              {uploadedFile.name} • {formatFileSize(uploadedFile.size)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Detected Records:</span>
                <Badge variant="secondary">{uploadedFile.data?.length || 0} items</Badge>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-3 border-b">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium">
                    <span>Product</span>
                    <span>Price</span>
                    <span>Type</span>
                    <span>Currency</span>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {uploadedFile.data?.map((row, index) => (
                    <div key={index} className="p-3 border-b last:border-b-0">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <span className="font-medium">{row.product}</span>
                        <span>${row.price}</span>
                        <Badge variant="outline">{row.type}</Badge>
                        <span>{row.currency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Validate with AI
                </Button>
                <Button variant="outline">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Preview API Calls
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpreadsheetUpload;
