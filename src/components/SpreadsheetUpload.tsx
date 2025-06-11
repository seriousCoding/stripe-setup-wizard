import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

export interface SpreadsheetUploadProps {
  onDataUploaded?: (data: any[]) => void;
}

const SpreadsheetUpload: React.FC<SpreadsheetUploadProps> = ({ onDataUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      setValidationResults(null);
    }
  };

  const processFile = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    Papa.parse(file, {
      complete: (result) => {
        console.log('Parsed CSV data:', result.data);
        
        if (result.errors.length > 0) {
          toast({
            title: "Parsing Error",
            description: `Error parsing CSV: ${result.errors[0].message}`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        const data = result.data as any[];
        setParsedData(data);
        
        // Validate the data
        const validation = validateData(data);
        setValidationResults(validation);
        
        if (validation.valid) {
          onDataUploaded?.(data);
          toast({
            title: "File processed successfully",
            description: `Processed ${data.length} rows of data.`,
          });
        } else {
          toast({
            title: "Validation Failed",
            description: `Found ${validation.errors.length} errors in the data.`,
            variant: "destructive",
          });
        }
        
        setIsProcessing(false);
      },
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast({
          title: "Error",
          description: `Error processing file: ${error.message}`,
          variant: "destructive",
        });
        setIsProcessing(false);
      }
    });
  };

  const validateData = (data: any[]): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data.length === 0) {
      errors.push("No data found in the file");
      return { valid: false, errors, warnings };
    }

    // Check for required columns
    const firstRow = data[0];
    const requiredColumns = ['product', 'price', 'currency'];
    
    requiredColumns.forEach(column => {
      if (!firstRow.hasOwnProperty(column)) {
        errors.push(`Missing required column: ${column}`);
      }
    });

    // Validate data types and values
    data.forEach((row, index) => {
      if (row.price && isNaN(parseFloat(row.price))) {
        errors.push(`Row ${index + 1}: Invalid price value "${row.price}"`);
      }
      
      if (row.currency && !['USD', 'EUR', 'GBP'].includes(row.currency.toUpperCase())) {
        warnings.push(`Row ${index + 1}: Unusual currency "${row.currency}"`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  };

  const downloadTemplate = () => {
    const csvContent = `product,price,currency,description,interval
"Premium Plan",29.99,USD,"Advanced features with priority support",month
"Basic Plan",9.99,USD,"Essential features for getting started",month
"Enterprise Plan",99.99,USD,"Full-featured plan for large teams",month`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'billing_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Import Billing Data</span>
        </CardTitle>
        <CardDescription>
          Upload a CSV file with your billing model data to quickly create pricing tiers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="csv-file">CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>

        {file && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FileSpreadsheet className="h-4 w-4" />
              <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            
            <Button 
              onClick={processFile} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Process File
                </>
              )}
            </Button>
          </div>
        )}

        {validationResults && (
          <div className="space-y-2">
            <div className={`flex items-center space-x-2 ${
              validationResults.valid ? 'text-green-600' : 'text-red-600'
            }`}>
              {validationResults.valid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="font-medium">
                {validationResults.valid ? 'Validation Passed' : 'Validation Failed'}
              </span>
            </div>
            
            {validationResults.errors.length > 0 && (
              <div className="text-sm text-red-600">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc list-inside">
                  {validationResults.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validationResults.warnings.length > 0 && (
              <div className="text-sm text-yellow-600">
                <p className="font-medium">Warnings:</p>
                <ul className="list-disc list-inside">
                  {validationResults.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {parsedData.length > 0 && (
          <div className="text-sm text-gray-600">
            <p>Successfully parsed {parsedData.length} rows</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpreadsheetUpload;
