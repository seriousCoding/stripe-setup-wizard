
import * as pdfjsLib from 'pdfjs-dist';

// Use a working CDN for the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.js';

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
    const numberPattern = /\d+\.?\d*/;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 3) return;

      // Split by various delimiters
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
        
        // Only process lines that seem to contain product/service information
        if (hasPrice || hasNumbers || parts.length >= 2) {
          const item: any = {
            id: `pdf-${index}`,
            product: parts[0] || `Service ${index + 1}`,
            description: parts[0] || `Service ${index + 1}`,
            source: 'pdf',
            lineNumber: index + 1,
            originalLine: trimmedLine
          };

          // Check for additional product details
          if (parts.length > 1) {
            item.details = parts.slice(1).join(' ');
          }

          // Extract pricing information
          if (hasPrice) {
            const mainPrice = prices[prices.length - 1] || prices[0];
            item.price = parseFloat(mainPrice.replace('$', '')) || 0;
            item.unit_amount = Math.round(item.price * 100);
          } else {
            item.price = 0;
            item.unit_amount = 0;
          }

          // Determine product type based on content
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
            source: 'pdf_parser',
            confidence: 75
          };

          data.push(item);
        }
      }
    });

    return data;
  }
}

export const pdfService = new PDFService();
