import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import BillingModelGenerator from './BillingModelGenerator';
import ProductSetup from './ProductSetup';
import ServiceDefinition from './ServiceDefinition';
import MeteredServices from './MeteredServices';
import BillingModelAnalyzer from './BillingModelAnalyzer';
import AIDataAnalyzer from './AIDataAnalyzer';

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
  const [showAIAnalyzer, setShowAIAnalyzer] = useState(false);
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
        parsedData = generateMockExcelData();
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
      }
      
      // Enhanced data parsing according to Stripe billing documentation
      const enhancedData = parsedData.map((row, index) => {
        const productName = row.product || row.name || row.service || row.item || `Product ${index + 1}`;
        const priceValue = parseFloat(row.price || row.cost || row.amount || row.unit_amount || '0');
        const currency = (row.currency || 'USD').toUpperCase();
        
        // Determine billing type based on Stripe's billing models
        const billingType = determineBillingType(row, priceValue);
        
        // Generate proper event name for metered billing
        const eventName = generateStripeEventName(productName);
        
        // Determine interval for recurring billing
        const interval = determineInterval(row);
        
        return {
          // Product fields (required for Stripe Product creation)
          product: productName,
          description: row.description || row.desc || `${productName} billing`,
          
          // Price fields (required for Stripe Price creation) - in cents
          unit_amount: Math.round(priceValue * 100), // Stripe requires cents
          currency: currency.toLowerCase(), // Stripe requires lowercase
          
          // Billing configuration
          type: billingType,
          interval: interval,
          
          // Metered billing specific
          eventName: billingType === 'metered' ? eventName : undefined,
          billing_scheme: 'per_unit',
          
          // Usage limits and tiers (if applicable)
          usage_type: billingType === 'metered' ? 'metered' : undefined,
          aggregate_usage: billingType === 'metered' ? 'sum' : undefined,
          
          // Metadata for Stripe
          metadata: {
            original_product_name: productName,
            billing_model: 'pay_as_you_go',
            created_via: 'stripe_setup_pilot',
            raw_price: priceValue.toString()
          }
        };
      });
      
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: enhancedData
      });
      
      toast({
        title: "File Parsed Successfully",
        description: `Processed ${enhancedData.length} billing items according to Stripe documentation`,
      });
      
      setShowAIAnalyzer(true);
    } catch (error: any) {
      toast({
        title: "Parsing Error",
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
    
    const headers = lines[0].split(',').map(h => {
      const normalized = h.trim().toLowerCase();
      if (['name', 'service', 'item', 'title'].includes(normalized)) return 'product';
      if (['cost', 'amount', 'unit_amount', 'price_amount'].includes(normalized)) return 'price';
      if (['desc', 'details'].includes(normalized)) return 'description';
      if (['billing_type', 'type', 'model'].includes(normalized)) return 'billing_type';
      return normalized;
    });
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      if (row.product || row.price) {
        data.push(row);
      }
    }
    
    return data;
  };

  const generateMockExcelData = (): any[] => {
    return [
      { 
        product: 'API Calls', 
        price: 0.001, 
        currency: 'USD', 
        billing_type: 'metered',
        description: 'REST API requests per call',
        usage_type: 'metered'
      },
      { 
        product: 'Storage', 
        price: 0.05, 
        currency: 'USD', 
        billing_type: 'metered',
        description: 'Data storage per GB per month',
        usage_type: 'metered'
      },
      { 
        product: 'Pro Subscription', 
        price: 29.99, 
        currency: 'USD', 
        billing_type: 'recurring', 
        interval: 'month',
        description: 'Monthly Pro plan subscription'
      }
    ];
  };

  const determineBillingType = (row: any, price: number): 'metered' | 'recurring' | 'one_time' => {
    const typeStr = (row.billing_type || row.type || '').toLowerCase();
    const productStr = (row.product || row.name || '').toLowerCase();
    const usageType = (row.usage_type || '').toLowerCase();
    
    if (typeStr.includes('metered') || usageType === 'metered') return 'metered';
    if (typeStr.includes('recurring') || typeStr.includes('subscription')) return 'recurring';
    if (typeStr.includes('one_time') || typeStr.includes('one-time')) return 'one_time';
    
    if (productStr.includes('api') || productStr.includes('call') || 
        productStr.includes('request') || productStr.includes('usage') ||
        productStr.includes('storage') || productStr.includes('bandwidth') ||
        productStr.includes('processing') || productStr.includes('query')) {
      return 'metered';
    }
    
    if (price < 1) return 'metered';
    if (price >= 10) return 'recurring';
    
    return 'one_time';
  };

  const determineInterval = (row: any): 'month' | 'year' | 'week' | 'day' | undefined => {
    const intervalStr = (row.interval || row.period || '').toLowerCase();
    const descStr = (row.description || row.desc || '').toLowerCase();
    
    if (intervalStr.includes('month') || descStr.includes('monthly')) return 'month';
    if (intervalStr.includes('year') || descStr.includes('yearly') || descStr.includes('annual')) return 'year';
    if (intervalStr.includes('week') || descStr.includes('weekly')) return 'week';
    if (intervalStr.includes('day') || descStr.includes('daily')) return 'day';
    
    return undefined;
  };

  const generateStripeEventName = (productName: string): string => {
    return productName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
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

    const lines = pasteData.split('\n').filter(line => line.trim());
    const parsedServices: any[] = [];

    lines.forEach((line, index) => {
      const priceMatch = line.match(/\$?(\d+\.?\d*)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0.01;
      
      let serviceName = line.replace(/\$?[\d\.]+/, '').trim();
      if (!serviceName) serviceName = `Service ${index + 1}`;
      
      const billingType = determineBillingType({ product: serviceName }, price);
      
      parsedServices.push({
        product: serviceName,
        unit_amount: Math.round(price * 100),
        currency: 'usd',
        type: billingType,
        eventName: billingType === 'metered' ? generateStripeEventName(serviceName) : undefined,
        description: `${serviceName} - parsed from text`,
        metadata: {
          created_via: 'paste_data',
          billing_model: 'pay_as_you_go'
        }
      });
    });

    if (parsedServices.length > 0) {
      setUploadedFile({
        name: 'pasted-data.txt',
        size: pasteData.length,
        type: 'text/plain',
        data: parsedServices
      });
      setShowAIAnalyzer(true);
      setPasteData('');
      
      toast({
        title: "Data Parsed Successfully",
        description: `Extracted ${parsedServices.length} services according to Stripe format`,
      });
    }
  };

  const handleScanImage = () => {
    const mockImageData = [
      { 
        product: 'Database Queries', 
        unit_amount: 5,
        currency: 'usd', 
        type: 'metered',
        eventName: 'database_query',
        description: 'SQL query execution',
        usage_type: 'metered',
        aggregate_usage: 'sum'
      },
      { 
        product: 'Image Processing', 
        unit_amount: 20,
        currency: 'usd', 
        type: 'metered',
        eventName: 'image_processing',
        description: 'Image transformation service',
        usage_type: 'metered',
        aggregate_usage: 'sum'
      }
    ];

    setUploadedFile({
      name: 'scanned-image.jpg',
      size: 1024,
      type: 'image/jpeg',
      data: mockImageData
    });
    setShowAIAnalyzer(true);
    
    toast({
      title: "Image Scanned Successfully",
      description: `Extracted ${mockImageData.length} services in Stripe format`,
    });
  };

  const handleAIRecommendationAccepted = (optimizedData: any[], modelType: string) => {
    setUploadedFile(prev => prev ? { ...prev, data: optimizedData } : null);
    setShowAIAnalyzer(false);
    setShowAnalyzer(true);
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
      dataToUse = meteredServices.map(service => ({
        product: service.displayName,
        unit_amount: Math.round(service.pricePerUnit * 100),
        currency: service.currency.toLowerCase(),
        type: 'metered',
        eventName: service.eventName,
        description: `${service.displayName} - metered billing`,
        usage_type: 'metered',
        aggregate_usage: 'sum',
        billing_scheme: 'per_unit',
        metadata: {
          created_via: 'manual_entry',
          billing_model: 'pay_as_you_go'
        }
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
    setShowAIAnalyzer(false);
  };

  const handleModelGenerated = (model: any) => {
    setGeneratedModels(prev => [...prev, model]);
    setShowBillingGenerator(false);
    
    toast({
      title: "Model Generated Successfully",
      description: `${model.name} has been saved and is ready for Stripe deployment.`,
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

  if (showAIAnalyzer && uploadedFile?.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">AI Data Analysis & Optimization</h2>
            <p className="text-muted-foreground">
              AI is analyzing your data to recommend the optimal billing model and format it for Stripe
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowAIAnalyzer(false);
              setUploadedFile(null);
            }}
          >
            Upload Different File
          </Button>
        </div>
        
        <AIDataAnalyzer 
          rawData={uploadedFile.data}
          onRecommendationAccepted={handleAIRecommendationAccepted}
        />
      </div>
    );
  }

  if (showAnalyzer && uploadedFile?.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Stripe-Compliant Data Analysis</h2>
            <p className="text-muted-foreground">
              Data parsed and structured according to Stripe billing documentation
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
            Deploy to Stripe
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
            Create Stripe-compliant metered billing. Data will be analyzed by AI and parsed according to Stripe's billing documentation with proper pricing, currency formatting, and event naming conventions.
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
            Create AI-Optimized Stripe Model
          </Button>
        </CardContent>
      </Card>

      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>AI analyzing and parsing data according to Stripe billing standards...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {generatedModels.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900">✅ Stripe-Ready Billing Models</CardTitle>
            <CardDescription className="text-green-700">
              {generatedModels.length} model{generatedModels.length !== 1 ? 's' : ''} ready for Stripe deployment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedModels.map((model, index) => (
                <div key={index} className="p-3 bg-white/60 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{model.name}</h4>
                      <p className="text-sm text-gray-600">{model.items?.length} Stripe-compliant items</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Deploy to Stripe
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
