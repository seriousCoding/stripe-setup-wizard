
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Camera, FileImage, Clipboard, CheckCircle, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { aiParsingService, ParsedData } from '@/services/aiParsingService';
import EnhancedFileProcessor from './EnhancedFileProcessor';

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
  const { toast } = useToast();

  const handleEnhancedDataProcessed = (data: any[], metadata: any) => {
    console.log('Enhanced processor data received:', data, metadata);
    
    const analysis = aiParsingService.parseData(data, 'csv');
    setAiAnalysis(analysis);
    
    if (analysis.items.length > 0) {
      setDetectedServices(analysis.items);
      onServicesDetected?.(analysis.items);
      
      toast({
        title: "Enhanced Processing Complete",
        description: `Detected ${analysis.items.length} services from ${metadata.fileName} with ${metadata.confidence}% confidence using ${metadata.processingMethod}`,
      });
    } else {
      toast({
        title: "No Services Found",
        description: "Could not detect any services in the processed data.",
        variant: "destructive",
      });
    }
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
          const analysis = aiParsingService.parseData(data, 'csv');
          setAiAnalysis(analysis);
          
          if (analysis.items.length > 0) {
            setDetectedServices(analysis.items);
            onServicesDetected?.(analysis.items);
            
            toast({
              title: "AI Analysis Complete",
              description: `Detected ${analysis.items.length} services with ${analysis.confidence}% confidence`,
            });
          }
          
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="h-4 w-4 text-blue-600" />
        <Label className="font-medium">Define Metered Services</Label>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Upload pricing data, paste from spreadsheets, or scan documents to automatically detect metered services and billing rates using AI-powered parsing with OCR and PDF support.
      </p>
      
      {/* Enhanced File Processor */}
      <EnhancedFileProcessor onDataProcessed={handleEnhancedDataProcessed} />

      {/* Legacy Manual Paste Area */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <Label>Manual Data Entry</Label>
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
                <Clipboard className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : "Parse Data"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
