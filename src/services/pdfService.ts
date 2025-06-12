
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

      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: false
      }).promise;
      
      console.log('PDF loaded, pages:', pdf.numPages);
      
      let fullText = '';
      const allTextItems: any[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageTextItems = textContent.items.filter((item: any) => 
            item && typeof item.str === 'string' && item.str.trim().length > 0
          );
          
          allTextItems.push(...pageTextItems);
          
          const pageText = pageTextItems
            .map((item: any) => item.str)
            .join(' ');
          
          if (pageText.trim()) {
            fullText += pageText + '\n';
          }
          
          console.log(`Processed page ${pageNum}/${pdf.numPages} - ${pageTextItems.length} text items`);
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

      // Enhanced data extraction using both structured text and positioning
      const extractedData = this.extractStructuredDataFromPDF(fullText, allTextItems);
      
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
    return this.extractStructuredDataFromPDF(text, []);
  }

  private extractStructuredDataFromPDF(text: string, textItems: any[] = []): any[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 2);
    
    const data: any[] = [];
    const pricePattern = /\$?\d+\.?\d*/g;
    const currencyPattern = /\$\d+(?:\.\d{2})?/g;
    
    // Try to detect table-like structures using positioning if available
    if (textItems.length > 0) {
      const tableData = this.extractTableDataFromPositions(textItems);
      if (tableData.length > 0) {
        return tableData;
      }
    }
    
    lines.forEach((line, index) => {
      // Skip very short lines or lines that are likely headers/footers
      if (line.length < 5) return;

      // Enhanced delimiter detection
      let parts = this.splitLineIntelligently(line);

      // Look for pricing information
      const prices = line.match(currencyPattern) || [];
      const numbers = line.match(pricePattern) || [];
      const hasPrice = prices.length > 0;
      const hasNumbers = numbers.length > 0;
      
      // Enhanced product line detection
      const isProductLine = this.isLikelyProductLine(line, hasPrice, hasNumbers, parts.length);

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

        // Enhanced price extraction
        this.extractPriceInformation(item, line, prices, numbers);

        // Enhanced type detection
        this.detectProductType(item, line);

        item.currency = 'usd';
        item.metadata = {
          auto_detected_type: item.type,
          source: 'pdf_parser',
          confidence: 80,
          extraction_method: 'enhanced_text_analysis'
        };

        data.push(item);
      }
    });

    return data;
  }

  private splitLineIntelligently(line: string): string[] {
    // Try multiple splitting strategies
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
      // Split on price patterns
      parts = line.split(/(?=\$\d)/).filter(part => part.trim());
    }
    if (parts.length === 1) {
      // Split on common service patterns
      parts = line.split(/(?=\s+\d+\.\d+|\s+\d+\s)/).filter(part => part.trim());
    }
    
    return parts;
  }

  private isLikelyProductLine(line: string, hasPrice: boolean, hasNumbers: boolean, partsLength: number): boolean {
    const lowerLine = line.toLowerCase();
    
    // Skip common header/footer patterns
    if (lowerLine.includes('page') || lowerLine.includes('total') || lowerLine.match(/^\d+$/) || 
        lowerLine.includes('continued') || lowerLine.includes('footer')) {
      return false;
    }
    
    return hasPrice || 
           hasNumbers || 
           partsLength >= 2 ||
           lowerLine.includes('service') ||
           lowerLine.includes('product') ||
           lowerLine.includes('plan') ||
           lowerLine.includes('subscription') ||
           lowerLine.includes('api') ||
           lowerLine.includes('usage') ||
           lowerLine.includes('fee') ||
           lowerLine.includes('cost') ||
           lowerLine.includes('rate');
  }

  private extractPriceInformation(item: any, line: string, prices: string[], numbers: string[]): void {
    if (prices.length > 0) {
      const mainPrice = prices[0];
      const numericPrice = parseFloat(mainPrice.replace(/[$,]/g, ''));
      if (!isNaN(numericPrice)) {
        item.price = numericPrice;
        item.unit_amount = Math.round(numericPrice * 100);
      }
    } else if (numbers.length > 0) {
      // Enhanced number filtering for prices
      const validNumbers = numbers
        .map(n => parseFloat(n))
        .filter(n => !isNaN(n) && n > 0 && n < 1000000)
        .filter(n => {
          // Filter out likely page numbers, years, etc.
          const str = n.toString();
          return !(str.length === 4 && n > 1900 && n < 2100) && // Years
                 !(str.length <= 2 && n < 100); // Page numbers
        });
      
      if (validNumbers.length > 0) {
        item.price = validNumbers[validNumbers.length - 1];
        item.unit_amount = Math.round(item.price * 100);
      }
    }

    if (!item.price) {
      item.price = 0;
      item.unit_amount = 0;
    }
  }

  private detectProductType(item: any, line: string): void {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('per') || lowerLine.includes('usage') || 
        lowerLine.includes('meter') || lowerLine.includes('api') ||
        lowerLine.includes('call') || lowerLine.includes('request')) {
      item.type = 'metered';
      item.billing_scheme = 'per_unit';
      item.usage_type = 'metered';
      item.aggregate_usage = 'sum';
    } else if (lowerLine.includes('month') || lowerLine.includes('subscription') || 
               lowerLine.includes('recurring') || lowerLine.includes('annual')) {
      item.type = 'recurring';
      item.billing_scheme = 'per_unit';
      item.interval = lowerLine.includes('annual') || lowerLine.includes('year') ? 'year' : 'month';
    } else {
      item.type = 'one_time';
    }
  }

  private extractTableDataFromPositions(textItems: any[]): any[] {
    // Group text items by approximate Y position to identify rows
    const rows = new Map<number, any[]>();
    const tolerance = 5; // Pixel tolerance for same row
    
    textItems.forEach(item => {
      if (!item.transform || item.transform.length < 6) return;
      
      const y = Math.round(item.transform[5] / tolerance) * tolerance;
      if (!rows.has(y)) {
        rows.set(y, []);
      }
      rows.get(y)!.push(item);
    });
    
    // Sort rows by Y position and process each row
    const sortedRows = Array.from(rows.entries())
      .sort(([a], [b]) => b - a) // PDF coordinates are bottom-up
      .map(([_, items]) => items.sort((a, b) => a.transform[4] - b.transform[4])); // Sort by X position
    
    const data: any[] = [];
    
    sortedRows.forEach((rowItems, index) => {
      const rowText = rowItems.map(item => item.str).join(' ').trim();
      
      if (rowText.length < 5) return;
      
      // Try to identify columns by significant gaps in X positions
      const columns = this.identifyColumns(rowItems);
      
      if (columns.length >= 2) {
        const productName = columns[0];
        const priceText = columns[columns.length - 1];
        
        const priceMatch = priceText.match(/\$?(\d+\.?\d*)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          
          if (!isNaN(price) && price > 0) {
            data.push({
              id: `pdf-table-${index}`,
              product: productName,
              description: columns.length > 2 ? columns.slice(1, -1).join(' ') : productName,
              price: price,
              unit_amount: Math.round(price * 100),
              type: 'one_time',
              currency: 'usd',
              source: 'pdf_table',
              metadata: {
                extraction_method: 'position_based',
                confidence: 85
              }
            });
          }
        }
      }
    });
    
    return data;
  }

  private identifyColumns(items: any[]): string[] {
    if (items.length === 0) return [];
    
    const columns: string[] = [];
    let currentColumn = '';
    let lastX = items[0].transform[4];
    const gapThreshold = 20; // Minimum gap to consider new column
    
    items.forEach(item => {
      const x = item.transform[4];
      const gap = x - lastX;
      
      if (gap > gapThreshold && currentColumn.trim()) {
        columns.push(currentColumn.trim());
        currentColumn = item.str;
      } else {
        currentColumn += (currentColumn ? ' ' : '') + item.str;
      }
      
      lastX = x + (item.width || 0);
    });
    
    if (currentColumn.trim()) {
      columns.push(currentColumn.trim());
    }
    
    return columns;
  }
}

export const pdfService = new PDFService();
