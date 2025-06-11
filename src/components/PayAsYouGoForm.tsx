
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProductSetup from '@/components/ProductSetup';
import ServiceDefinition from '@/components/ServiceDefinition';
import MeteredServices from '@/components/MeteredServices';

interface MeteredService {
  id: string;
  displayName: string;
  eventName: string;
  pricePerUnit: number;
  currency: string;
  billingScheme: 'per_unit' | 'tiered';
  usageType: 'metered' | 'licensed';
  aggregateUsage: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  interval: 'month' | 'year' | 'week' | 'day';
  intervalCount: number;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
  tiers?: Array<{
    upTo: number | 'inf';
    unitAmount: number;
    flatAmount?: number;
  }>;
  description?: string;
}

const PayAsYouGoForm = () => {
  const [productSetup, setProductSetup] = useState<'new' | 'existing'>('new');
  const [existingProduct, setExistingProduct] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [pasteData, setPasteData] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [meteredServices, setMeteredServices] = useState<MeteredService[]>([
    { 
      id: '1', 
      displayName: 'API Calls', 
      eventName: 'api_call_usage', 
      pricePerUnit: 0.001, 
      currency: 'USD',
      billingScheme: 'per_unit',
      usageType: 'metered',
      aggregateUsage: 'sum',
      interval: 'month',
      intervalCount: 1
    }
  ]);

  const handlePasteData = () => {
    console.log('Parsing pasted data:', pasteData);
    // Add logic to parse pasted data
  };

  const handleScanImage = () => {
    console.log('Opening camera for image scan');
    // Add camera logic
  };

  const handleFileUpload = (file: File) => {
    console.log('Uploading file:', file.name);
    // Add file upload logic
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

  const addMeteredService = () => {
    const newService: MeteredService = {
      id: Date.now().toString(),
      displayName: '',
      eventName: '',
      pricePerUnit: 0,
      currency: 'USD',
      billingScheme: 'per_unit',
      usageType: 'metered',
      aggregateUsage: 'sum',
      interval: 'month',
      intervalCount: 1
    };
    setMeteredServices(services => [...services, newService]);
  };

  return (
    <div className="space-y-6">
      {/* Product Setup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Product Setup</CardTitle>
          <CardDescription>
            Configure your product for metered billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductSetup
            productSetup={productSetup}
            setProductSetup={setProductSetup}
            existingProduct={existingProduct}
            setExistingProduct={setExistingProduct}
          />
          
          {productSetup === 'new' && (
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label htmlFor="productDescription">Product Description</Label>
                <Textarea
                  id="productDescription"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Definition Section */}
      <Card>
        <CardHeader>
          <CardTitle>Service Definition</CardTitle>
          <CardDescription>
            Define the services you want to meter and charge for
          </CardDescription>
        </CardHeader>
        <CardContent>
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

      {/* Metered Services Section */}
      <MeteredServices
        meteredServices={meteredServices}
        updateMeteredService={updateMeteredService}
        removeMeteredService={removeMeteredService}
        addMeteredService={addMeteredService}
      />

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button className="bg-blue-600 hover:bg-blue-700">
          Create Stripe Configuration
        </Button>
        <Button variant="outline">
          Preview Configuration
        </Button>
      </div>
    </div>
  );
};

export default PayAsYouGoForm;
