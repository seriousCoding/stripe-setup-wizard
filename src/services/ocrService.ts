
import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  words: any[];
  data?: any[];
}

class OCRService {
  async processImage(imageFile: File): Promise<OCRResult> {
    try {
      console.log('Starting OCR processing for:', imageFile.name);
      
      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: m => console.log('OCR Progress:', m)
      });

      console.log('OCR Result:', result.data);

      const extractedData = this.extractStructuredData(result.data.text);

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: (result.data as any).words || [],
        data: extractedData
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

  private extractStructuredData(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim());
    const data: any[] = [];
    const pricePattern = /\$\d+\.?\d*/g;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Split by tabs, multiple spaces, or single spaces
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
          id: `ocr-${index}`,
          product: parts[0] || `Service ${index + 1}`,
          description: parts[0] || `Service ${index + 1}`,
          source: 'ocr',
          lineNumber: index + 1,
          originalLine: trimmedLine
        };

        // Detect meter name (usually second column)
        if (parts.length > 1 && parts[1] !== '0' && !parts[1].match(/^\$/)) {
          item.eventName = parts[1];
          item.meter_name = parts[1];
        }

        // Detect unit (usually third column)
        if (parts.length > 2 && parts[2] !== '0' && !parts[2].match(/^\$/)) {
          item.unit = parts[2];
          item.unit_label = parts[2];
        }

        // Extract pricing
        if (prices.length > 0) {
          const mainPrice = prices[prices.length - 1] || prices[0];
          item.price = parseFloat(mainPrice.replace('$', '')) || 0;
          item.unit_amount = Math.round(item.price * 100);
        } else {
          item.price = 0;
          item.unit_amount = 0;
        }

        // Set billing type
        if (item.eventName && item.unit) {
          item.type = 'metered';
          item.billing_scheme = 'per_unit';
          item.usage_type = 'metered';
          item.aggregate_usage = 'sum';
        } else {
          item.type = 'one_time';
        }

        item.currency = 'usd';
        item.metadata = {
          auto_detected_type: item.type,
          source: 'ocr_parser',
          confidence: 85
        };

        data.push(item);
      }
    });

    return data;
  }
}

export const ocrService = new OCRService();
