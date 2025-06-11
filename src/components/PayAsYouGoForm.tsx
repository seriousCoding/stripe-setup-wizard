
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Camera, FileText, Sparkles, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface MeteredService {
  id: string;
  displayName: string;
  apiEventName: string;
  pricePerUnit: number;
  currency: string;
}

const PayAsYouGoForm = () => {
  const [productSetup, setProductSetup] = useState('create-new');
  const [existingProduct, setExistingProduct] = useState('');
  const [services, setServices] = useState<MeteredService[]>([
    { id: '1', displayName: 'API Calls', apiEventName: 'api_call', pricePerUnit: 0.001, currency: 'USD' }
  ]);
  const [extractionText, setExtractionText] = useState('');

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

  const extractServicesFromText = () => {
    // Simulate AI extraction
    const extractedServices = [
      { displayName: 'Database Queries', apiEventName: 'db_query', pricePerUnit: 0.0005, currency: 'USD' },
      { displayName: 'Image Processing', apiEventName: 'image_process', pricePerUnit: 0.02, currency: 'USD' },
      { displayName: 'Email Sends', apiEventName: 'email_send', pricePerUnit: 0.001, currency: 'USD' }
    ];
    
    const newServices = extractedServices.map(service => ({
      ...service,
      id: Date.now().toString() + Math.random()
    }));
    
    setServices([...services, ...newServices]);
    setExtractionText('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pay As You Go Model</CardTitle>
          <CardDescription>
            Charge customers based on the usage of one or more metered services. You can add these to a new or an existing Stripe product. Optionally, define services via file upload, pasting data (AI parsed), or scanning an image (AI parsed) when using an existing product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium">Product Setup</Label>
            <RadioGroup value={productSetup} onValueChange={setProductSetup} className="mt-3">
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
            <div>
              <Label htmlFor="existing-product">Existing Product</Label>
              <Select value={existingProduct} onValueChange={setExistingProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="None (or enter ID manually below)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (or enter ID manually below)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="mt-2">
                Disconnect Stripe
              </Button>
            </div>
          )}

          {productSetup === 'use-existing' && (
            <Card className="border-2 border-dashed border-muted-foreground/25">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <FileText className="h-5 w-5" />
                  <span>Define Services (Optional)</span>
                </CardTitle>
                <CardDescription>
                  Define metered services by uploading a file, pasting data, or scanning with your camera. These will populate the service list below for review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center space-x-3">
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload File</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Paste Data</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Camera className="h-4 w-4" />
                    <span>Scan Image</span>
                  </Button>
                </div>
                
                <div className="text-center">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Click to upload</p>
                    <p className="text-xs text-muted-foreground">or drag and drop</p>
                    <p className="text-xs text-muted-foreground">CSV or XLSX files</p>
                    <Button className="mt-4" size="sm">
                      Choose File
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="paste-data">Paste Service Data</Label>
                  <Textarea
                    id="paste-data"
                    placeholder="Paste your service pricing data here..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Metered Services</span>
            <Badge variant="secondary">{services.length} services</Badge>
          </CardTitle>
          <CardDescription>
            Define the services you want to charge for based on usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {services.map((service, index) => (
            <div key={service.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                  Service #{index + 1}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeService(service.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Meter Display Name</Label>
                  <Input
                    value={service.displayName}
                    onChange={(e) => updateService(service.id, 'displayName', e.target.value)}
                    placeholder="e.g., API Calls"
                  />
                </div>
                <div>
                  <Label>Meter Event Name (Stripe API)</Label>
                  <Input
                    value={service.apiEventName}
                    onChange={(e) => updateService(service.id, 'apiEventName', e.target.value)}
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
                    onChange={(e) => updateService(service.id, 'pricePerUnit', parseFloat(e.target.value))}
                    placeholder="0.001"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select 
                    value={service.currency} 
                    onValueChange={(value) => updateService(service.id, 'currency', value)}
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
          
          <Button onClick={addService} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Metered Service
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-3">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              Create Stripe Configuration
            </Button>
            <Button variant="outline" size="lg">
              Preview API Calls
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayAsYouGoForm;
