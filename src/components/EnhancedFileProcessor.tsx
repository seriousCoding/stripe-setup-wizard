
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, FileText, Image, Upload, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ocrService } from '@/services/ocrService';
import { pdfService } from '@/services/pdfService';

interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  status: 'processing' | 'completed' | 'error';
  data?: any[];
  error?: string;
  confidence?: number;
  processingProgress?: number;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const updateFileProgress = (fileName: string, progress: number) => {
    setProcessedFiles(prev => prev.map(f => 
      f.name === fileName ? { ...f, processingProgress: progress } : f
    ));
  };

  const handleFileUpload = async (files: FileList) => {
    setIsProcessing(true);
    const newFiles: ProcessedFile[] = Array.from(files).map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'processing',
      processingProgress: 0
    }));

    setProcessedFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        updateFileProgress(file.name, 10);
        const result = await processFile(file);
        
        setProcessedFiles(prev => prev.map(f => 
          f.name === file.name && f.size === file.size
            ? { ...f, status: 'completed', data: result.data, confidence: result.confidence, processingProgress: 100 }
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
            ? { ...f, status: 'error', error: error.message, processingProgress: 0 }
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
      updateFileProgress(file.name, 30);
      return await processExcelFile(file);
    }

    // Handle PDF files
    if (file.type === 'application/pdf') {
      updateFileProgress(file.name, 20);
      return await processPDFFile(file);
    }

    // Handle image files (OCR)
    if (file.type.startsWith('image/')) {
      updateFileProgress(file.name, 25);
      return await processImageFile(file);
    }

    // Handle CSV/text files
    if (fileName.endsWith('.csv') || file.type === 'text/csv') {
      updateFileProgress(file.name, 40);
      return await processCSVFile(file);
    }

    // Handle JSON files
    if (file.type === 'application/json') {
      updateFileProgress(file.name, 50);
      return await processJSONFile(file);
    }

    throw new Error(`Unsupported file type: ${file.type}`);
  };

  const processExcelFile = async (file: File): Promise<{ data: any[], confidence: number, method: string }> => {
    updateFileProgress(file.name, 50);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    updateFileProgress(file.name, 70);
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('Excel file appears to be empty');
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];
    
    updateFileProgress(file.name, 90);
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
    try {
      updateFileProgress(file.name, 30);
      const pdfResult = await pdfService.parsePDF(file);
      
      updateFileProgress(file.name, 60);
      const tabularData = pdfService.extractTabularData(pdfResult.text);
      
      updateFileProgress(file.name, 90);
      
      if (tabularData.length === 0) {
        // If no tabular data found, create a basic structure from text
        const data = [{
          product: `PDF Content from ${file.name}`,
          description: pdfResult.text.substring(0, 200) + (pdfResult.text.length > 200 ? '...' : ''),
          pages: pdfResult.numPages,
          extractedText: pdfResult.text
        }];
        
        return {
          data,
          confidence: 60,
          method: 'pdf_text_extraction'
        };
      }

      return {
        data: tabularData,
        confidence: 80,
        method: 'pdf_tabular_extraction'
      };
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error(`PDF processing failed: ${error}`);
    }
  };

  const processImageFile = async (file: File): Promise<{ data: any[], confidence: number, method: string }> => {
    try {
      updateFileProgress(file.name, 30);
      
      toast({
        title: "OCR Processing",
        description: "Processing image with OCR. This may take a moment...",
      });

      const ocrResult = await ocrService.processImage(file);
      
      updateFileProgress(file.name, 80);
      
      // Try to extract structured data from OCR text
      const lines = ocrResult.text.split('\n').filter(line => line.trim());
      const data: any[] = [];
      
      // Simple pattern matching for pricing data
      const pricePattern = /\$\d+\.?\d*/;
      const servicePattern = /^[A-Za-z\s]+/;
      
      lines.forEach((line, index) => {
        if (pricePattern.test(line) && servicePattern.test(line)) {
          const priceMatch = line.match(pricePattern);
          const serviceMatch = line.match(servicePattern);
          
          if (priceMatch && serviceMatch) {
            data.push({
              product: serviceMatch[0].trim(),
              price: priceMatch[0],
              source: 'OCR',
              confidence: ocrResult.confidence,
              originalLine: line,
              lineNumber: index + 1
            });
          }
        }
      });

      // If no structured data found, return the raw text
      if (data.length === 0) {
        data.push({
          product: `OCR Text from ${file.name}`,
          description: ocrResult.text.substring(0, 300) + (ocrResult.text.length > 300 ? '...' : ''),
          confidence: ocrResult.confidence,
          fullText: ocrResult.text
        });
      }

      return {
        data,
        confidence: Math.round(ocrResult.confidence),
        method: 'image_ocr'
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(`OCR processing failed: ${error}`);
    }
  };

  const processCSVFile = async (file: File): Promise<{ data: any[], confidence: number, method: string }> => {
    return new Promise((resolve, reject) => {
      updateFileProgress(file.name, 40);
      Papa.parse(file, {
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${result.errors[0].message}`));
            return;
          }

          updateFileProgress(file.name, 90);
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
    updateFileProgress(file.name, 40);
    const text = await file.text();
    const jsonData = JSON.parse(text);
    
    updateFileProgress(file.name, 80);
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
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      toast({
        title: "Camera Active",
        description: "Camera is ready. Position document and take a photo to process with OCR.",
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

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      toast({
        title: "Processing Capture",
        description: "Processing captured image with OCR...",
      });

      const ocrResult = await ocrService.processCameraCapture(canvas);
      
      // Process the OCR result similar to image file processing
      const lines = ocrResult.text.split('\n').filter(line => line.trim());
      const data: any[] = [];
      
      const pricePattern = /\$\d+\.?\d*/;
      const servicePattern = /^[A-Za-z\s]+/;
      
      lines.forEach((line, index) => {
        if (pricePattern.test(line) && servicePattern.test(line)) {
          const priceMatch = line.match(pricePattern);
          const serviceMatch = line.match(servicePattern);
          
          if (priceMatch && serviceMatch) {
            data.push({
              product: serviceMatch[0].trim(),
              price: priceMatch[0],
              source: 'Camera OCR',
              confidence: ocrResult.confidence,
              originalLine: line,
              lineNumber: index + 1
            });
          }
        }
      });

      if (data.length === 0) {
        data.push({
          product: 'Camera Capture OCR',
          description: ocrResult.text.substring(0, 300) + (ocrResult.text.length > 300 ? '...' : ''),
          confidence: ocrResult.confidence,
          fullText: ocrResult.text
        });
      }

      onDataProcessed(data, {
        fileName: 'camera-capture.jpg',
        fileType: 'image/jpeg',
        confidence: Math.round(ocrResult.confidence),
        processingMethod: 'camera_ocr'
      });

      toast({
        title: "Capture Processed",
        description: `OCR completed with ${Math.round(ocrResult.confidence)}% confidence`,
      });

    } catch (error: any) {
      toast({
        title: "OCR Processing Error",
        description: error.message,
        variant: "destructive",
      });
    }
    
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
              disabled={isProcessing}
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
          {isCameraActive && (
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                </div>
                <div className="flex justify-center mt-4 space-x-2">
                  <Button onClick={capturePhoto}>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture & Process
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
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
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded">
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
                    
                    {file.status === 'processing' && file.processingProgress !== undefined && (
                      <Progress value={file.processingProgress} className="h-2" />
                    )}
                    
                    {file.status === 'error' && file.error && (
                      <div className="text-xs text-red-600 ml-7">
                        Error: {file.error}
                      </div>
                    )}
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
