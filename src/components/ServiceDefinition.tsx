
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Camera, FileImage, Clipboard, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

interface ServiceDefinitionProps {
  pasteData: string;
  setPasteData: (value: string) => void;
  handlePasteData: () => void;
  handleScanImage: () => void;
  handleFileUpload: (file: File) => void;
  isDragOver: boolean;
  setIsDragOver: (value: boolean) => void;
  onServicesDetected?: (services: any[]) => void;
}

const ServiceDefinition = ({
  pasteData,
  setPasteData,
  handlePasteData,
  handleScanImage,
  handleFileUpload,
  isDragOver,
  setIsDragOver,
  onServicesDetected
}: ServiceDefinitionProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedServices, setDetectedServices] = useState<any[]>([]);
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      let fileContent = '';
      
      // Handle different file types
      if (file.type.startsWith('image/')) {
        toast({
          title: "Image Processing",
          description: "Image uploaded for OCR processing. This feature requires additional setup.",
        });
        setIsProcessing(false);
        return;
      } else if (file.type === 'application/pdf') {
        toast({
          title: "PDF Processing", 
          description: "PDF parsing would require additional libraries. Please convert to CSV or text format.",
        });
        setIsProcessing(false);
        return;
      } else if (file.type === 'application/json') {
        fileContent = await file.text();
        try {
          const jsonData = JSON.parse(fileContent);
          const services = parseServicesFromJSON(jsonData);
          handleServicesDetection(services);
        } catch (error) {
          toast({
            title: "JSON Parse Error",
            description: "Invalid JSON format",
            variant: "destructive",
          });
        }
        setIsProcessing(false);
        return;
      } else if (file.type === 'application/xml' || file.type === 'text/xml') {
        fileContent = await file.text();
        // Basic XML parsing - would need proper XML parser for complex documents
        const services = parseServicesFromText(fileContent);
        handleServicesDetection(services);
        setIsProcessing(false);
        return;
      }

      // Process CSV/text files with Papa Parse
      Papa.parse(file, {
        complete: (result) => {
          if (result.errors.length > 0) {
            toast({
              title: "File Error",
              description: `Error parsing file: ${result.errors[0].message}`,
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          const services = parseServicesFromData(result.data as any[]);
          handleServicesDetection(services);
          setIsProcessing(false);
        },
        header: true,
        skipEmptyLines: true,
        error: (error) => {
          toast({
            title: "Processing Error",
            description: `Error processing file: ${error.message}`,
            variant: "destructive",
          });
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      toast({
        title: "File Processing Error",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleServicesDetection = (services: any[]) => {
    setDetectedServices(services);
    if (services.length > 0) {
      onServicesDetected?.(services);
      toast({
        title: "Services Detected",
        description: `Found ${services.length} metered services and generated billing model.`,
      });
    } else {
      toast({
        title: "No Services Found",
        description: "Could not detect any metered services in the data.",
        variant: "destructive",
      });
    }
  };

  const handlePasteDataInternal = () => {
    if (!pasteData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste some data first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      Papa.parse(pasteData, {
        complete: (result) => {
          if (result.errors.length > 0) {
            toast({
              title: "Parse Error",
              description: `Error parsing data: ${result.errors[0].message}`,
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          const services = parseServicesFromData(result.data as any[]);
          handleServicesDetection(services);
          setPasteData(''); // Clear after successful parse
          setIsProcessing(false);
        },
        header: true,
        skipEmptyLines: true,
        delimiter: '\t', // Support tab-delimited data
        error: (error) => {
          toast({
            title: "Processing Error",
            description: `Error processing data: ${error.message}`,
            variant: "destructive",
          });
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      toast({
        title: "Unexpected Error",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const parseServicesFromJSON = (jsonData: any): any[] => {
    // Handle different JSON structures
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
      }
    }
    
    return parseServicesFromData(dataArray);
  };

  const parseServicesFromText = (textContent: string): any[] => {
    // Basic text parsing - look for patterns
    const lines = textContent.split('\n').filter(line => line.trim());
    const services = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for price patterns like $0.03, pricing keywords
      if (line.includes('$') || line.toLowerCase().includes('price') || 
          line.toLowerCase().includes('rate') || line.toLowerCase().includes('cost')) {
        // Basic service extraction
        const service = {
          id: `service-${i}`,
          display_name: line.substring(0, 50),
          event_name: `service_${i}`,
          unit: 'units',
          rate: 0.01,
          type: 'metered'
        };
        services.push(service);
      }
    }
    
    return services;
  };

  const parseServicesFromData = (data: any[]): any[] => {
    if (!data || data.length === 0) return [];

    return data.map((row, index) => {
      const service: any = {
        id: `service-${index}`,
        display_name: row['Metric Description'] || row.name || row.product || `Service ${index + 1}`,
        event_name: row['Meter Name'] || row.meter_name || row.event_name || 
          (row['Metric Description'] || row.name || row.product || `service_${index}`)
            .toLowerCase().replace(/[^a-z0-9]/g, '_'),
        unit: row.Unit || row.unit || row.unit_label || 'units',
        rate: parseFloat((row['Per Unit Rate (USD)'] || row.rate || row.price || '0').toString().replace(/[$,]/g, '')) || 0,
        flat_fee: parseFloat((row['Flat Fee (USD)'] || row.flat_fee || '0').toString().replace(/[$,]/g, '')) || 0,
        description: row.description || row['Metric Description'] || 'Metered service',
        type: 'metered',
        billing_scheme: 'per_unit',
        usage_type: 'metered',
        aggregate_usage: 'sum',
        currency: 'usd'
      };

      // Convert rate to cents for Stripe
      service.unit_amount = Math.round(service.rate * 100);
      service.price = service.rate; // Keep dollar amount for display

      return service;
    }).filter(service => service.display_name && service.event_name);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="h-4 w-4 text-blue-600" />
        <Label className="font-medium">Define Metered Services</Label>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Upload pricing data, paste from spreadsheets, or scan documents to automatically detect metered services and billing rates.
      </p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => document.getElementById('service-file-upload')?.click()}>
          <Upload className="h-4 w-4 mr-1" />
          Upload File
        </Button>
        <Button variant="outline" size="sm" onClick={handlePasteDataInternal} disabled={!pasteData.trim() || isProcessing}>
          <Clipboard className="h-4 w-4 mr-1" />
          {isProcessing ? "Processing..." : "Parse Pasted Data"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleScanImage}>
          <Camera className="h-4 w-4 mr-1" />
          Scan Document
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
            <p className="text-sm text-blue-600 mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">CSV, Excel, JSON, XML, or image files</p>
            <p className="text-xs text-muted-foreground mt-1">Supports metered pricing tables</p>
            
            <input
              id="service-file-upload"
              type="file"
              accept=".csv,.xlsx,.xls,.json,.xml,.txt,image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Button asChild size="sm" className="mt-2">
              <label htmlFor="service-file-upload">
                Choose File
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <Label>Paste Service Data</Label>
        <Textarea
          value={pasteData}
          onChange={(e) => setPasteData(e.target.value)}
          placeholder="Paste your metered service pricing data here...
Example format:
Metric Description	Meter Name	Unit	Per Unit Rate (USD)	Flat Fee (USD)
API Calls	api_calls	Request	$0.001	$0.00
Storage Usage	storage_usage	GB-Hour	$0.02	$0.00"
          rows={6}
        />
        {pasteData && (
          <Button size="sm" onClick={handlePasteDataInternal} className="mt-2" disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Parse Data"}
          </Button>
        )}
      </div>

      {detectedServices.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-medium text-green-800">Services Detected: {detectedServices.length}</h3>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {detectedServices.slice(0, 5).map((service, index) => (
              <div key={index} className="text-sm bg-white p-2 rounded border">
                <div className="font-medium">{service.display_name}</div>
                <div className="text-gray-600">
                  Meter: {service.event_name} • Rate: ${service.rate} per {service.unit}
                </div>
              </div>
            ))}
            {detectedServices.length > 5 && (
              <div className="text-sm text-gray-600 text-center">
                +{detectedServices.length - 5} more services...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDefinition;
