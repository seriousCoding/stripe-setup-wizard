
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const [generatedModel, setGeneratedModel] = useState<any>(null);
  
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
    
    // Simulate file processing with more realistic data
    setTimeout(() => {
      const mockData = [
        { product: 'API Calls', price: 0.001, currency: 'USD', type: 'metered', eventName: 'api_call', description: 'REST API requests' },
        { product: 'Storage GB', price: 0.05, currency: 'USD', type: 'metered', eventName: 'storage_gb', description: 'Data storage per GB' },
        { product: 'Pro Plan', price: 29.99, currency: 'USD', type: 'recurring', interval: 'month', description: 'Monthly subscription' },
        { product: 'Enterprise Support', price: 199.99, currency: 'USD', type: 'recurring', interval: 'month', description: 'Premium support tier' },
        { product: 'Data Processing', price: 0.002, currency: 'USD', type: 'metered', eventName: 'data_process', description: 'Per record processed' }
      ];
      
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: mockData
      });
      setIsProcessing(false);
      setShowAnalyzer(true);
    }, 1500);
  }, []);

  const handlePasteData = () => {
    // Simulate parsing pasted data
    const mockServices = [
      { displayName: 'Database Queries', eventName: 'db_query', pricePerUnit: 0.0005, currency: 'USD' },
      { displayName: 'Image Processing', eventName: 'image_process', pricePerUnit: 0.02, currency: 'USD' }
    ];
    
    const newServices = mockServices.map(service => ({
      ...service,
      id: Date.now().toString() + Math.random()
    }));
    
    setMeteredServices([...meteredServices, ...newServices]);
    setPasteData('');
  };

  const handleScanImage = () => {
    // Simulate camera scan
    console.log('Opening camera for image scan...');
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
    setShowBillingGenerator(true);
    setShowAnalyzer(false);
  };

  const handleModelGenerated = (model: any) => {
    setGeneratedModel(model);
    setShowBillingGenerator(false);
  };

  const handleModelSelect = (modelType: string) => {
    console.log('Selected model type:', modelType);
    setShowAnalyzer(false);
    // Here you could redirect to the specific form or update the parent component
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
          <Button variant="outline">
            Try Different Model
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

      {generatedModel && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900">✅ Billing Model Generated</CardTitle>
            <CardDescription className="text-green-700">
              {generatedModel.name} is ready for Stripe configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Items:</strong> {generatedModel.items?.length}</p>
              <p><strong>Generated:</strong> {new Date(generatedModel.generatedAt).toLocaleString()}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowBillingGenerator(true)}
              >
                Edit Model
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpreadsheetUpload;
