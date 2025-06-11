
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload, FileText, Camera } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface MeteredService {
  id: string;
  displayName: string;
  apiEventName: string;
  pricePerUnit: number;
  currency: string;
}

const PayAsYouGoForm = () => {
  const [productSetup, setProductSetup] = useState('use-existing');
  const [existingProduct, setExistingProduct] = useState('');
  const [services, setServices] = useState<MeteredService[]>([
    { id: '1', displayName: 'API Calls', apiEventName: 'api_call_count', pricePerUnit: 0.05, currency: 'USD' }
  ]);
  const [pasteData, setPasteData] = useState('');

  const addService = () => {
    const newService: MeteredService = {
      id: Date.now().toString(),
      displayName: '',
      apiEventName: '',
      pricePerUnit: 0,
      currency: 'USD'
    };
    setServices([...services, newService]);
  };

  const updateService = (id: string, field: keyof MeteredService, value: any) => {
    setServices(services.map(service => 
      service.id === id ? { ...service, [field]: value } : service
    ));
  };

  const removeService = (id: string) => {
    setServices(services.filter(service => service.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pay As You Go Model</CardTitle>
          <CardDescription>
            Charge customers based on their usage of one or more metered services. You can add these to a new or an existing Stripe product. Optionally, define services via file upload, pasting data (AI parsed), or scanning an image (AI parsed) when using an existing product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Product Setup</Label>
            <RadioGroup value={productSetup} onValueChange={setProductSetup} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="create-new" id="create-new" />
                <Label htmlFor="create-new">Create New Product</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="use-existing" id="use-existing" />
                <Label htmlFor="use-existing">Use Existing Product</Label>
              </div>
            </RadioGroup>
          </div>

          {productSetup === 'use-existing' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="existing-product">Existing Product</Label>
                <Select value={existingProduct} onValueChange={setExistingProduct}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="None (or enter ID manually below)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (or enter ID manually below)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm">
                Disconnect Stripe
              </Button>
            </div>
          )}

          {productSetup === 'use-existing' && (
            <div className="border rounded-lg p-4 bg-blue-50/30">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="h-4 w-4 text-blue-600" />
                <Label className="font-medium">Define Services (Optional)</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Define metered services by uploading a file, pasting data, or scanning with your camera. These will populate the service list below for review.
              </p>
              
              <div className="flex space-x-3 mb-4">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Upload File</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Paste Data</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Camera className="h-4 w-4" />
                  <span>Scan Image</span>
                </Button>
              </div>

              <div className="border-2 border-dashed border-blue-200 rounded-lg p-8 text-center bg-white">
                <Upload className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                <p className="text-sm text-blue-600 mb-1">Click to upload</p>
                <p className="text-xs text-muted-foreground">or drag and drop</p>
                <p className="text-xs text-muted-foreground mb-3">CSV or XLSX files</p>
                <Button size="sm" className="bg-gray-800 hover:bg-gray-900">
                  Choose File
                </Button>
              </div>

              <div className="mt-4">
                <Label htmlFor="paste-data">Paste Service Data</Label>
                <Textarea
                  id="paste-data"
                  placeholder="Paste your service pricing data here..."
                  rows={4}
                  className="mt-1"
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metered Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((service, index) => (
            <div key={service.id} className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">
                  Service #{index + 1}
                </div>
                {services.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeService(service.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Meter Display Name</Label>
                  <Input
                    value={service.displayName}
                    onChange={(e) => updateService(service.id, 'displayName', e.target.value)}
                    placeholder="API Calls"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Meter Event Name (Stripe API)</Label>
                  <Input
                    value={service.apiEventName}
                    onChange={(e) => updateService(service.id, 'apiEventName', e.target.value)}
                    placeholder="api_call_count"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This is the 'event_name' you'll use to report usage to Stripe.
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Price Per Unit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={service.pricePerUnit}
                    onChange={(e) => updateService(service.id, 'pricePerUnit', parseFloat(e.target.value))}
                    placeholder="0.05"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Currency</Label>
                  <Select 
                    value={service.currency} 
                    onValueChange={(value) => updateService(service.id, 'currency', value)}
                  >
                    <SelectTrigger className="mt-1">
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
          
          <Button onClick={addService} variant="outline" className="w-full flex items-center justify-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Another Metered Service</span>
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          size="lg" 
          className="w-full max-w-md bg-blue-600 hover:bg-blue-700"
        >
          Create Pay As You Go Model
        </Button>
      </div>
    </div>
  );
};

export default PayAsYouGoForm;
