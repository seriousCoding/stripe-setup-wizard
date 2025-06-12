
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Image, Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ocrService } from '@/services/ocrService';
import { pdfService } from '@/services/pdfService';
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

  const handleTextPaste = async () => {
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
      console.log('Processing pasted text:', pastedText);
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
      console.error('Text processing error:', error);
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

      console.log('Starting OCR processing for:', file.name);
      const result = await ocrService.processImage(file);
      
      console.log('OCR result:', result);
      
      const extractedData = parseTextFormats(result.text);
      
      const processedResult: ProcessedData = {
        type: 'image',
        content: result.text,
        fileName: file.name,
        extractedData
      };
      
      setProcessedResults(prev => [...prev, processedResult]);
      onDataImported(extractedData);
      setIsProcessing(false);
      
      toast({
        title: "Image Processed",
        description: `OCR extracted ${extractedData.length} billing items from ${file.name} (${Math.round(result.confidence)}% confidence)`,
      });
    } catch (error: any) {
      setIsProcessing(false);
      console.error('OCR Error:', error);
      toast({
        title: "OCR Processing Error",
        description: error.message || "Failed to extract text from image. Please try a clearer image.",
        variant: "destructive",
      });
    }
  };

  const processPdfFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      toast({
        title: "Processing PDF",
        description: "Extracting text from PDF...",
      });

      console.log('Starting PDF processing for:', file.name);
      const result = await pdfService.parsePDF(file);
      
      console.log('PDF result:', result);
      
      const extractedData = parseTextFormats(result.text);
      
      const processedResult: ProcessedData = {
        type: 'pdf',
        content: result.text,
        fileName: file.name,
        extractedData
      };
      
      setProcessedResults(prev => [...prev, processedResult]);
      onDataImported(extractedData);
      setIsProcessing(false);
      
      toast({
        title: "PDF Processed",
        description: `Extracted ${extractedData.length} billing items from ${file.name} (${result.numPages} pages)`,
      });
    } catch (error: any) {
      setIsProcessing(false);
      console.error('PDF processing error:', error);
      toast({
        title: "PDF Processing Error",
        description: error.message || "Failed to process PDF file",
        variant: "destructive",
      });
    }
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      console.log('Processing Excel file:', file.name);
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
      console.log('Processing CSV file:', file.name);
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

    console.log('Parsing lines:', lines);

    // Enhanced parsing for different formats
    lines.forEach((line, index) => {
      if (index === 0 && (line.toLowerCase().includes('service') || line.toLowerCase().includes('product') || line.toLowerCase().includes('item'))) {
        return; // Skip header
      }
      
      // Parse CSV format (comma, tab, or pipe separated)
      const parts = line.split(/[,\t|]/).map(part => part.trim());
      
      if (parts.length >= 2) {
        const serviceName = parts[0];
        const priceStr = parts[1];
        
        // Extract price with various formats ($X.XX, X.XX, $X, etc.)
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
      } else {
        // Try to parse single line with pattern "Name - $Price" or "Name $Price"
        const singleLineMatch = line.match(/^(.+?)[\s\-]+\$?(\d+\.?\d*)$/);
        if (singleLineMatch) {
          const [, serviceName, priceStr] = singleLineMatch;
          const price = parseFloat(priceStr);
          
          if (serviceName.trim() && !isNaN(price)) {
            items.push({
              name: serviceName.trim(),
              price: price,
              currency: 'USD',
              type: 'service',
              description: `${serviceName.trim()} service`,
              billing_type: 'one_time'
            });
          }
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
        console.log('Not JSON format, that\'s okay');
      }
    }

    console.log('Parsed items:', items);
    return items;
  };

  return (
    <div className="space-y-6">
      {/* Text Import Section */}
      <Card className="shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform z-10 relative">
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
            className="font-mono text-sm shadow-inner hover:shadow-lg transition-shadow duration-300"
          />
          <Button
            onClick={handleTextPaste}
            disabled={isProcessing || !pastedText.trim()}
            className="w-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform z-10 relative"
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
      <Card className="shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 transform z-10 relative">
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
              className="h-24 flex-col space-y-2 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:-translate-y-2 transform z-10 relative"
            >
              <Image className="h-6 w-6" />
              <span className="text-sm">Upload Files</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing}
              className="h-24 flex-col space-y-2 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:-translate-y-2 transform z-10 relative"
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm">Take Photo</span>
            </Button>
            
            <div 
              className="h-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg shadow-inner hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
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
        <Card className="border-blue-200 bg-blue-50 shadow-2xl transform scale-105 transition-all duration-300">
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
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Processed Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg bg-gray-50 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 transform">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="shadow-sm">
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
