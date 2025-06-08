
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Camera, FileText, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MeteredService {
  id: string;
  displayName: string;
  apiEventName: string;
  pricePerUnit: number;
  currency: string;
}

const PayAsYouGoForm = () => {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [existingProductId, setExistingProductId] = useState('');
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
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            Set up your product details. You can create a new product or add meters to an existing one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., API Service, Analytics Platform"
              />
            </div>
            <div>
              <Label htmlFor="existingProductId">Or Use Existing Product ID</Label>
              <Input
                id="existingProductId"
                value={existingProductId}
                onChange={(e) => setExistingProductId(e.target.value)}
                placeholder="prod_xxxxxxxxxxxxxx"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="productDescription">Product Description</Label>
            <Textarea
              id="productDescription"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe what your product does..."
              rows={3}
            />
          </div>
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
          {services.map((service) => (
            <div key={service.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Service {services.indexOf(service) + 1}</h4>
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
                  <Label>Display Name</Label>
                  <Input
                    value={service.displayName}
                    onChange={(e) => updateService(service.id, 'displayName', e.target.value)}
                    placeholder="e.g., API Calls"
                  />
                </div>
                <div>
                  <Label>API Event Name</Label>
                  <Input
                    value={service.apiEventName}
                    onChange={(e) => updateService(service.id, 'apiEventName', e.target.value)}
                    placeholder="e.g., api_call"
                  />
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
            Add Another Service
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <span>AI-Powered Service Extraction</span>
          </CardTitle>
          <CardDescription>
            Let AI extract services from text descriptions or images
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="extractionText">Paste Service Description</Label>
            <Textarea
              id="extractionText"
              value={extractionText}
              onChange={(e) => setExtractionText(e.target.value)}
              placeholder="Describe your services... e.g., 'We charge for database queries at $0.0005 each, image processing at $0.02 per image, and email sends at $0.001 per email.'"
              rows={4}
            />
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={extractServicesFromText}
              disabled={!extractionText.trim()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Extract from Text
            </Button>
            <Button variant="outline">
              <Camera className="h-4 w-4 mr-2" />
              Extract from Image
            </Button>
          </div>
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
