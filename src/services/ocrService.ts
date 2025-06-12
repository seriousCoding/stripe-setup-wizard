
import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  words: any[];
}

class OCRService {
  async processImage(imageFile: File): Promise<OCRResult> {
    try {
      console.log('Starting OCR processing for:', imageFile.name);
      
      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: m => console.log('OCR Progress:', m)
      });

      console.log('OCR Result:', result.data);

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: (result.data as any).words || []
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  async processCameraCapture(canvas: HTMLCanvasElement): Promise<OCRResult> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to capture image'));
          return;
        }
        
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        try {
          const result = await this.processImage(file);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 'image/jpeg', 0.8);
    });
  }
}

export const ocrService = new OCRService();
