
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, FileText, Image, Upload, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ocrService } from '@/services/ocrService';
import { pdfService } from '@/services/pdfService';

interface ProcessedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'processing' | 'completed' | 'error';
  data?: any[];
  error?: string;
  confidence?: number;
  processingProgress?: number;
  preview?: string;
  extractedText?: string;
}

interface FileUploadProcessorProps {
  onDataProcessed: (data: any[], metadata: any) => void;
  onFilesChanged?: (files: ProcessedFile[]) => void;
}

const FileUploadProcessor = ({ onDataProcessed, onFilesChanged }: FileUploadProcessorProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateFileProgress = (fileId: string, progress: number) => {
    setProcessedFiles(prev => {
      const updated = prev.map(f => 
        f.id === fileId ? { ...f, processingProgress: progress } : f
      );
      onFilesChanged?.(updated);
      return updated;
    });
  };

  const updateFileStatus = (fileId: string, updates: Partial<ProcessedFile>) => {
    setProcessedFiles(prev => {
      const updated = prev.map(f => 
        f.id === fileId ? { ...f, ...updates } : f
      );
      onFilesChanged?.(updated);
      return updated;
    });
  };

  const removeFile = (fileId: string) => {
    setProcessedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      onFilesChanged?.(updated);
      return updated;
    });
  };

  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const cleanAndNormalizeData = (rawText: string): string => {
    return rawText
      .replace(/[^\x20-\x7E\t\n\r]/g, '')
      .replace(/∞/g, 'unlimited')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const parseTabularData = (text: string): any[] => {
    try {
      const cleanText = cleanAndNormalizeData(text);
      const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length === 0) return [];

      const data: any[] = [];
      const pricePattern = /\$\d+\.?\d*/g;
      const numericPattern = /\d+\.?\d*/g;
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        let parts = trimmedLine.split('\t');
        if (parts.length === 1) {
          parts = trimmedLine.split(/\s{2,}/);
        }
        if (parts.length === 1) {
          parts = trimmedLine.split(/\s+/);
        }

        parts = parts.filter(part => part.trim());

        if (parts.length >= 2) {
          const prices = trimmedLine.match(pricePattern) || [];
          
          const item: any = {
            id: `parsed-${index}`,
            product: parts[0] || `Service ${index + 1}`,
            description: parts[0] || `Service ${index + 1}`,
            source: 'parsed_data',
            lineNumber: index + 1,
            originalLine: trimmedLine
          };

          if (parts.length > 1) {
            item.eventName = parts[1];
            item.meter_name = parts[1];
          }

          if (parts.length > 2) {
            item.unit = parts[2];
            item.unit_label = parts[2];
          }

          if (prices.length > 0) {
            const mainPrice = prices[prices.length - 1] || prices[0];
            item.price = parseFloat(mainPrice.replace('$', '')) || 0;
            item.unit_amount = Math.round(item.price * 100);
          }

          item.type = item.eventName && item.unit ? 'metered' : 'one_time';
          item.billing_scheme = 'per_unit';
          item.usage_type = 'metered';
          item.aggregate_usage = 'sum';
          item.currency = 'usd';
          item.metadata = {
            auto_detected_type: item.type,
            source: 'enhanced_parser',
            confidence: 85
          };

          data.push(item);
        }
      });

      return data;
    } catch (error) {
      console.error('Error parsing tabular data:', error);
      return [];
    }
  };

  const handleFileUpload = async (files: FileList) => {
    setIsProcessing(true);
    const newFiles: ProcessedFile[] = Array.from(files).map(file => ({
      id: generateFileId(),
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'processing',
      processingProgress: 0
    }));

    setProcessedFiles(prev => {
      const updated = [...prev, ...newFiles];
      onFilesChanged?.(updated);
      return updated;
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = newFiles[i].id;
      
      try {
        updateFileProgress(fileId, 10);
        const result = await processFile(file, fileId);
        
        updateFileStatus(fileId, { 
          status: 'completed', 
          data: result.data, 
          confidence: result.confidence, 
          processingProgress: 100,
          extractedText: result.extractedText,
          preview: result.preview
        });

        if (result.data && result.data.length > 0) {
          onDataProcessed(result.data, {
            fileName: file.name,
            fileType: file.type,
            confidence: result.confidence,
            processingMethod: result.method
          });
        }
      } catch (error: any) {
        console.error(`Error processing ${file.name}:`, error);
        updateFileStatus(fileId, { 
          status: 'error', 
          error: error.message, 
          processingProgress: 0 
        });

        toast({
          title: "Processing Error",
          description: `Failed to process ${file.name}: ${error.message}`,
          variant: "destructive",
        });
      }
    }

    setIsProcessing(false);
  };

  const processFile = async (file: File, fileId: string): Promise<{ 
    data: any[], 
    confidence: number, 
    method: string,
    extractedText?: string,
    preview?: string
  }> => {
    const fileName = file.name.toLowerCase();

    try {
      // Handle XLSX/XLS files
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        updateFileProgress(fileId, 30);
        return await processExcelFile(file, fileId);
      }

      // Handle PDF files
      if (file.type === 'application/pdf') {
        updateFileProgress(fileId, 20);
        return await processPDFFile(file, fileId);
      }

      // Handle image files (OCR)
      if (file.type.startsWith('image/')) {
        updateFileProgress(fileId, 25);
        return await processImageFile(file, fileId);
      }

      // Handle CSV/text files
      if (fileName.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain') {
        updateFileProgress(fileId, 40);
        return await processCSVFile(file, fileId);
      }

      // Handle JSON files
      if (file.type === 'application/json') {
        updateFileProgress(fileId, 50);
        return await processJSONFile(file, fileId);
      }

      throw new Error(`Unsupported file type: ${file.type}`);
    } catch (error: any) {
      console.error(`File processing error for ${file.name}:`, error);
      throw error;
    }
  };

  const processExcelFile = async (file: File, fileId: string): Promise<{ 
    data: any[], 
    confidence: number, 
    method: string 
  }> => {
    try {
      updateFileProgress(fileId, 50);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      
      if (!firstSheetName) {
        throw new Error('Excel file has no sheets');
      }
      
      const worksheet = workbook.Sheets[firstSheetName];
      
      updateFileProgress(fileId, 70);
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false
      });
      
      if (jsonData.length === 0) {
        throw new Error('Excel file appears to be empty');
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];
      
      updateFileProgress(fileId, 90);
      const data = rows
        .filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map((row, index) => {
          const obj: any = { id: `excel-${index}` };
          headers.forEach((header, cellIndex) => {
            if (header && header.trim()) {
              obj[header.trim()] = row[cellIndex] || '';
            }
          });
          
          obj.product = obj.product || obj.name || obj['Metric Description'] || obj.description || `Product ${index + 1}`;
          obj.eventName = obj.eventName || obj['Meter Name'] || obj.meter_name;
          obj.unit = obj.unit || obj.Unit || obj.unit_label;
          
          const priceField = obj.price || obj['Per Unit Rate (USD)'] || obj.amount;
          if (priceField) {
            obj.price = typeof priceField === 'string' ? 
              parseFloat(priceField.replace(/[$,]/g, '')) : parseFloat(priceField);
          }
          
          obj.type = obj.eventName && obj.unit ? 'metered' : 'one_time';
          obj.currency = 'usd';
          
          return obj;
        });

      return {
        data,
        confidence: 95,
        method: 'excel_parser'
      };
    } catch (error: any) {
      console.error('Excel processing error:', error);
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  };

  const processPDFFile = async (file: File, fileId: string): Promise<{ 
    data: any[], 
    confidence: number, 
    method: string,
    extractedText: string 
  }> => {
    try {
      updateFileProgress(fileId, 30);
      const pdfResult = await pdfService.parsePDF(file);
      
      updateFileProgress(fileId, 60);
      
      const parsedData = parseTabularData(pdfResult.text);
      
      updateFileProgress(fileId, 90);
      
      if (parsedData.length === 0) {
        const data = [{
          id: 'pdf-content',
          product: `PDF Content from ${file.name}`,
          description: pdfResult.text.substring(0, 200) + (pdfResult.text.length > 200 ? '...' : ''),
          pages: pdfResult.numPages,
          extractedText: pdfResult.text,
          type: 'one_time',
          source: 'pdf_fallback'
        }];
        
        return {
          data,
          confidence: 40,
          method: 'pdf_text_extraction',
          extractedText: pdfResult.text
        };
      }

      return {
        data: parsedData,
        confidence: 80,
        method: 'pdf_tabular_extraction',
        extractedText: pdfResult.text
      };
    } catch (error: any) {
      console.error('PDF processing error:', error);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  };

  const processImageFile = async (file: File, fileId: string): Promise<{ 
    data: any[], 
    confidence: number, 
    method: string,
    extractedText: string,
    preview: string 
  }> => {
    try {
      updateFileProgress(fileId, 30);
      
      // Create preview
      const preview = URL.createObjectURL(file);
      
      toast({
        title: "OCR Processing",
        description: "Processing image with OCR. This may take a moment...",
      });

      const ocrResult = await ocrService.processImage(file);
      
      updateFileProgress(fileId, 80);
      
      const parsedData = parseTabularData(ocrResult.text);
      
      if (parsedData.length === 0) {
        const lines = ocrResult.text.split('\n').filter(line => line.trim());
        const pricePattern = /\$\d+\.?\d*/;
        
        const data: any[] = [];
        lines.forEach((line, index) => {
          if (pricePattern.test(line)) {
            data.push({
              id: `ocr-${index}`,
              product: line.replace(pricePattern, '').trim() || `OCR Item ${index + 1}`,
              price: parseFloat((line.match(pricePattern)?.[0] || '$0').replace('$', '')),
              source: 'OCR',
              confidence: ocrResult.confidence,
              originalLine: line,
              type: 'one_time'
            });
          }
        });

        if (data.length === 0) {
          data.push({
            id: 'ocr-content',
            product: `OCR Text from ${file.name}`,
            description: ocrResult.text.substring(0, 300) + (ocrResult.text.length > 300 ? '...' : ''),
            confidence: ocrResult.confidence,
            fullText: ocrResult.text,
            type: 'one_time'
          });
        }

        return {
          data,
          confidence: Math.round(ocrResult.confidence),
          method: 'image_ocr_fallback',
          extractedText: ocrResult.text,
          preview
        };
      }

      return {
        data: parsedData,
        confidence: Math.round(ocrResult.confidence),
        method: 'image_ocr',
        extractedText: ocrResult.text,
        preview
      };
    } catch (error: any) {
      console.error('OCR processing error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  };

  const processCSVFile = async (file: File, fileId: string): Promise<{ 
    data: any[], 
    confidence: number, 
    method: string 
  }> => {
    return new Promise((resolve, reject) => {
      updateFileProgress(fileId, 40);
      
      Papa.parse(file, {
        complete: (result) => {
          try {
            if (result.errors.length > 0) {
              console.warn('CSV parsing warnings:', result.errors);
            }

            updateFileProgress(fileId, 90);
            
            let data = result.data as any[];
            
            if (data.length === 0) {
              throw new Error('CSV file is empty');
            }

            const firstRow = data[0];
            const hasHeaders = typeof firstRow === 'object' && !Array.isArray(firstRow);
            
            if (!hasHeaders && Array.isArray(firstRow)) {
              const headers = firstRow.map((_, index) => `column_${index}`);
              data = data.slice(1).map((row: any[], index) => {
                const obj: any = { id: `csv-${index}` };
                headers.forEach((header, cellIndex) => {
                  obj[header] = row[cellIndex] || '';
                });
                return obj;
              });
            }

            const processedData = data
              .filter(row => row && Object.keys(row).length > 0)
              .map((row, index) => {
                const cleanRow = { ...row, id: row.id || `csv-${index}` };
                
                cleanRow.product = cleanRow.product || cleanRow.name || cleanRow['Metric Description'] || cleanRow.description;
                cleanRow.eventName = cleanRow.eventName || cleanRow['Meter Name'] || cleanRow.meter_name;
                
                return cleanRow;
              });

            resolve({
              data: processedData,
              confidence: 98,
              method: 'csv_parser'
            });
          } catch (error: any) {
            reject(new Error(`CSV processing error: ${error.message}`));
          }
        },
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        error: (error) => reject(new Error(`CSV parsing failed: ${error.message}`))
      });
    });
  };

  const processJSONFile = async (file: File, fileId: string): Promise<{ 
    data: any[], 
    confidence: number, 
    method: string 
  }> => {
    try {
      updateFileProgress(fileId, 40);
      const text = await file.text();
      
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid JSON format');
      }
      
      updateFileProgress(fileId, 80);
      
      let data: any[];
      if (Array.isArray(jsonData)) {
        data = jsonData;
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        data = jsonData.data;
      } else if (jsonData.products && Array.isArray(jsonData.products)) {
        data = jsonData.products;
      } else if (jsonData.items && Array.isArray(jsonData.items)) {
        data = jsonData.items;
      } else {
        data = [jsonData];
      }

      data = data.map((item, index) => ({
        ...item,
        id: item.id || `json-${index}`
      }));

      return {
        data,
        confidence: 99,
        method: 'json_parser'
      };
    } catch (error: any) {
      console.error('JSON processing error:', error);
      throw new Error(`JSON processing failed: ${error.message}`);
    }
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      toast({
        title: "Processing Capture",
        description: "Processing captured image with OCR...",
      });

      const ocrResult = await ocrService.processCameraCapture(canvas);
      const parsedData = parseTabularData(ocrResult.text);
      
      let data = parsedData;
      if (data.length === 0) {
        data = [{
          id: 'camera-capture',
          product: 'Camera Capture OCR',
          description: ocrResult.text.substring(0, 300) + (ocrResult.text.length > 300 ? '...' : ''),
          confidence: ocrResult.confidence,
          fullText: ocrResult.text,
          type: 'one_time'
        }];
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

  const downloadExtractedText = (file: ProcessedFile) => {
    if (!file.extractedText) return;
    
    const blob = new Blob([file.extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>File Upload & Processing</span>
          </CardTitle>
          <CardDescription>
            Upload documents, images, or capture photos for automatic processing and data extraction
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
              <p className="text-xs text-muted-foreground">Supports: CSV, Excel, JSON, PDF, Images (JPG, PNG, etc.)</p>
              
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.json,.pdf,image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Button asChild size="sm" className="mt-2">
                <label htmlFor="file-upload">Choose Files</label>
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
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
              {isCameraActive ? 'Capture Photo' : 'Take Photo'}
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
                {processedFiles.map((file) => (
                  <div key={file.id} className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        {file.status === 'processing' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                        )}
                        {file.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        
                        <div className="flex-1">
                          <div className="text-sm font-medium">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        
                        {file.preview && (
                          <div className="flex-shrink-0">
                            <img src={file.preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {file.confidence && (
                          <Badge variant="outline">
                            {file.confidence}% confidence
                          </Badge>
                        )}
                        
                        {file.extractedText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadExtractedText(file)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        
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
                    
                    {file.status === 'completed' && file.data && (
                      <div className="text-xs text-green-600 ml-7">
                        Successfully extracted {file.data.length} items
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

export default FileUploadProcessor;
