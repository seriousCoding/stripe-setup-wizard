
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
      
      // Validate image file
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('File is not a valid image');
      }

      // Check file size (limit to 10MB)
      if (imageFile.size > 10 * 1024 * 1024) {
        throw new Error('Image file is too large (max 10MB)');
      }

      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: m => console.log('OCR Progress:', m),
        errorHandler: err => console.error('OCR Error:', err)
      });

      if (!result.data) {
        throw new Error('OCR processing returned no data');
      }

      console.log('OCR Result:', result.data);

      const extractedData = this.extractStructuredData(result.data.text);

      return {
        text: result.data.text || '',
        confidence: result.data.confidence || 0,
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
    const numberPattern = /\d+\.?\d*/;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 3) return;

      // Split by tabs, multiple spaces, or single spaces
      let parts = trimmedLine.split('\t');
      if (parts.length === 1) {
        parts = trimmedLine.split(/\s{2,}/);
      }
      if (parts.length === 1) {
        parts = trimmedLine.split(/\s+/);
      }

      parts = parts.filter(part => part.trim());

      if (parts.length >= 1) {
        const prices = trimmedLine.match(pricePattern) || [];
        const hasPrice = prices.length > 0;
        const hasNumbers = numberPattern.test(trimmedLine);
        
        // Process any line that could contain product information
        if (hasPrice || hasNumbers || parts.length >= 2) {
          const item: any = {
            id: `ocr-${index}`,
            product: parts[0] || `Service ${index + 1}`,
            description: parts[0] || `Service ${index + 1}`,
            source: 'ocr',
            lineNumber: index + 1,
            originalLine: trimmedLine
          };

          // Add additional details if available
          if (parts.length > 1) {
            item.details = parts.slice(1).join(' ');
          }

          // Extract pricing
          if (hasPrice) {
            const mainPrice = prices[prices.length - 1] || prices[0];
            item.price = parseFloat(mainPrice.replace('$', '')) || 0;
            item.unit_amount = Math.round(item.price * 100);
          } else {
            item.price = 0;
            item.unit_amount = 0;
          }

          // Determine product type
          const lowerLine = trimmedLine.toLowerCase();
          if (lowerLine.includes('per') || lowerLine.includes('usage') || lowerLine.includes('meter')) {
            item.type = 'metered';
            item.billing_scheme = 'per_unit';
            item.usage_type = 'metered';
            item.aggregate_usage = 'sum';
          } else if (lowerLine.includes('month') || lowerLine.includes('subscription')) {
            item.type = 'recurring';
            item.billing_scheme = 'per_unit';
            item.interval = 'month';
          } else {
            item.type = 'one_time';
          }

          item.currency = 'usd';
          item.metadata = {
            auto_detected_type: item.type,
            source: 'ocr_parser',
            confidence: 80
          };

          data.push(item);
        }
      }
    });

    return data;
  }
}

export const ocrService = new OCRService();
