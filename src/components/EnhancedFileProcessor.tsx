import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, FileText, Image, Upload, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dataExtractionService } from '@/services/dataExtractionService';
import { ocrService } from '@/services/ocrService';

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
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      setIsMobile(isMobileDevice || (hasTouch && isSmallScreen));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        
        toast({
          title: "Processing File",
          description: `Processing ${file.name}...`,
        });

        const result = await dataExtractionService.extractFromFile(file);
        
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

          toast({
            title: "Processing Complete",
            description: `Successfully extracted ${result.data.length} items from ${file.name} with ${result.confidence}% confidence`,
          });
        } else {
          toast({
            title: "No Data Found",
            description: `Could not extract structured data from ${file.name}`,
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error(`Error processing ${file.name}:`, error);
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
      
      let data = ocrResult.data || [];
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
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const files = e.dataTransfer.files;
              if (files.length > 0) {
                handleFileUpload(files);
              }
            }}
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
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleFileUpload(files);
                  }
                }}
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
            
            {isMobile && (
              <Button 
                variant="outline" 
                onClick={isCameraActive ? capturePhoto : startCamera}
                disabled={isProcessing}
              >
                <Camera className="h-4 w-4 mr-2" />
                {isCameraActive ? 'Capture Photo' : 'Take Photo'}
              </Button>
            )}
            
            {isCameraActive && (
              <Button variant="outline" onClick={stopCamera}>
                Stop Camera
              </Button>
            )}
          </div>

          {/* Mobile Camera Preview */}
          {isCameraActive && isMobile && (
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
