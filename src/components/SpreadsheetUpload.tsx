
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import BillingModelGenerator from './BillingModelGenerator';
import ProductSetup from './ProductSetup';
import ServiceDefinition from './ServiceDefinition';
import MeteredServices from './MeteredServices';
import BillingModelAnalyzer from './BillingModelAnalyzer';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data?: any[];
}

interface MeteredService {
  id: string;
  displayName: string;
  eventName: string;
  pricePerUnit: number;
  currency: string;
}

const SpreadsheetUpload = () => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBillingGenerator, setShowBillingGenerator] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [generatedModels, setGeneratedModels] = useState<any[]>([]);
  const { toast } = useToast();
  
  // Product setup state
  const [productSetup, setProductSetup] = useState<'new' | 'existing'>('existing');
  const [existingProduct, setExistingProduct] = useState('');
  const [pasteData, setPasteData] = useState('');
  
  // Metered services state
  const [meteredServices, setMeteredServices] = useState<MeteredService[]>([
    { id: '1', displayName: 'API Calls', eventName: 'api_call_count', pricePerUnit: 0.05, currency: 'USD' }
  ]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      let parsedData: any[] = [];
      
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const text = await file.text();
        parsedData = parseCSV(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // For demo purposes, we'll simulate Excel parsing
        parsedData = generateMockExcelData();
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
      }
      
      // Enhance the data with intelligent defaults
      const enhancedData = parsedData.map((row, index) => ({
        product: row.product || row.name || row.service || `Service ${index + 1}`,
        price: parseFloat(row.price || row.cost || row.amount || '0'),
        currency: (row.currency || 'USD').toUpperCase(),
        type: determineServiceType(row),
        interval: row.interval || (row.type === 'recurring' ? 'month' : undefined),
        eventName: generateEventName(row.product || row.name || row.service || `service_${index + 1}`),
        description: row.description || row.desc || `${row.product || 'Service'} billing`
      }));
      
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: enhancedData
      });
      
      toast({
        title: "File Uploaded Successfully",
        description: `Parsed ${enhancedData.length} billing items from ${file.name}`,
      });
      
      setShowAnalyzer(true);
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      data.push(row);
    }
    
    return data;
  };

  const generateMockExcelData = (): any[] => {
    return [
      { product: 'API Calls', price: 0.001, currency: 'USD', type: 'metered', description: 'REST API requests' },
      { product: 'Storage GB', price: 0.05, currency: 'USD', type: 'metered', description: 'Data storage per GB' },
      { product: 'Pro Plan', price: 29.99, currency: 'USD', type: 'recurring', interval: 'month', description: 'Monthly subscription' },
      { product: 'Enterprise Support', price: 199.99, currency: 'USD', type: 'recurring', interval: 'month', description: 'Premium support tier' },
      { product: 'Data Processing', price: 0.002, currency: 'USD', type: 'metered', description: 'Per record processed' },
      { product: 'Bandwidth GB', price: 0.08, currency: 'USD', type: 'metered', description: 'Data transfer per GB' }
    ];
  };

  const determineServiceType = (row: any): 'metered' | 'recurring' | 'one-time' => {
    const typeStr = (row.type || '').toLowerCase();
    const productStr = (row.product || row.name || '').toLowerCase();
    
    if (typeStr.includes('recurring') || typeStr.includes('subscription') || typeStr.includes('monthly') || typeStr.includes('yearly')) {
      return 'recurring';
    }
    
    if (typeStr.includes('metered') || typeStr.includes('usage') || productStr.includes('api') || productStr.includes('call') || productStr.includes('gb') || productStr.includes('mb')) {
      return 'metered';
    }
    
    if (typeStr.includes('one-time') || typeStr.includes('setup')) {
      return 'one-time';
    }
    
    // Default to metered for small amounts, recurring for larger amounts
    const price = parseFloat(row.price || '0');
    return price < 1 ? 'metered' : 'recurring';
  };

  const generateEventName = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handlePasteData = () => {
    if (!pasteData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste some data first.",
        variant: "destructive",
      });
      return;
    }

    // AI-powered parsing simulation
    const lines = pasteData.split('\n').filter(line => line.trim());
    const parsedServices: any[] = [];

    lines.forEach((line, index) => {
      // Simple pattern matching for common formats
      const priceMatch = line.match(/\$?(\d+\.?\d*)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0.01;
      
      let serviceName = line.replace(/\$?[\d\.]+/, '').trim();
      if (!serviceName) serviceName = `Service ${index + 1}`;
      
      parsedServices.push({
        product: serviceName,
        price,
        currency: 'USD',
        type: price < 1 ? 'metered' : 'recurring',
        eventName: generateEventName(serviceName),
        description: `${serviceName} - parsed from text`
      });
    });

    if (parsedServices.length > 0) {
      setUploadedFile({
        name: 'pasted-data.txt',
        size: pasteData.length,
        type: 'text/plain',
        data: parsedServices
      });
      setShowAnalyzer(true);
      setPasteData('');
      
      toast({
        title: "Data Parsed Successfully",
        description: `Extracted ${parsedServices.length} services from pasted data`,
      });
    }
  };

  const handleScanImage = () => {
    // Simulate camera scan with mock data
    const mockImageData = [
      { product: 'Database Queries', price: 0.0005, currency: 'USD', type: 'metered', description: 'SQL query execution' },
      { product: 'Image Processing', price: 0.02, currency: 'USD', type: 'metered', description: 'Image transformation' },
      { product: 'Email Sends', price: 0.001, currency: 'USD', type: 'metered', description: 'Transactional emails' }
    ];

    setUploadedFile({
      name: 'scanned-image.jpg',
      size: 1024,
      type: 'image/jpeg',
      data: mockImageData
    });
    setShowAnalyzer(true);
    
    toast({
      title: "Image Scanned Successfully",
      description: `Extracted ${mockImageData.length} services from image`,
    });
  };

  const addMeteredService = () => {
    const newService: MeteredService = {
      id: Date.now().toString(),
      displayName: '',
      eventName: '',
      pricePerUnit: 0,
      currency: 'USD'
    };
    setMeteredServices([...meteredServices, newService]);
  };

  const updateMeteredService = (id: string, field: keyof MeteredService, value: any) => {
    setMeteredServices(services =>
      services.map(service => 
        service.id === id ? { ...service, [field]: value } : service
      )
    );
  };

  const removeMeteredService = (id: string) => {
    setMeteredServices(services => services.filter(service => service.id !== id));
  };

  const generateBillingModel = () => {
    let dataToUse = uploadedFile?.data;
    
    if (!dataToUse && meteredServices.length > 0) {
      // Convert metered services to billing items
      dataToUse = meteredServices.map(service => ({
        product: service.displayName,
        price: service.pricePerUnit,
        currency: service.currency,
        type: 'metered',
        eventName: service.eventName,
        description: `${service.displayName} - metered billing`
      }));
    }
    
    if (!dataToUse || dataToUse.length === 0) {
      toast({
        title: "No Data Available",
        description: "Please upload a file or define services manually.",
        variant: "destructive",
      });
      return;
    }

    setShowBillingGenerator(true);
    setShowAnalyzer(false);
  };

  const handleModelGenerated = (model: any) => {
    setGeneratedModels(prev => [...prev, model]);
    setShowBillingGenerator(false);
    
    toast({
      title: "Model Generated Successfully",
      description: `${model.name} has been saved and is ready for use.`,
    });
  };

  const handleModelSelect = (modelType: string) => {
    console.log('Selected model type:', modelType);
    generateBillingModel();
  };

  if (showBillingGenerator && uploadedFile?.data) {
    return (
      <BillingModelGenerator
        uploadedData={uploadedFile.data}
        onModelGenerated={handleModelGenerated}
      />
    );
  }

  if (showAnalyzer && uploadedFile?.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Data Analysis Complete</h2>
            <p className="text-muted-foreground">
              We've analyzed your uploaded data and found the best billing model for your business
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowAnalyzer(false);
              setUploadedFile(null);
            }}
          >
            Upload Different File
          </Button>
        </div>
        
        <BillingModelAnalyzer 
          analyzedData={uploadedFile.data}
          onModelSelect={handleModelSelect}
        />
        
        <div className="flex space-x-3">
          <Button 
            onClick={generateBillingModel}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Configure This Model
          </Button>
          <Button variant="outline" onClick={() => {
            setShowAnalyzer(false);
            setUploadedFile(null);
          }}>
            Try Different Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pay As You Go Model</CardTitle>
          <CardDescription>
            Charge customers based on their usage of one or more metered services. You can add these to a new or an existing Stripe product. Optionally, define services via file upload, pasting data (AI parsed), or scanning an image (AI parsed) when using an existing product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProductSetup
            productSetup={productSetup}
            setProductSetup={setProductSetup}
            existingProduct={existingProduct}
            setExistingProduct={setExistingProduct}
          />

          <ServiceDefinition
            pasteData={pasteData}
            setPasteData={setPasteData}
            handlePasteData={handlePasteData}
            handleScanImage={handleScanImage}
            handleFileUpload={handleFileUpload}
            isDragOver={isDragOver}
            setIsDragOver={setIsDragOver}
          />
        </CardContent>
      </Card>

      <MeteredServices
        meteredServices={meteredServices}
        updateMeteredService={updateMeteredService}
        removeMeteredService={removeMeteredService}
        addMeteredService={addMeteredService}
      />

      <Card>
        <CardContent className="p-6">
          <Button 
            size="lg" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={generateBillingModel}
          >
            Create Pay As You Go Model
          </Button>
        </CardContent>
      </Card>

      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Analyzing your data and suggesting the best billing model...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {generatedModels.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900">✅ Billing Models Generated</CardTitle>
            <CardDescription className="text-green-700">
              {generatedModels.length} model{generatedModels.length !== 1 ? 's' : ''} ready for Stripe configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedModels.map((model, index) => (
                <div key={index} className="p-3 bg-white/60 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{model.name}</h4>
                      <p className="text-sm text-gray-600">{model.items?.length} items</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpreadsheetUpload;
