
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Image, Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';

interface BillingDataImporterProps {
  onDataImported: (data: any[]) => void;
}

interface ProcessedData {
  type: 'text' | 'image' | 'pdf' | 'excel';
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
    
    try {
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
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "Processing Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const fileName = file.name.toLowerCase();
      
      if (file.type.startsWith('image/')) {
        processImageFileWithOCR(file);
      } else if (file.type === 'application/pdf') {
        processPdfFile(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || file.type.includes('spreadsheet')) {
        processExcelFile(file);
      } else if (file.type === 'text/csv' || fileName.endsWith('.csv')) {
        processCSVFile(file);
      } else {
        toast({
          title: "Unsupported File",
          description: `File type ${file.type} is not supported. Please use images, PDFs, Excel, or CSV files.`,
          variant: "destructive",
        });
      }
    });
  };

  const processImageFileWithOCR = async (file: File) => {
    setIsProcessing(true);
    
    try {
      toast({
        title: "Processing Image",
        description: "Extracting text using OCR...",
      });

      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log('OCR Progress:', m)
      });

      console.log('OCR extracted text:', text);
      
      const extractedData = parseTextFormats(text);
      
      const result: ProcessedData = {
        type: 'image',
        content: text,
        fileName: file.name,
        extractedData
      };
      
      setProcessedResults(prev => [...prev, result]);
      onDataImported(extractedData);
      setIsProcessing(false);
      
      toast({
        title: "Image Processed",
        description: `OCR extracted ${extractedData.length} billing items from ${file.name}`,
      });
    } catch (error: any) {
      setIsProcessing(false);
      console.error('OCR Error:', error);
      toast({
        title: "OCR Processing Error",
        description: "Failed to extract text from image. Please try a clearer image.",
        variant: "destructive",
      });
    }
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Process the JSON data
      const extractedData = processSpreadsheetData(jsonData as any[][]);
      
      const result: ProcessedData = {
        type: 'excel',
        content: JSON.stringify(jsonData),
        fileName: file.name,
        extractedData
      };
      
      setProcessedResults(prev => [...prev, result]);
      onDataImported(extractedData);
      setIsProcessing(false);
      
      toast({
        title: "Excel File Processed",
        description: `Extracted ${extractedData.length} billing items from ${file.name}`,
      });
    } catch (error: any) {
      setIsProcessing(false);
      console.error('Excel processing error:', error);
      toast({
        title: "Excel Processing Error",
        description: "Failed to process Excel file",
        variant: "destructive",
      });
    }
  };

  const processCSVFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const extractedData = parseTextFormats(text);
      
      const result: ProcessedData = {
        type: 'text',
        content: text,
        fileName: file.name,
        extractedData
      };
      
      setProcessedResults(prev => [...prev, result]);
      onDataImported(extractedData);
      setIsProcessing(false);
      
      toast({
        title: "CSV File Processed",
        description: `Extracted ${extractedData.length} billing items from ${file.name}`,
      });
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "CSV Processing Error",
        description: "Failed to process CSV file",
        variant: "destructive",
      });
    }
  };

  const processPdfFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // For now, we'll simulate PDF processing since pdf-parse requires Node.js
      // In a real implementation, you'd use a PDF processing service
      toast({
        title: "PDF Processing",
        description: "PDF processing is currently simulated. In production, this would extract text from PDF.",
      });
      
      const simulatedText = `Service Name, Price, Description
API Gateway, $0.02, Per request billing
Database Storage, $0.15, Per GB monthly
Email Service, $0.10, Per email sent
SMS Service, $0.25, Per SMS sent
File Storage, $0.05, Per GB stored`;
      
      const extractedData = parseTextFormats(simulatedText);
      
      const result: ProcessedData = {
        type: 'pdf',
        content: simulatedText,
        fileName: file.name,
        extractedData
      };
      
      setProcessedResults(prev => [...prev, result]);
      onDataImported(extractedData);
      setIsProcessing(false);
      
      toast({
        title: "PDF Processed",
        description: `Simulated extraction of ${extractedData.length} billing items from ${file.name}`,
      });
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "PDF Processing Error",
        description: "Failed to process PDF file",
        variant: "destructive",
      });
    }
  };

  const processSpreadsheetData = (data: any[][]): any[] => {
    const items: any[] = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row.length >= 2) {
        const serviceName = row[0]?.toString().trim();
        const priceStr = row[1]?.toString().trim();
        
        if (serviceName && priceStr) {
          const price = parseFloat(priceStr.replace(/[$,]/g, ''));
          
          if (!isNaN(price)) {
            items.push({
              name: serviceName,
              price: price,
              currency: 'USD',
              type: 'service',
              description: row[2]?.toString().trim() || `${serviceName} service`,
              billing_type: 'one_time'
            });
          }
        }
      }
    }
    
    return items;
  };

  const parseTextFormats = (text: string): any[] => {
    const items: any[] = [];
    
    // Clean the text
    const cleanText = text.replace(/[^\x20-\x7E\t\n\r]/g, '').trim();
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) return items;

    // Try to parse as CSV first
    lines.forEach((line, index) => {
      if (index === 0 && line.toLowerCase().includes('service')) return; // Skip header
      
      const parts = line.split(/[,\t|]/).map(part => part.trim());
      
      if (parts.length >= 2) {
        const serviceName = parts[0];
        const priceStr = parts[1];
        
        // Extract price
        const priceMatch = priceStr.match(/\$?(\d+\.?\d*)/);
        if (serviceName && priceMatch) {
          const price = parseFloat(priceMatch[1]);
          
          items.push({
            name: serviceName,
            price: price,
            currency: 'USD',
            type: 'service',
            description: parts[2] || `${serviceName} service`,
            billing_type: 'one_time'
          });
        }
      }
    });

    // Try to parse as JSON if CSV parsing didn't work well
    if (items.length === 0) {
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
        // Not JSON, that's okay
      }
    }

    return items;
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
CSV: Service Name, Price, Description
JSON: [{'name': 'API Calls', 'price': 0.02}]
Text: API Calls - $0.02 per call"
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
            Upload images (OCR), PDF files, Excel spreadsheets, or CSV files
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
              <span className="text-sm">Upload Files</span>
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
            
            <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <span className="text-sm text-gray-500">Drag & Drop Files</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.xlsx,.xls,.csv"
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
