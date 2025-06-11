
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProductSetup from '@/components/ProductSetup';
import ServiceDefinition from '@/components/ServiceDefinition';

interface MeteredService {
  id: string;
  displayName: string;
  apiEventName: string;
  pricePerUnit: number;
  currency: string;
}

const PayAsYouGoForm = () => {
  const [productSetup, setProductSetup] = useState<'new' | 'existing'>('new');
  const [existingProduct, setExistingProduct] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [pasteData, setPasteData] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [services, setServices] = useState<MeteredService[]>([
    { 
      id: '1', 
      displayName: 'API Calls', 
      apiEventName: 'api_call', 
      pricePerUnit: 0.001, 
      currency: 'USD' 
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
      <Card>
        <CardHeader>
          <CardTitle>Metered Services</CardTitle>
          <CardDescription>
            Review and configure your metered services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={service.id} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Display Name</Label>
                    <Input
                      value={service.displayName}
                      onChange={(e) => {
                        const updatedServices = [...services];
                        updatedServices[index].displayName = e.target.value;
                        setServices(updatedServices);
                      }}
                      placeholder="e.g., API Calls"
                    />
                  </div>
                  <div>
                    <Label>API Event Name</Label>
                    <Input
                      value={service.apiEventName}
                      onChange={(e) => {
                        const updatedServices = [...services];
                        updatedServices[index].apiEventName = e.target.value;
                        setServices(updatedServices);
                      }}
                      placeholder="e.g., api_call"
                    />
                  </div>
                  <div>
                    <Label>Price Per Unit</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={service.pricePerUnit}
                      onChange={(e) => {
                        const updatedServices = [...services];
                        updatedServices[index].pricePerUnit = parseFloat(e.target.value);
                        setServices(updatedServices);
                      }}
                      placeholder="0.001"
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input
                      value={service.currency}
                      onChange={(e) => {
                        const updatedServices = [...services];
                        updatedServices[index].currency = e.target.value;
                        setServices(updatedServices);
                      }}
                      placeholder="USD"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              onClick={() => {
                const newService: MeteredService = {
                  id: Date.now().toString(),
                  displayName: '',
                  apiEventName: '',
                  pricePerUnit: 0,
                  currency: 'USD'
                };
                setServices([...services, newService]);
              }}
              className="w-full"
            >
              Add Service
            </Button>
          </div>
        </CardContent>
      </Card>

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
