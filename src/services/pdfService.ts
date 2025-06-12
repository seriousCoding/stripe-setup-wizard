
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFParseResult {
  text: string;
  numPages: number;
  metadata?: any;
  data?: any[];
}

class PDFService {
  async parsePDF(file: File): Promise<PDFParseResult> {
    try {
      console.log('Starting PDF parsing for:', file.name);
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      console.log('PDF loaded, pages:', pdf.numPages);
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
        console.log(`Processed page ${pageNum}/${pdf.numPages}`);
      }
      
      const metadata = await pdf.getMetadata();
      const extractedData = this.extractStructuredData(fullText);
      
      return {
        text: fullText.trim(),
        numPages: pdf.numPages,
        metadata: metadata.info,
        data: extractedData
      };
    } catch (error) {
      console.error('PDF parsing failed:', error);
      throw new Error(`PDF parsing failed: ${error}`);
    }
  }

  extractTabularData(text: string): any[] {
    return this.extractStructuredData(text);
  }

  private extractStructuredData(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim());
    const data: any[] = [];
    const pricePattern = /\$\d+\.?\d*/g;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Enhanced pattern matching for pricing data
      let parts = trimmedLine.split('\t');
      if (parts.length === 1) {
        parts = trimmedLine.split(/\s{2,}/);
      }
      if (parts.length === 1) {
        parts = trimmedLine.split(/\s+/);
      }

      parts = parts.filter(part => part.trim());

      if (parts.length >= 2 && pricePattern.test(trimmedLine)) {
        const prices = trimmedLine.match(pricePattern) || [];
        
        const item: any = {
          id: `pdf-${index}`,
          product: parts[0] || `Service ${index + 1}`,
          description: parts[0] || `Service ${index + 1}`,
          source: 'pdf',
          lineNumber: index + 1,
          originalLine: trimmedLine
        };

        // Detect meter name
        if (parts.length > 1 && parts[1] !== '0' && !parts[1].match(/^\$/)) {
          item.eventName = parts[1];
          item.meter_name = parts[1];
        }

        // Detect unit
        if (parts.length > 2 && parts[2] !== '0' && !parts[2].match(/^\$/)) {
          item.unit = parts[2];
          item.unit_label = parts[2];
        }

        // Extract pricing
        if (prices.length > 0) {
          const mainPrice = prices[prices.length - 1] || prices[0];
          item.price = parseFloat(mainPrice.replace('$', '')) || 0;
          item.unit_amount = Math.round(item.price * 100);
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
          source: 'pdf_parser',
          confidence: 80
        };

        data.push(item);
      }
    });

    return data;
  }
}

export const pdfService = new PDFService();
