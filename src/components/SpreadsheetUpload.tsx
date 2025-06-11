import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Brain, Loader2, CheckCircle, AlertCircle, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { stripeService } from '@/services/stripeService';
import { billingModelService } from '@/services/billingModelService';
import ProductSetup from './ProductSetup';
import MeteredServices from './MeteredServices';

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

interface BillingItem {
  id: string;
  product: string;
  unit_amount: number; // Amount in cents (Stripe format)
  currency: string;
  type: 'metered' | 'recurring' | 'one_time';
  interval?: string;
  eventName?: string;
  description?: string;
  billing_scheme?: 'per_unit' | 'tiered';
  usage_type?: 'metered' | 'licensed';
  aggregate_usage?: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  metadata?: Record<string, string>;
}

interface AIAnalysisResults {
  recommendedModel: string;
  confidence: number;
  reasoning: string;
  optimizedItems: BillingItem[];
}

const SpreadsheetUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AIAnalysisResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [productSetup, setProductSetup] = useState<'new' | 'existing'>('new');
  const [existingProduct, setExistingProduct] = useState('');
  const [meteredServices, setMeteredServices] = useState<MeteredService[]>([
    {
      id: `ms_${Date.now()}`,
      displayName: 'Example Service',
      eventName: 'example_usage',
      pricePerUnit: 0.01,
      currency: 'USD',
      billingScheme: 'per_unit',
      usageType: 'metered',
      aggregateUsage: 'sum',
      interval: 'month',
      intervalCount: 1,
      trialPeriodDays: 0,
      metadata: {},
      tiers: [],
      description: 'Tracked usage of an example service'
    }
  ]);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const parseCSV = useCallback(async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',');

        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row: { [key: string]: string } = {};
          for (let j = 0; j < headers.length; j++) {
            row[headers[j].trim()] = values[j] ? values[j].trim() : '';
          }
          data.push(row);
        }

        resolve(data);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsText(file);
    });
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const data = await parseCSV(file);
      setParsedData(data);
      toast({
        title: "File Uploaded",
        description: "Spreadsheet successfully parsed.",
      });
    } catch (error: any) {
      console.error('Error parsing CSV:', error);
      setUploadError('Error parsing CSV file. Please ensure it is a valid CSV.');
      toast({
        title: "Upload Error",
        description: "Failed to parse the spreadsheet. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeData = async () => {
    if (!parsedData.length) {
      toast({
        title: "Analysis Error",
        description: "No data to analyze. Please upload a file first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const results = billingModelService.analyzeDataAndRecommend(parsedData);
      setAnalysisResults(results);
      toast({
        title: "Analysis Complete",
        description: "AI analysis complete. Review the recommendations below.",
      });
    } catch (error: any) {
      console.error('Error during AI analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeployModel = async () => {
    if (!analysisResults) {
      toast({
        title: "Deployment Error",
        description: "No analysis results available. Please analyze the data first.",
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);
    setDeployError(null);

    try {
      // Consolidate all billing items from AI analysis and MeteredServices
      const allItems = [...analysisResults.optimizedItems, ...meteredServices.map(ms => ({
        id: ms.id,
        product: ms.displayName,
        unit_amount: Math.round(ms.pricePerUnit * 100), // Convert to cents
        currency: ms.currency.toLowerCase(),
        type: ms.usageType === 'metered' ? 'metered' : 'recurring',
        interval: ms.interval,
        eventName: ms.eventName,
        description: ms.description,
        billing_scheme: ms.billingScheme,
        usage_type: ms.usageType,
        aggregate_usage: ms.aggregateUsage,
        metadata: ms.metadata
      }))];

      const billingModel = {
        name: 'AI-Driven Billing Model',
        description: analysisResults.reasoning,
        type: analysisResults.recommendedModel,
        items: allItems
      };

      const { results, error } = await stripeService.deployBillingModel(billingModel);

      if (error) {
        setDeployError(error);
        toast({
          title: "Deployment Failed",
          description: `Failed to deploy billing model: ${error}`,
          variant: "destructive",
        });
      } else {
        setDeploySuccess(true);
        toast({
          title: "Deployment Successful",
          description: "Billing model deployed successfully!",
        });
      }
    } catch (error: any) {
      console.error('Error deploying billing model:', error);
      setDeployError(error.message);
      toast({
        title: "Deployment Error",
        description: `An unexpected error occurred: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
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
      id: `ms_${Date.now()}`,
      displayName: 'New Service',
      eventName: 'new_service_usage',
      pricePerUnit: 0.01,
      currency: 'USD',
      billingScheme: 'per_unit',
      usageType: 'metered',
      aggregateUsage: 'sum',
      interval: 'month',
      intervalCount: 1,
      trialPeriodDays: 0,
      metadata: {},
      tiers: [],
      description: 'Description for the new service'
    };
    setMeteredServices(services => [...services, newService]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Spreadsheet
          </CardTitle>
          <CardDescription>
            Upload a CSV file containing your billing data to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center space-x-4">
            <Input type="file" id="upload" onChange={handleFileChange} className="hidden" />
            <Label htmlFor="upload" className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded-md">
              <Upload className="h-4 w-4 mr-2 inline-block" />
              {file ? file.name : 'Select File'}
            </Label>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </div>
          {parsedData.length > 0 && (
            <Badge variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              {parsedData.length} rows parsed
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Analysis & Recommendations
            </CardTitle>
            <CardDescription>
              Our AI has analyzed your data and suggests the optimal billing structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Recommended Billing Model</Label>
              <Badge variant="secondary">{analysisResults.recommendedModel}</Badge>
              <p className="text-sm text-gray-500">{analysisResults.reasoning}</p>
              <Label>Confidence</Label>
              <Badge variant="outline">{analysisResults.confidence}%</Badge>
            </div>

            {/* Enhanced MeteredServices component */}
            <MeteredServices
              meteredServices={meteredServices}
              updateMeteredService={updateMeteredService}
              removeMeteredService={removeMeteredService}
              addMeteredService={addMeteredService}
            />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleAnalyzeData} disabled={isAnalyzing}>
                Re-analyze Data
              </Button>
              <Button onClick={handleDeployModel} disabled={isDeploying || deploySuccess}>
                {isDeploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : deploySuccess ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Deployed!
                  </>
                ) : (
                  'Deploy Billing Model'
                )}
              </Button>
            </div>
            {deployError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{deployError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analyze Data Button */}
      {parsedData.length > 0 && !analysisResults && (
        <Button onClick={handleAnalyzeData} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Analyze Data
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default SpreadsheetUpload;
