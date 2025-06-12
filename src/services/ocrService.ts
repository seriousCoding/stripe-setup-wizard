
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
      console.log('Starting OCR processing for:', imageFile.name, 'Size:', imageFile.size);
      
      // Validate image file
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('File is not a valid image format');
      }

      // Check file size (limit to 20MB)
      if (imageFile.size > 20 * 1024 * 1024) {
        throw new Error('Image file is too large (max 20MB)');
      }

      // Check if file is empty
      if (imageFile.size === 0) {
        throw new Error('Image file is empty');
      }

      // Validate image can be loaded
      await this.validateImageFile(imageFile);

      console.log('Starting Tesseract recognition...');

      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        errorHandler: (err) => console.error('Tesseract Error:', err)
      });

      if (!result || !result.data) {
        throw new Error('OCR processing returned no data');
      }

      const confidence = result.data.confidence || 0;
      const text = result.data.text || '';
      // Fix: Extract words from the proper Tesseract result structure
      const words = this.extractWordsFromResult(result.data);

      console.log('OCR completed. Confidence:', confidence, 'Text length:', text.length);

      if (text.trim().length === 0) {
        console.warn('OCR returned empty text');
        return {
          text: '',
          confidence: 0,
          words: [],
          data: []
        };
      }

      const extractedData = this.extractStructuredData(text);

      return {
        text,
        confidence,
        words,
        data: extractedData
      };
    } catch (error: any) {
      console.error('OCR processing failed:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw new Error('Network error during OCR processing. Please check your connection and try again.');
      } else if (error.message?.includes('worker')) {
        throw new Error('OCR engine failed to initialize. Please refresh the page and try again.');
      } else {
        throw new Error(`OCR processing failed: ${error.message || 'Unknown error'}`);
      }
    }
  }

  private extractWordsFromResult(data: any): any[] {
    try {
      // Try to extract words from the Tesseract result structure
      if (data.paragraphs && Array.isArray(data.paragraphs)) {
        const allWords: any[] = [];
        data.paragraphs.forEach((paragraph: any) => {
          if (paragraph.lines && Array.isArray(paragraph.lines)) {
            paragraph.lines.forEach((line: any) => {
              if (line.words && Array.isArray(line.words)) {
                allWords.push(...line.words);
              }
            });
          }
        });
        return allWords;
      }
      
      // Fallback: if words exist directly (though unlikely with current Tesseract.js)
      if (data.words && Array.isArray(data.words)) {
        return data.words;
      }
      
      // Return empty array if no words structure found
      return [];
    } catch (error) {
      console.warn('Error extracting words from OCR result:', error);
      return [];
    }
  }

  private async validateImageFile(imageFile: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageFile);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.width === 0 || img.height === 0) {
          reject(new Error('Invalid image dimensions'));
        } else {
          resolve();
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Cannot load image file - file may be corrupted'));
      };
      
      img.src = url;
    });
  }

  async processCameraCapture(canvas: HTMLCanvasElement): Promise<OCRResult> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to capture image from camera'));
          return;
        }
        
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        try {
          const result = await this.processImage(file);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 'image/jpeg', 0.9);
    });
  }

  private extractStructuredData(text: string): any[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 2);
    
    const data: any[] = [];
    const pricePattern = /\$?\d+\.?\d*/g;
    const currencyPattern = /\$\d+(?:\.\d{2})?/g;
    const numberPattern = /\d+\.?\d*/;
    
    lines.forEach((line, index) => {
      // Skip very short lines
      if (line.length < 4) return;

      // Split by tabs, multiple spaces, or other delimiters
      let parts = line.split('\t').filter(part => part.trim());
      if (parts.length === 1) {
        parts = line.split(/\s{3,}/).filter(part => part.trim());
      }
      if (parts.length === 1) {
        parts = line.split(/\|/).filter(part => part.trim());
      }
      if (parts.length === 1) {
        parts = line.split(/,(?=\s)/).filter(part => part.trim());
      }
      if (parts.length === 1) {
        parts = line.split(/\s+/).filter(part => part.trim());
      }

      const prices = line.match(currencyPattern) || [];
      const numbers = line.match(pricePattern) || [];
      const hasPrice = prices.length > 0;
      const hasNumbers = numberPattern.test(line);
        
      // Determine if this could be product information
      const isProductLine = hasPrice || 
                           hasNumbers || 
                           parts.length >= 2 ||
                           line.toLowerCase().includes('service') ||
                           line.toLowerCase().includes('product') ||
                           line.toLowerCase().includes('plan') ||
                           line.toLowerCase().includes('subscription') ||
                           line.toLowerCase().includes('api') ||
                           line.toLowerCase().includes('usage');

      if (isProductLine && parts.length > 0) {
        const productName = parts[0] || `Service ${index + 1}`;
        
        const item: any = {
          id: `ocr-${index}`,
          product: productName,
          description: parts.length > 1 ? parts.slice(1).join(' ') : productName,
          source: 'ocr',
          lineNumber: index + 1,
          originalLine: line,
          rawParts: parts
        };

        // Extract pricing information
        if (hasPrice && prices.length > 0) {
          const mainPrice = prices[0];
          const numericPrice = parseFloat(mainPrice.replace(/[$,]/g, ''));
          if (!isNaN(numericPrice)) {
            item.price = numericPrice;
            item.unit_amount = Math.round(numericPrice * 100);
          }
        } else if (hasNumbers && numbers.length > 0) {
          // Try to find a reasonable price from numbers
          const validNumbers = numbers
            .map(n => parseFloat(n))
            .filter(n => !isNaN(n) && n > 0 && n < 100000);
          
          if (validNumbers.length > 0) {
            item.price = validNumbers[validNumbers.length - 1];
            item.unit_amount = Math.round(item.price * 100);
          }
        }

        if (!item.price) {
          item.price = 0;
          item.unit_amount = 0;
        }

        // Determine product type based on content
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('per') || lowerLine.includes('usage') || lowerLine.includes('meter') || lowerLine.includes('api')) {
          item.type = 'metered';
          item.billing_scheme = 'per_unit';
          item.usage_type = 'metered';
          item.aggregate_usage = 'sum';
        } else if (lowerLine.includes('month') || lowerLine.includes('subscription') || lowerLine.includes('recurring')) {
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
          confidence: 75,
          extraction_method: 'text_analysis'
        };

        data.push(item);
      }
    });

    return data;
  }
}

export const ocrService = new OCRService();
