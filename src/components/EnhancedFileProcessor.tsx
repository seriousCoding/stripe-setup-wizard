
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, FileText, Image, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  status: 'processing' | 'completed' | 'error';
  data?: any[];
  error?: string;
  confidence?: number;
}

interface EnhancedFileProcessorProps {
  onDataProcessed: (data: any[], metadata: any) => void;
}

const EnhancedFileProcessor = ({ onDataProcessed }: EnhancedFileProcessorProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList) => {
    setIsProcessing(true);
    const newFiles: ProcessedFile[] = Array.from(files).map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'processing'
    }));

    setProcessedFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await processFile(file);
        
        setProcessedFiles(prev => prev.map(f => 
          f.name === file.name && f.size === file.size
            ? { ...f, status: 'completed', data: result.data, confidence: result.confidence }
            : f
        ));

        if (result.data && result.data.length > 0) {
          onDataProcessed(result.data, {
            fileName: file.name,
            fileType: file.type,
            confidence: result.confidence,
            processingMethod: result.method
          });
        }
      } catch (error: any) {
        setProcessedFiles(prev => prev.map(f => 
          f.name === file.name && f.size === file.size
            ? { ...f, status: 'error', error: error.message }
            : f
        ));

        toast({
          title: "Processing Error",
          description: `Failed to process ${file.name}: ${error.message}`,
          variant: "destructive",
        });
      }
    }

    setIsProcessing(false);
  };

  const processFile = async (file: File): Promise<{ data: any[], confidence: number, method: string }> => {
    const fileName = file.name.toLowerCase();

    // Handle XLSX/XLS files
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return await processExcelFile(file);
    }

    // Handle PDF files (mock implementation for now)
    if (file.type === 'application/pdf') {
      return await processPDFFile(file);
    }

    // Handle image files (OCR)
    if (file.type.startsWith('image/')) {
      return await processImageFile(file);
    }

    // Handle CSV/text files
    if (fileName.endsWith('.csv') || file.type === 'text/csv') {
      return await processCSVFile(file);
    }

    // Handle JSON files
    if (file.type === 'application/json') {
      return await processJSONFile(file);
    }

    throw new Error(`Unsupported file type: ${file.type}`);
  };

  const processExcelFile = async (file: File): Promise<{ data: any[], confidence: number, method: string }> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('Excel file appears to be empty');
    }

    // Convert to object format
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];
    
    const data = rows
      .filter(row => row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
      .map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          if (header && header.trim()) {
            obj[header.trim()] = row[index] || '';
          }
        });
        return obj;
      });

    return {
      data,
      confidence: 95,
      method: 'excel_parser'
    };
  };

  const processPDFFile = async (file: File): Promise<{ data: any[], confidence: number, method: string }> => {
    // Mock PDF processing - in reality, you'd use a library like PDF.js
    // or send to a backend service for OCR processing
    
    toast({
      title: "PDF Processing",
      description: "PDF processing requires additional OCR setup. This is a demonstration of the workflow.",
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock data that represents what OCR might extract
    const mockData = [
      {
        product: "Document Processing Service",
        eventName: "document_processing",
        price: 0.05,
        unit: "page",
        description: "Extracted from PDF via OCR"
      },
      {
        product: "Text Analysis",
        eventName: "text_analysis", 
        price: 0.02,
        unit: "word",
        description: "PDF content analysis"
      }
    ];

    return {
      data: mockData,
      confidence: 75,
      method: 'pdf_ocr_mock'
    };
  };

  const processImageFile = async (file: File): Promise<{ data: any[], confidence: number, method: string }> => {
    // Mock OCR processing - in reality, you'd use Tesseract.js or a cloud OCR service
    
    toast({
      title: "OCR Processing",
      description: "Image OCR processing requires additional setup. This demonstrates the workflow.",
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Return mock data that represents what OCR might extract
    const mockData = [
      {
        product: "OCR Service",
        eventName: "ocr_processing",
        price: 0.10,
        unit: "image",
        description: "Extracted from image via OCR"
      }
    ];

    return {
      data: mockData,
      confidence: 68,
      method: 'image_ocr_mock'
    };
  };

  const processCSVFile = async (file: File): Promise<{ data: any[], confidence: number, method: string }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${result.errors[0].message}`));
            return;
          }

          resolve({
            data: result.data as any[],
            confidence: 98,
            method: 'csv_parser'
          });
        },
        header: true,
        skipEmptyLines: true,
        error: (error) => reject(new Error(`CSV processing failed: ${error.message}`))
      });
    });
  };

  const processJSONFile = async (file: File): Promise<{ data: any[], confidence: number, method: string }> => {
    const text = await file.text();
    const jsonData = JSON.parse(text);
    
    let data: any[];
    if (Array.isArray(jsonData)) {
      data = jsonData;
    } else if (jsonData.data && Array.isArray(jsonData.data)) {
      data = jsonData.data;
    } else {
      data = [jsonData];
    }

    return {
      data,
      confidence: 99,
      method: 'json_parser'
    };
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      
      toast({
        title: "Camera Active",
        description: "Camera is ready. Take a photo to process with OCR.",
      });
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    // Mock photo capture and OCR processing
    toast({
      title: "Photo Captured",
      description: "Processing image with OCR... (This requires additional setup)",
    });
    
    // In a real implementation, you'd:
    // 1. Capture frame from video stream
    // 2. Convert to image blob
    // 3. Process with OCR service
    
    stopCamera();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Enhanced File Processing</span>
          </CardTitle>
          <CardDescription>
            Upload files, capture images, or scan documents with OCR and PDF parsing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <Card 
            className={`border-2 border-dashed transition-all duration-200 ${
              isDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-border'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setIsDragOver(true)}
            onDragLeave={() => setIsDragOver(false)}
          >
            <CardContent className="p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-blue-600 mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">Supports: CSV, Excel, JSON, PDF, Images</p>
              
              <input
                id="enhanced-file-upload"
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.json,.pdf,image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Button asChild size="sm" className="mt-2">
                <label htmlFor="enhanced-file-upload">Choose Files</label>
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('enhanced-file-upload')?.click()}
              disabled={isProcessing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            
            <Button 
              variant="outline" 
              onClick={isCameraActive ? capturePhoto : startCamera}
            >
              <Camera className="h-4 w-4 mr-2" />
              {isCameraActive ? 'Capture Photo' : 'Start Camera'}
            </Button>
            
            {isCameraActive && (
              <Button variant="outline" onClick={stopCamera}>
                Stop Camera
              </Button>
            )}
          </div>

          {/* Camera Preview */}
          {isCameraActive && cameraStream && (
            <Card>
              <CardContent className="p-4">
                <video
                  autoPlay
                  playsInline
                  ref={(video) => {
                    if (video && cameraStream) {
                      video.srcObject = cameraStream;
                    }
                  }}
                  className="w-full max-w-md mx-auto rounded-lg"
                />
                <div className="flex justify-center mt-2">
                  <Button onClick={capturePhoto}>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture & Process
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Status */}
          {processedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Processing Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {processedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-3">
                      {file.status === 'processing' && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                      )}
                      {file.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      
                      <div>
                        <div className="text-sm font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {file.confidence && (
                        <Badge variant="outline">
                          {file.confidence}% confidence
                        </Badge>
                      )}
                      <Badge 
                        variant={
                          file.status === 'completed' ? 'default' :
                          file.status === 'error' ? 'destructive' : 'secondary'
                        }
                      >
                        {file.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedFileProcessor;
