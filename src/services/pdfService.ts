
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFParseResult {
  text: string;
  numPages: number;
  metadata?: any;
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
      
      return {
        text: fullText.trim(),
        numPages: pdf.numPages,
        metadata: metadata.info
      };
    } catch (error) {
      console.error('PDF parsing failed:', error);
      throw new Error(`PDF parsing failed: ${error}`);
    }
  }

  extractTabularData(text: string): any[] {
    // Simple heuristic to extract tabular data from PDF text
    const lines = text.split('\n').filter(line => line.trim());
    const data: any[] = [];
    
    // Look for patterns that might be pricing tables
    const pricePattern = /\$\d+\.?\d*/;
    const quantityPattern = /\d+/;
    
    lines.forEach((line, index) => {
      if (pricePattern.test(line)) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const item = {
            description: parts.slice(0, -2).join(' '),
            quantity: quantityPattern.exec(line)?.[0] || '1',
            price: pricePattern.exec(line)?.[0] || '$0.00',
            lineNumber: index + 1
          };
          data.push(item);
        }
      }
    });
    
    return data;
  }
}

export const pdfService = new PDFService();
