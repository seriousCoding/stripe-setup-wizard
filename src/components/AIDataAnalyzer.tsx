
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, DollarSign, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { billingModelService } from '@/services/billingModelService';

interface AIDataAnalyzerProps {
  rawData: any[];
  onRecommendationAccepted: (optimizedData: any[], modelType: string) => void;
}

const AIDataAnalyzer = ({ rawData, onRecommendationAccepted }: AIDataAnalyzerProps) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    analyzeData();
  }, [rawData]);

  const analyzeData = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const result = billingModelService.analyzeDataAndRecommend(rawData);
      setAnalysis(result);
      
      toast({
        title: "AI Analysis Complete",
        description: `Analyzed ${rawData.length} items with ${result.confidence}% confidence`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const acceptRecommendation = () => {
    if (analysis) {
      onRecommendationAccepted(analysis.optimizedItems, analysis.recommendedModel);
      toast({
        title: "Recommendation Applied",
        description: `Data optimized for ${analysis.recommendedModel} billing model`,
      });
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
            <div>
              <h3 className="font-semibold text-blue-900">AI Analyzing Your Data...</h3>
              <p className="text-blue-700">Determining optimal billing structure and formatting data for Stripe</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <span>Analyzing pricing patterns</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <span>Detecting billing types</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              <span>Optimizing for Stripe format</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  const getModelIcon = (modelType: string) => {
    switch (modelType) {
      case 'pay-as-you-go':
        return Zap;
      case 'flat-recurring':
        return TrendingUp;
      case 'fixed-overage':
        return DollarSign;
      default:
        return Brain;
    }
  };

  const ModelIcon = getModelIcon(analysis.recommendedModel);
  const confidenceColor = analysis.confidence >= 85 ? 'text-green-600' : analysis.confidence >= 70 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle className="text-green-900">AI Analysis Complete</CardTitle>
              <CardDescription className="text-green-700">
                Smart recommendations based on your data patterns
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{rawData.length}</div>
              <div className="text-sm text-gray-600">Items Analyzed</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${confidenceColor}`}>{analysis.confidence}%</div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analysis.optimizedItems.length}</div>
              <div className="text-sm text-gray-600">Optimized Items</div>
            </div>
          </div>
          
          <div className="bg-white/60 p-4 rounded-lg">
            <p className="text-sm text-gray-700">{analysis.reasoning}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-indigo-200 bg-indigo-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ModelIcon className="h-6 w-6 text-indigo-600" />
              <div>
                <CardTitle className="text-indigo-900">Recommended: {analysis.recommendedModel.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Model</CardTitle>
                <CardDescription>AI-optimized billing structure for your data</CardDescription>
              </div>
            </div>
            <Badge className={`${confidenceColor} bg-white`}>
              {analysis.confidence}% Match
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  Optimizations Applied
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• Prices converted to cents (Stripe format)</li>
                  <li>• Currency standardized to lowercase</li>
                  <li>• Event names generated for metered items</li>
                  <li>• Billing types intelligently detected</li>
                  <li>• Metadata added for tracking</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
                  Key Insights
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• {analysis.optimizedItems.filter((item: any) => item.type === 'metered').length} metered items detected</li>
                  <li>• {analysis.optimizedItems.filter((item: any) => item.type === 'recurring').length} recurring items detected</li>
                  <li>• {analysis.optimizedItems.filter((item: any) => item.unit_amount < 100).length} micro-pricing items found</li>
                  <li>• Average price: ${(analysis.optimizedItems.reduce((sum: number, item: any) => sum + item.unit_amount, 0) / analysis.optimizedItems.length / 100).toFixed(2)}</li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-medium mb-2">Sample Optimized Items Preview:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {analysis.optimizedItems.slice(0, 3).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                    <span className="font-medium">{item.product}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">{item.type}</Badge>
                      <span>${(item.unit_amount / 100).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {analysis.optimizedItems.length > 3 && (
                  <div className="text-center text-xs text-gray-500">
                    +{analysis.optimizedItems.length - 3} more items optimized...
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                onClick={acceptRecommendation}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply AI Recommendations
              </Button>
              <Button 
                variant="outline" 
                onClick={analyzeData}
              >
                <Brain className="h-4 w-4 mr-2" />
                Re-analyze Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIDataAnalyzer;
