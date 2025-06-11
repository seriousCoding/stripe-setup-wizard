
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const StripeConnectionStatus = () => {
  const [isConnected] = useState(false); // In a real app, this would check actual Stripe connection

  return (
    <Card className={`border-2 ${isConnected ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-orange-600" />
            )}
            <div>
              <CardTitle className="text-lg">
                Stripe Connection {isConnected ? 'Active' : 'Required'}
              </CardTitle>
              <CardDescription>
                {isConnected 
                  ? 'Your Stripe account is connected and ready to use'
                  : 'Connect your Stripe account to create billing models'
                }
              </CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>
      </CardHeader>
      {!isConnected && (
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-orange-800">
              To create and deploy billing models, you need to connect your Stripe account. 
              This will allow the app to create products, prices, and meters in your Stripe dashboard.
            </p>
            <div className="flex space-x-3">
              <Button className="bg-orange-600 hover:bg-orange-700">
                Connect Stripe Account
              </Button>
              <Button variant="outline" asChild>
                <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Create Stripe Account
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default StripeConnectionStatus;
