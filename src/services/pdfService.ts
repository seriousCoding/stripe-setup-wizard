
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
      
      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error('File is not a valid PDF');
      }

      // Check file size (limit to 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('PDF file is too large (max 50MB)');
      }
      
      const arrayBuffer = await file.arrayBuffer();
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('PDF file is empty');
      }

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      console.log('PDF loaded, pages:', pdf.numPages);
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => {
              if (item && typeof item.str === 'string') {
                return item.str;
              }
              return '';
            })
            .filter(str => str.trim().length > 0)
            .join(' ');
          
          if (pageText.trim()) {
            fullText += pageText + '\n';
          }
          
          console.log(`Processed page ${pageNum}/${pdf.numPages}`);
        } catch (pageError) {
          console.warn(`Error processing page ${pageNum}:`, pageError);
          // Continue with other pages
        }
      }
      
      if (!fullText.trim()) {
        throw new Error('No text content found in PDF');
      }

      let metadata;
      try {
        const metadataResult = await pdf.getMetadata();
        metadata = metadataResult.info;
      } catch (metadataError) {
        console.warn('Could not extract metadata:', metadataError);
        metadata = {};
      }

      const extractedData = this.extractStructuredData(fullText);
      
      return {
        text: fullText.trim(),
        numPages: pdf.numPages,
        metadata,
        data: extractedData
      };
    } catch (error: any) {
      console.error('PDF parsing failed:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('Invalid PDF')) {
        throw new Error('The uploaded file is not a valid PDF document');
      } else if (error.message?.includes('password')) {
        throw new Error('This PDF is password protected and cannot be processed');
      } else if (error.message?.includes('corrupted')) {
        throw new Error('The PDF file appears to be corrupted');
      } else {
        throw new Error(`PDF processing failed: ${error.message || 'Unknown error'}`);
      }
    }
  }

  extractTabularData(text: string): any[] {
    return this.extractStructuredData(text);
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
    
    lines.forEach((line, index) => {
      // Skip very short lines or lines that are likely headers/footers
      if (line.length < 5) return;

      // Split by various delimiters
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

      // Look for pricing information
      const prices = line.match(currencyPattern) || [];
      const numbers = line.match(pricePattern) || [];
      const hasPrice = prices.length > 0;
      const hasNumbers = numbers.length > 0;
      
      // Determine if this line contains product/service information
      const isProductLine = hasPrice || 
                           hasNumbers || 
                           parts.length >= 2 ||
                           line.toLowerCase().includes('service') ||
                           line.toLowerCase().includes('product') ||
                           line.toLowerCase().includes('plan') ||
                           line.toLowerCase().includes('subscription');

      if (isProductLine) {
        const productName = parts[0] || `Service ${index + 1}`;
        
        const item: any = {
          id: `pdf-${index}`,
          product: productName,
          description: parts.length > 1 ? parts.slice(1).join(' ') : productName,
          source: 'pdf',
          lineNumber: index + 1,
          originalLine: line,
          rawParts: parts
        };

        // Extract pricing information
        if (hasPrice) {
          const mainPrice = prices[0];
          const numericPrice = parseFloat(mainPrice.replace(/[$,]/g, ''));
          if (!isNaN(numericPrice)) {
            item.price = numericPrice;
            item.unit_amount = Math.round(numericPrice * 100);
          }
        } else if (hasNumbers && numbers.length > 0) {
          const numericValue = parseFloat(numbers[numbers.length - 1]);
          if (!isNaN(numericValue) && numericValue > 0) {
            item.price = numericValue;
            item.unit_amount = Math.round(numericValue * 100);
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
          source: 'pdf_parser',
          confidence: 70,
          extraction_method: 'text_analysis'
        };

        data.push(item);
      }
    });

    return data;
  }
}

export const pdfService = new PDFService();
