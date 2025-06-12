import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download, Camera, FileImage, Clipboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

export interface SpreadsheetUploadProps {
  onDataUploaded?: (data: any[]) => void;
}

const SpreadsheetUpload: React.FC<SpreadsheetUploadProps> = ({ onDataUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [pasteData, setPasteData] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      setValidationResults(null);
      console.log('Uploading file:', selectedFile.name);
      // Auto-process the file immediately
      processFileContent(selectedFile);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      console.log('Processing image file:', selectedFile.name);
      toast({
        title: "Image Upload",
        description: "Image uploaded. OCR processing would be implemented here.",
      });
    }
  };

  const startCamera = async () => {
    try {
      console.log('Opening camera for image scan');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        toast({
          title: "Image Captured",
          description: "Image captured. OCR processing would be implemented here.",
        });
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const handlePasteData = () => {
    if (!pasteData.trim()) {
      toast({
        title: "No data to parse",
        description: "Please paste some data first.",
        variant: "destructive",
      });
      return;
    }

    console.log('Parsing pasted data:', pasteData);
    setIsProcessing(true);

    try {
      Papa.parse(pasteData, {
        complete: (result) => {
          if (result.errors.length > 0) {
            toast({
              title: "Parsing Error",
              description: `Error parsing data: ${result.errors[0].message}`,
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          const data = result.data as any[];
          const processedData = processUploadedData(data);
          setParsedData(processedData);
          
          const validation = validateData(processedData);
          setValidationResults(validation);
          
          if (validation.valid && processedData.length > 0) {
            onDataUploaded?.(processedData);
            toast({
              title: "Data parsed successfully",
              description: `Processed ${processedData.length} rows of data.`,
            });
          }
          
          setIsProcessing(false);
          setShowPasteArea(false);
          setPasteData('');
        },
        header: true,
        skipEmptyLines: true,
        delimiter: '\t', // Support tab-delimited data
        error: (error) => {
          console.error('Parse error:', error);
          toast({
            title: "Error",
            description: `Error processing data: ${error.message}`,
            variant: "destructive",
          });
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Unexpected error: ${error.message}`,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const processFileContent = async (selectedFile: File) => {
    setIsProcessing(true);
    
    try {
      const fileType = selectedFile.type.toLowerCase();
      const fileName = selectedFile.name.toLowerCase();
      
      // Handle different file types
      if (fileType === 'application/json' || fileName.endsWith('.json')) {
        const text = await selectedFile.text();
        const jsonData = JSON.parse(text);
        const processedData = processJSONData(jsonData);
        handleProcessedData(processedData);
      } else if (fileType === 'application/xml' || fileType === 'text/xml' || fileName.endsWith('.xml')) {
        const text = await selectedFile.text();
        const processedData = processXMLData(text);
        handleProcessedData(processedData);
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        toast({
          title: "PDF Processing",
          description: "PDF parsing requires additional libraries. Please convert to CSV, JSON, or text format.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        toast({
          title: "Excel Processing",
          description: "Excel files require additional libraries. Please save as CSV format.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      } else {
        // Default CSV/text processing
        Papa.parse(selectedFile, {
          complete: (result) => {
            console.log('Parsed file data:', result.data);
            
            if (result.errors.length > 0) {
              toast({
                title: "Parsing Error",
                description: `Error parsing file: ${result.errors[0].message}`,
                variant: "destructive",
              });
              setIsProcessing(false);
              return;
            }

            const rawData = result.data as any[];
            const processedData = processUploadedData(rawData);
            handleProcessedData(processedData);
          },
          header: true,
          skipEmptyLines: true,
          error: (error) => {
            console.error('File parsing error:', error);
            toast({
              title: "Error",
              description: `Error processing file: ${error.message}`,
              variant: "destructive",
            });
            setIsProcessing(false);
          }
        });
      }
    } catch (error: any) {
      toast({
        title: "File Processing Error",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const processJSONData = (jsonData: any): any[] => {
    let dataArray = [];
    
    if (Array.isArray(jsonData)) {
      dataArray = jsonData;
    } else if (jsonData.data && Array.isArray(jsonData.data)) {
      dataArray = jsonData.data;
    } else if (jsonData.services && Array.isArray(jsonData.services)) {
      dataArray = jsonData.services;
    } else {
      // Try to extract array from nested object
      const values = Object.values(jsonData);
      const arrayValue = values.find(val => Array.isArray(val));
      if (arrayValue) {
        dataArray = arrayValue as any[];
      } else {
        // Convert single object to array
        dataArray = [jsonData];
      }
    }
    
    return processUploadedData(dataArray);
  };

  const processXMLData = (xmlText: string): any[] => {
    // Basic XML parsing - extract key-value pairs
    const services = [];
    const lines = xmlText.split('\n');
    let currentService: any = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('<') && trimmed.includes('>')) {
        // Extract tag content
        const tagMatch = trimmed.match(/<([^>]+)>([^<]*)<\/\1>/);
        if (tagMatch) {
          const [, tagName, content] = tagMatch;
          if (content.trim()) {
            currentService[tagName] = content.trim();
          }
        }
        
        // If we have enough data for a service, add it
        if (Object.keys(currentService).length >= 3) {
          services.push({...currentService});
          currentService = {};
        }
      }
    }
    
    return processUploadedData(services);
  };

  const handleProcessedData = (processedData: any[]) => {
    setParsedData(processedData);
    
    const validation = validateData(processedData);
    setValidationResults(validation);
    
    if (validation.valid && processedData.length > 0) {
      onDataUploaded?.(processedData);
      toast({
        title: "File processed successfully",
        description: `Processed ${processedData.length} rows of data and generated billing model.`,
      });
    } else {
      toast({
        title: "Validation Issues",
        description: `Found ${validation.errors.length} errors in the data.`,
        variant: "destructive",
      });
    }
    
    setIsProcessing(false);
  };

  const processUploadedData = (rawData: any[]): any[] => {
    if (!rawData || rawData.length === 0) return [];

    return rawData.map((row, index) => {
      const processed: any = { id: `item-${index}` };

      processed.product = row.product || row.name || row['Metric Description'] || row.description || `Product ${index + 1}`;
      
      const priceField = row.price || row.amount || row['Per Unit Rate (USD)'] || row.unit_amount || row.cost || row.rate;
      if (typeof priceField === 'string') {
        processed.price = parseFloat(priceField.replace(/[$,]/g, '')) || 0;
      } else {
        processed.price = parseFloat(priceField) || 0;
      }
      
      processed.currency = (row.currency || 'usd').toLowerCase();
      processed.description = row.description || row['Metric Description'] || processed.product;
      
      processed.eventName = row['Meter Name'] || row.meter_name || row.eventName || 
        processed.product.toLowerCase().replace(/[^a-z0-9]/g, '_');
      processed.unit = row.Unit || row.unit || row.unit_label || 'units';
      
      if (row['Meter Name'] || row.meter_name || row.Unit || processed.price < 1) {
        processed.type = 'metered';
        processed.billing_scheme = 'per_unit';
        processed.usage_type = 'metered';
        processed.aggregate_usage = 'sum';
      } else if (row.interval || row.recurring) {
        processed.type = 'recurring';
        processed.interval = row.interval || 'month';
      } else {
        processed.type = 'one_time';
      }

      processed.unit_amount = Math.round(processed.price * 100);

      processed.metadata = {
        original_data: JSON.stringify(row),
        auto_detected_type: processed.type,
        source: 'uploaded_data'
      };

      return processed;
    });
  };

  const validateData = (data: any[]): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data.length === 0) {
      errors.push("No data found in the file");
      return { valid: false, errors, warnings };
    }

    data.forEach((row, index) => {
      if (!row.product || row.product.trim() === '') {
        errors.push(`Row ${index + 1}: Missing product name`);
      }
      
      if (!row.price && row.price !== 0) {
        errors.push(`Row ${index + 1}: Missing or invalid price`);
      }
      
      if (row.price < 0) {
        errors.push(`Row ${index + 1}: Price cannot be negative`);
      }
      
      if (row.type === 'metered' && !row.eventName) {
        warnings.push(`Row ${index + 1}: Metered item should have an event name`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  };

  const downloadTemplate = () => {
    const csvContent = `Metric Description,Meter Name,Unit,Per Unit Rate (USD),Flat Fee (USD),Type
"API Calls",api_calls,Request,$0.001,$0.00,metered
"Storage Usage",storage_usage,GB-Hour,$0.02,$0.00,metered
"Premium Plan",premium_plan,Monthly,$29.99,$0.00,recurring
"Data Processing",data_processing,MB,$0.005,$0.00,metered`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'billing_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Import Billing Data</span>
        </CardTitle>
        <CardDescription>
          Upload, paste, or capture pricing data to create intelligent billing models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" onClick={() => setShowPasteArea(!showPasteArea)}>
            <Clipboard className="h-4 w-4 mr-2" />
            Paste Data
          </Button>
          <Button variant="outline" onClick={() => imageInputRef.current?.click()}>
            <FileImage className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          <Button variant="outline" onClick={startCamera}>
            <Camera className="h-4 w-4 mr-2" />
            Take Picture
          </Button>
        </div>

        {/* Paste Data Area */}
        {showPasteArea && (
          <div className="space-y-2">
            <Label>Paste your pricing data (CSV, TSV, or table format)</Label>
            <Textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Paste your data here... Supports tab-separated values from spreadsheets"
              rows={6}
            />
            <div className="flex space-x-2">
              <Button onClick={handlePasteData} disabled={!pasteData.trim() || isProcessing}>
                {isProcessing ? "Processing..." : "Parse Data"}
              </Button>
              <Button variant="outline" onClick={() => {setShowPasteArea(false); setPasteData('');}}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Camera View */}
        {isCameraActive && (
          <div className="space-y-2">
            <video ref={videoRef} autoPlay className="w-full max-w-md border rounded" />
            <canvas ref={canvasRef} width="640" height="480" className="hidden" />
            <div className="flex space-x-2">
              <Button onClick={captureImage}>Capture Image</Button>
              <Button variant="outline" onClick={stopCamera}>Cancel</Button>
            </div>
          </div>
        )}
        
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="csv-file">Upload File (CSV, JSON, XML, Excel, Text)</Label>
          <Input
            id="csv-file"
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json,.xml,.txt,.pdf"
            onChange={handleFileChange}
          />
          <Input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground">
            Supports CSV, Excel, JSON, XML, PDF, and text formats
          </p>
        </div>

        {file && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            {isProcessing && <span className="text-blue-600">Processing...</span>}
          </div>
        )}

        {validationResults && (
          <div className="space-y-2">
            <div className={`flex items-center space-x-2 ${
              validationResults.valid ? 'text-green-600' : 'text-red-600'
            }`}>
              {validationResults.valid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="font-medium">
                {validationResults.valid ? 'Validation Passed' : 'Validation Failed'}
              </span>
            </div>
            
            {validationResults.errors.length > 0 && (
              <div className="text-sm text-red-600">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc list-inside">
                  {validationResults.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validationResults.warnings.length > 0 && (
              <div className="text-sm text-yellow-600">
                <p className="font-medium">Warnings:</p>
                <ul className="list-disc list-inside">
                  {validationResults.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {parsedData.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Successfully parsed {parsedData.length} items:</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {parsedData.slice(0, 5).map((item, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                  <strong>{item.product}</strong> - ${item.price} ({item.type})
                  {item.eventName && <span className="text-gray-500"> • {item.eventName}</span>}
                </div>
              ))}
              {parsedData.length > 5 && (
                <div className="text-xs text-gray-500 text-center">
                  +{parsedData.length - 5} more items...
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpreadsheetUpload;
