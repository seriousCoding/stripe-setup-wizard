
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Camera, FileImage, Clipboard, CheckCircle, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { aiParsingService, ParsedData } from '@/services/aiParsingService';

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
  const [aiAnalysis, setAiAnalysis] = useState<ParsedData | null>(null);
  const [internalPasteData, setInternalPasteData] = useState('');
  const [internalIsDragOver, setInternalIsDragOver] = useState(false);
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setInternalIsDragOver(false);
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
      let format: 'csv' | 'json' | 'xml' | 'text' = 'csv';
      
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
        format = 'json';
        try {
          const jsonData = JSON.parse(fileContent);
          const parsedData = parseJSONToArray(jsonData);
          processWithAI(parsedData, format);
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
        format = 'xml';
        const parsedData = parseXMLToArray(fileContent);
        processWithAI(parsedData, format);
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

          const data = result.data as any[];
          processWithAI(data, 'csv');
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

  const processWithAI = (data: any[], format: 'csv' | 'json' | 'xml' | 'text') => {
    console.log('Processing data with AI:', data);
    
    const analysis = aiParsingService.parseData(data, format);
    setAiAnalysis(analysis);
    
    if (analysis.items.length > 0) {
      setDetectedServices(analysis.items);
      onServicesDetected?.(analysis.items);
      
      toast({
        title: "AI Analysis Complete",
        description: `Detected ${analysis.items.length} services with ${analysis.confidence}% confidence. Structure: ${analysis.structure}`,
      });
    } else {
      toast({
        title: "No Services Found",
        description: "Could not detect any services in the data.",
        variant: "destructive",
      });
    }
  };

  const parseJSONToArray = (jsonData: any): any[] => {
    if (Array.isArray(jsonData)) {
      return jsonData;
    } else if (jsonData.data && Array.isArray(jsonData.data)) {
      return jsonData.data;
    } else if (jsonData.services && Array.isArray(jsonData.services)) {
      return jsonData.services;
    } else {
      const values = Object.values(jsonData);
      const arrayValue = values.find(val => Array.isArray(val));
      return arrayValue ? arrayValue as any[] : [jsonData];
    }
  };

  const parseXMLToArray = (xmlText: string): any[] => {
    const services = [];
    const lines = xmlText.split('\n');
    let currentService: any = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('<') && trimmed.includes('>')) {
        const tagMatch = trimmed.match(/<([^>]+)>([^<]*)<\/\1>/);
        if (tagMatch) {
          const [, tagName, content] = tagMatch;
          if (content.trim()) {
            currentService[tagName] = content.trim();
          }
        }
        
        if (Object.keys(currentService).length >= 3) {
          services.push({...currentService});
          currentService = {};
        }
      }
    }
    
    return services;
  };

  const handlePasteDataInternal = () => {
    if (!internalPasteData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste some data first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      Papa.parse(internalPasteData, {
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

          const data = result.data as any[];
          processWithAI(data, 'csv');
          setInternalPasteData('');
          setIsProcessing(false);
        },
        header: true,
        skipEmptyLines: true,
        delimiter: '\t',
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

  const handleScanImageInternal = async () => {
    try {
      console.log('Opening camera for image scan');
      toast({
        title: "Camera Feature",
        description: "Camera functionality would capture and process images with OCR. Feature requires additional setup.",
      });
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="h-4 w-4 text-blue-600" />
        <Label className="font-medium">Define Metered Services</Label>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Upload pricing data, paste from spreadsheets, or scan documents to automatically detect metered services and billing rates using AI-powered parsing.
      </p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => document.getElementById('service-file-upload')?.click()}>
          <Upload className="h-4 w-4 mr-1" />
          Upload File
        </Button>
        <Button variant="outline" size="sm" onClick={handlePasteDataInternal} disabled={!internalPasteData.trim() || isProcessing}>
          <Clipboard className="h-4 w-4 mr-1" />
          {isProcessing ? "Processing..." : "Parse Pasted Data"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleScanImageInternal}>
          <Camera className="h-4 w-4 mr-1" />
          Scan Document
        </Button>
      </div>

      <Card 
        className={`border-2 border-dashed transition-all duration-200 ${
          internalIsDragOver 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-border'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => {setInternalIsDragOver(true); setIsDragOver(true);}}
        onDragLeave={() => {setInternalIsDragOver(false); setIsDragOver(false);}}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-blue-600 mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">CSV, Excel, JSON, XML, PDF, or image files</p>
            <p className="text-xs text-muted-foreground mt-1">AI-powered parsing for all formats</p>
            
            <input
              id="service-file-upload"
              type="file"
              accept=".csv,.xlsx,.xls,.json,.xml,.txt,.pdf,image/*"
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
          value={internalPasteData}
          onChange={(e) => setInternalPasteData(e.target.value)}
          placeholder="Paste your metered service pricing data here...
Example format:
Metric Description	Meter Name	Unit	Per Unit Rate (USD)	Flat Fee (USD)
API Calls	api_calls	Request	$0.001	$0.00
Storage Usage	storage_usage	GB-Hour	$0.02	$0.00"
          rows={6}
        />
        {internalPasteData && (
          <Button size="sm" onClick={handlePasteDataInternal} className="mt-2" disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Parse Data"}
          </Button>
        )}
      </div>

      {aiAnalysis && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-blue-800">AI Analysis Results</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div><strong>Structure:</strong> {aiAnalysis.structure}</div>
            <div><strong>Confidence:</strong> {aiAnalysis.confidence}%</div>
            <div><strong>Suggested Model:</strong> {aiAnalysis.metadata.suggestedBillingModel}</div>
            <div><strong>Patterns:</strong> {aiAnalysis.metadata.patterns.join(', ')}</div>
            <div><strong>Detected Columns:</strong> {aiAnalysis.metadata.detectedColumns.join(', ')}</div>
          </div>
        </div>
      )}

      {detectedServices.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-medium text-green-800">Services Detected: {detectedServices.length}</h3>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {detectedServices.slice(0, 5).map((service, index) => (
              <div key={index} className="text-sm bg-white p-2 rounded border">
                <div className="font-medium">{service.product}</div>
                <div className="text-gray-600">
                  {service.eventName && `Meter: ${service.eventName} • `}
                  Rate: ${service.price} {service.unit && `per ${service.unit}`}
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
