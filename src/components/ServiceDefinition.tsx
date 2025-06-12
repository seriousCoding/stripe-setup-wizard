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
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  const cleanAndNormalizeText = (text: string): string => {
    // Remove non-printable characters and normalize
    return text
      .replace(/[^\x20-\x7E\t\n\r]/g, '') // Remove non-ASCII except tabs, newlines
      .replace(/∞/g, 'unlimited') // Replace infinity symbol
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  };

  const parseRawData = (rawText: string): any[] => {
    try {
      const cleanText = cleanAndNormalizeText(rawText);
      const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length === 0) return [];

      const data: any[] = [];
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Enhanced parsing for various formats
        let parts: string[] = [];
        
        // Try tab-separated first
        if (trimmedLine.includes('\t')) {
          parts = trimmedLine.split('\t');
        }
        // Try multiple spaces
        else if (trimmedLine.match(/\s{2,}/)) {
          parts = trimmedLine.split(/\s{2,}/);
        }
        // Try single spaces as fallback
        else {
          parts = trimmedLine.split(/\s+/);
        }

        // Filter out empty parts
        parts = parts.filter(part => part.trim()).map(part => part.trim());

        if (parts.length >= 3) {
          // Extract pricing information
          const pricePattern = /\$\d+\.?\d*/g;
          const prices = trimmedLine.match(pricePattern) || [];
          
          const item: any = {
            id: `paste-${index}`,
            product: parts[0] || `Service ${index + 1}`,
            description: parts[0] || `Service ${index + 1}`,
            source: 'paste_data',
            lineNumber: index + 1,
            originalLine: trimmedLine
          };

          // Detect meter name (usually second column)
          if (parts.length > 1 && parts[1] !== '0' && !parts[1].match(/^\$/) && parts[1] !== 'unlimited') {
            item.eventName = parts[1];
            item.meter_name = parts[1];
          }

          // Detect unit (usually third column)
          if (parts.length > 2 && parts[2] !== '0' && !parts[2].match(/^\$/)) {
            item.unit = parts[2];
            item.unit_label = parts[2];
          }

          // Extract pricing
          if (prices.length > 0) {
            // Get the main price (usually the last one that's not $0.00)
            const nonZeroPrices = prices.filter(p => !p.match(/\$0\.?0*$/));
            const mainPrice = nonZeroPrices[nonZeroPrices.length - 1] || prices[0];
            item.price = parseFloat(mainPrice.replace('$', '')) || 0;
            item.unit_amount = Math.round(item.price * 100);
          } else {
            item.price = 0;
            item.unit_amount = 0;
          }

          // Set billing type
          if (item.eventName && item.unit) {
            item.type = 'metered';
            item.billing_scheme = 'per_unit';
            item.usage_type = 'metered';
            item.aggregate_usage = 'sum';
          } else {
            item.type = 'one_time';
          }

          item.currency = 'usd';
          item.metadata = {
            auto_detected_type: item.type,
            source: 'paste_parser',
            confidence: 85,
            original_parts: parts
          };

          data.push(item);
        }
      });

      return data;
    } catch (error) {
      console.error('Error parsing raw data:', error);
      return [];
    }
  };

  const handleEnhancedDataProcessed = (data: any[], metadata: any) => {
    console.log('Enhanced processor data received:', data, metadata);
    
    let processedData = data;
    
    // If data doesn't look processed, try our enhanced parser
    if (data.length > 0 && !data[0].type) {
      const rawText = data.map(item => 
        typeof item === 'string' ? item : 
        item.originalLine || 
        Object.values(item).join('\t')
      ).join('\n');
      
      processedData = parseRawData(rawText);
    }
    
    const analysis = aiParsingService.parseData(processedData, 'text');
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
      // First try direct parsing
      const directParsed = parseRawData(internalPasteData);
      
      if (directParsed.length > 0) {
        const analysis = aiParsingService.parseData(directParsed, 'text');
        setAiAnalysis(analysis);
        
        if (analysis.items.length > 0) {
          setDetectedServices(analysis.items);
          onServicesDetected?.(analysis.items);
          
          toast({
            title: "Data Parsed Successfully",
            description: `Detected ${analysis.items.length} services with ${analysis.confidence}% confidence`,
          });
        }
        
        setInternalPasteData('');
        setIsProcessing(false);
        return;
      }

      // Fallback to Papa Parse for CSV-like data
      Papa.parse(internalPasteData, {
        complete: (result) => {
          if (result.errors.length > 0) {
            console.warn('CSV parsing warnings:', result.errors);
          }

          const data = result.data as any[];
          let processedData = data;
          
          // If Papa Parse didn't structure it well, try our parser
          if (data.length > 0 && Array.isArray(data[0])) {
            processedData = parseRawData(internalPasteData);
          }
          
          const analysis = aiParsingService.parseData(processedData, 'csv');
          setAiAnalysis(analysis);
          
          if (analysis.items.length > 0) {
            setDetectedServices(analysis.items);
            onServicesDetected?.(analysis.items);
            
            toast({
              title: "AI Analysis Complete",
              description: `Detected ${analysis.items.length} services with ${analysis.confidence}% confidence`,
            });
          } else {
            toast({
              title: "No Services Detected",
              description: "Could not identify any services in the pasted data.",
              variant: "destructive",
            });
          }
          
          setInternalPasteData('');
          setIsProcessing(false);
        },
        header: true,
        skipEmptyLines: true,
        delimiter: '',
        error: (error) => {
          console.error('Papa Parse error:', error);
          
          // Final fallback - try our direct parser anyway
          const fallbackData = parseRawData(internalPasteData);
          if (fallbackData.length > 0) {
            const analysis = aiParsingService.parseData(fallbackData, 'text');
            setAiAnalysis(analysis);
            setDetectedServices(analysis.items);
            onServicesDetected?.(analysis.items);
            
            toast({
              title: "Fallback Parsing Successful",
              description: `Detected ${analysis.items.length} services using fallback parser`,
            });
          } else {
            toast({
              title: "Processing Error",
              description: `Error processing data: ${error.message}`,
              variant: "destructive",
            });
          }
          
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

      {/* Improved Manual Paste Area */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <Label>Manual Data Entry</Label>
            <Textarea
              value={internalPasteData}
              onChange={(e) => setInternalPasteData(e.target.value)}
              placeholder="Paste your metered service pricing data here...

Examples of supported formats:
• Tab-separated: Storage	container_storage_usage	GB-Hour	$0.01
• Space-separated: VM CPU Usage	vm_cpu_usage	vCPU-Hour	$0.03
• Mixed format: Container Memory Usage	container_memory_usage	GB-Hour	0	∞	$0.015	$0.00

The parser will automatically detect and extract:
- Service names and descriptions
- Meter/event names for billing
- Units of measurement
- Pricing information"
              rows={8}
            />
            {internalPasteData && (
              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={handlePasteDataInternal} disabled={isProcessing}>
                  <Clipboard className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : "Parse Data"}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setInternalPasteData('')}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Only show camera option on mobile */}
      {isMobile && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <Label>Take Photo (Mobile Only)</Label>
              <Button onClick={handleScanImage} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Take Photo of Pricing Document
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            {detectedServices.slice(0, 10).map((service, index) => (
              <div key={index} className="text-sm bg-white p-2 rounded border">
                <div className="font-medium">{service.product}</div>
                <div className="text-gray-600">
                  {service.eventName && `Meter: ${service.eventName} • `}
                  {service.unit && `Unit: ${service.unit} • `}
                  Rate: ${service.price}
                </div>
              </div>
            ))}
            {detectedServices.length > 10 && (
              <div className="text-sm text-gray-600 text-center">
                +{detectedServices.length - 10} more services...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDefinition;
