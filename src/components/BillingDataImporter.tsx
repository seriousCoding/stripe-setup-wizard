
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Image, Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BillingDataImporterProps {
  onDataImported: (data: any[]) => void;
}

interface ProcessedData {
  type: 'text' | 'image' | 'pdf';
  content: string;
  fileName?: string;
  extractedData?: any[];
}

const BillingDataImporter: React.FC<BillingDataImporterProps> = ({ onDataImported }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [processedResults, setProcessedResults] = useState<ProcessedData[]>([]);
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleTextPaste = () => {
    if (!pastedText.trim()) {
      toast({
        title: "No Text",
        description: "Please paste some text to process",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate text processing and extraction
    setTimeout(() => {
      const extractedData = parseTextFormats(pastedText);
      const result: ProcessedData = {
        type: 'text',
        content: pastedText,
        extractedData
      };
      
      setProcessedResults(prev => [...prev, result]);
      onDataImported(extractedData);
      setIsProcessing(false);
      
      toast({
        title: "Text Processed",
        description: `Extracted ${extractedData.length} billing items from pasted text`,
      });
      
      setPastedText('');
    }, 1500);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      } else if (file.type === 'application/pdf') {
        processPdfFile(file);
      } else {
        toast({
          title: "Unsupported File",
          description: `File type ${file.type} is not supported`,
          variant: "destructive",
        });
      }
    });
  };

  const processImageFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Simulate OCR processing
      const reader = new FileReader();
      reader.onload = () => {
        setTimeout(() => {
          const ocrText = simulateOCR(file.name);
          const extractedData = parseTextFormats(ocrText);
          
          const result: ProcessedData = {
            type: 'image',
            content: ocrText,
            fileName: file.name,
            extractedData
          };
          
          setProcessedResults(prev => [...prev, result]);
          onDataImported(extractedData);
          setIsProcessing(false);
          
          toast({
            title: "Image Processed",
            description: `Extracted ${extractedData.length} billing items from ${file.name}`,
          });
        }, 2000);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "Processing Error",
        description: "Failed to process image file",
        variant: "destructive",
      });
    }
  };

  const processPdfFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Simulate PDF parsing
      setTimeout(() => {
        const pdfText = simulatePdfExtraction(file.name);
        const extractedData = parseTextFormats(pdfText);
        
        const result: ProcessedData = {
          type: 'pdf',
          content: pdfText,
          fileName: file.name,
          extractedData
        };
        
        setProcessedResults(prev => [...prev, result]);
        onDataImported(extractedData);
        setIsProcessing(false);
        
        toast({
          title: "PDF Processed",
          description: `Extracted ${extractedData.length} billing items from ${file.name}`,
        });
      }, 3000);
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "Processing Error",
        description: "Failed to process PDF file",
        variant: "destructive",
      });
    }
  };

  const parseTextFormats = (text: string): any[] => {
    const items: any[] = [];
    
    // Parse CSV-like format
    const lines = text.split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      if (index === 0 && line.toLowerCase().includes('service')) return; // Skip header
      
      const parts = line.split(/[,\t|]/);
      if (parts.length >= 2) {
        const serviceName = parts[0]?.trim();
        const priceStr = parts[1]?.trim();
        const price = parseFloat(priceStr.replace(/[$,]/g, ''));
        
        if (serviceName && !isNaN(price)) {
          items.push({
            name: serviceName,
            price: price,
            currency: 'USD',
            type: 'service',
            description: parts[2]?.trim() || `${serviceName} service`,
            billing_type: 'one_time'
          });
        }
      }
    });

    // Parse JSON format
    try {
      const jsonData = JSON.parse(text);
      if (Array.isArray(jsonData)) {
        jsonData.forEach(item => {
          if (item.name && (item.price || item.amount)) {
            items.push({
              name: item.name,
              price: item.price || item.amount,
              currency: item.currency || 'USD',
              type: item.type || 'service',
              description: item.description || `${item.name} service`,
              billing_type: item.billing_type || 'one_time'
            });
          }
        });
      }
    } catch (e) {
      // Not JSON, continue with other formats
    }

    return items;
  };

  const simulateOCR = (fileName: string): string => {
    // Simulate OCR extraction based on common billing document patterns
    return `Service Name, Price, Description
API Calls, $0.02, Per API call billing
Data Processing, $15.00, Monthly data processing fee
Storage, $5.00, Per GB storage monthly
Premium Support, $99.00, 24/7 premium support package`;
  };

  const simulatePdfExtraction = (fileName: string): string => {
    // Simulate PDF text extraction
    return `BILLING SERVICES DOCUMENT

API Gateway Service - $0.05 per request
Database Queries - $0.01 per query  
File Storage - $2.00 per GB/month
Email Notifications - $0.10 per email
SMS Notifications - $0.25 per SMS
Premium Analytics - $25.00 monthly subscription`;
  };

  return (
    <div className="space-y-6">
      {/* Text Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Import from Text</span>
          </CardTitle>
          <CardDescription>
            Paste billing data in CSV, JSON, or structured text format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your billing data here...
Examples:
- CSV: Service Name, Price, Description
- JSON: [{'name': 'API Calls', 'price': 0.02}]
- Text: API Calls - $0.02 per call"
            rows={6}
            className="font-mono text-sm"
          />
          <Button
            onClick={handleTextPaste}
            disabled={isProcessing || !pastedText.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Parse Text Data
          </Button>
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import from Files</span>
          </CardTitle>
          <CardDescription>
            Upload images or PDF files containing billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="h-24 flex-col space-y-2"
            >
              <Image className="h-6 w-6" />
              <span className="text-sm">Upload Images</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing}
              className="h-24 flex-col space-y-2"
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm">Take Photo</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  handleFileUpload(files);
                };
                input.click();
              }}
              disabled={isProcessing}
              className="h-24 flex-col space-y-2"
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">Upload PDF</span>
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-blue-700 font-medium">Processing billing data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {processedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Processed Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {result.type.toUpperCase()}
                      </Badge>
                      {result.fileName && (
                        <span className="text-sm text-gray-600">{result.fileName}</span>
                      )}
                    </div>
                    <span className="text-sm text-green-600">
                      {result.extractedData?.length || 0} items extracted
                    </span>
                  </div>
                  {result.extractedData && result.extractedData.length > 0 && (
                    <div className="text-sm text-gray-700">
                      {result.extractedData.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{item.name}</span>
                          <span>${item.price}</span>
                        </div>
                      ))}
                      {result.extractedData.length > 3 && (
                        <div className="text-gray-500 text-xs mt-1">
                          +{result.extractedData.length - 3} more items...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BillingDataImporter;
