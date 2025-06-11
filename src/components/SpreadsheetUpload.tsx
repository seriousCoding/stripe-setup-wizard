import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Wand2, Camera, FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import BillingModelGenerator from './BillingModelGenerator';

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
    
    // Simulate file processing
    setTimeout(() => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        data: [
          { product: 'API Calls', price: 0.001, currency: 'USD', type: 'metered', eventName: 'api_call', description: 'REST API requests' },
          { product: 'Storage GB', price: 0.05, currency: 'USD', type: 'metered', eventName: 'storage_gb', description: 'Data storage per GB' },
          { product: 'Pro Plan', price: 29.99, currency: 'USD', type: 'recurring', interval: 'month', description: 'Monthly subscription' },
          { product: 'Enterprise Support', price: 199.99, currency: 'USD', type: 'recurring', interval: 'month', description: 'Premium support tier' },
          { product: 'Data Processing', price: 0.002, currency: 'USD', type: 'metered', eventName: 'data_process', description: 'Per record processed' }
        ]
      });
      setIsProcessing(false);
    }, 1500);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

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
    // In a real implementation, this would open camera or file picker for images
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

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const generateBillingModel = () => {
    setShowBillingGenerator(true);
  };

  const handleModelGenerated = (model: any) => {
    setGeneratedModel(model);
    setShowBillingGenerator(false);
  };

  if (showBillingGenerator && uploadedFile?.data) {
    return (
      <BillingModelGenerator
        uploadedData={uploadedFile.data}
        onModelGenerated={handleModelGenerated}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stripe Connection Status */}
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700 font-medium">Stripe Connected</span>
        </div>
        <Button variant="outline" size="sm">
          Disconnect Stripe
        </Button>
      </div>

      {/* Billing Model Type Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button variant="secondary" size="sm" className="flex-1">
          💰 Pay As You Go
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          🔄 Flat Recurring
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          ⚡ Fixed Fee & Overage
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          💺 Per Seat
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay As You Go Model</CardTitle>
          <CardDescription>
            Charge customers based on their usage of one or more metered services. You can add these to a new or an existing Stripe product. Optionally, define services via file upload, pasting data (AI parsed), or scanning an image (AI parsed) when using an existing product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Setup */}
          <div>
            <Label className="text-base font-medium">Product Setup</Label>
            <div className="flex space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="new-product"
                  name="productSetup"
                  checked={productSetup === 'new'}
                  onChange={() => setProductSetup('new')}
                  className="w-4 h-4"
                />
                <Label htmlFor="new-product">Create New Product</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="existing-product"
                  name="productSetup"
                  checked={productSetup === 'existing'}
                  onChange={() => setProductSetup('existing')}
                  className="w-4 h-4"
                />
                <Label htmlFor="existing-product">Use Existing Product</Label>
              </div>
            </div>
          </div>

          {/* Existing Product Selection */}
          {productSetup === 'existing' && (
            <div>
              <Label>Existing Product</Label>
              <Select value={existingProduct} onValueChange={setExistingProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="None (or enter ID manually below)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (or enter ID manually below)</SelectItem>
                  <SelectItem value="prod_123">API Service Platform</SelectItem>
                  <SelectItem value="prod_456">Analytics Dashboard</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="mt-2">
                Disconnect Stripe
              </Button>
            </div>
          )}

          {/* Define Services Section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-4 w-4 text-blue-600" />
              <Label className="font-medium">Define Services (Optional)</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Define metered services by uploading a file, pasting data, or scanning with your camera. These will populate the service list below for review.
            </p>
            
            {/* Service Definition Buttons */}
            <div className="flex space-x-2 mb-4">
              <Button variant="outline" size="sm">
                📁 Upload File
              </Button>
              <Button variant="outline" size="sm" onClick={handlePasteData}>
                📋 Paste Data
              </Button>
              <Button variant="outline" size="sm" onClick={handleScanImage}>
                📷 Scan Image
              </Button>
            </div>

            {/* File Upload Area */}
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
                  <p className="text-sm text-blue-600 mb-1">Click to upload</p>
                  <p className="text-xs text-muted-foreground">or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV or XLSX files</p>
                  
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button asChild size="sm" className="mt-2">
                      <span>Choose File</span>
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Paste Data Section */}
          <div>
            <Label>Paste Service Data</Label>
            <Textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Paste your service pricing data here..."
              rows={3}
            />
            {pasteData && (
              <Button size="sm" onClick={handlePasteData} className="mt-2">
                Parse Data
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metered Services */}
      <Card>
        <CardHeader>
          <CardTitle>Metered Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meteredServices.map((service, index) => (
            <div key={service.id} className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-blue-600 font-medium">Service #{index + 1}</Label>
                {meteredServices.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMeteredService(service.id)}
                    className="text-red-600"
                  >
                    Remove
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Meter Display Name</Label>
                  <Input
                    value={service.displayName}
                    onChange={(e) => updateMeteredService(service.id, 'displayName', e.target.value)}
                    placeholder="e.g., API Calls"
                  />
                </div>
                <div>
                  <Label>Meter Event Name (Stripe API)</Label>
                  <Input
                    value={service.eventName}
                    onChange={(e) => updateMeteredService(service.id, 'eventName', e.target.value)}
                    placeholder="e.g., api_call_count"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This is the 'event_name' you'll use to report usage to Stripe.
                  </p>
                </div>
                <div>
                  <Label>Price Per Unit</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={service.pricePerUnit}
                    onChange={(e) => updateMeteredService(service.id, 'pricePerUnit', parseFloat(e.target.value))}
                    placeholder="e.g., 0.05"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select 
                    value={service.currency} 
                    onValueChange={(value) => updateMeteredService(service.id, 'currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
          
          <Button onClick={addMeteredService} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Metered Service
          </Button>
        </CardContent>
      </Card>

      {/* Create Model Button */}
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

      {/* Processing State */}
      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Processing your file...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Model Result */}
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
