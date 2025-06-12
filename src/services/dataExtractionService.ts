
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ocrService } from './ocrService';
import { pdfService } from './pdfService';

export interface ExtractionResult {
  data: any[];
  confidence: number;
  method: string;
  extractedText?: string;
  preview?: string;
}

class DataExtractionService {
  async extractFromFile(file: File): Promise<ExtractionResult> {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    try {
      // Handle Excel files
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        return await this.extractFromExcel(file);
      }

      // Handle CSV files
      if (fileName.endsWith('.csv') || fileType === 'text/csv') {
        return await this.extractFromCSV(file);
      }

      // Handle JSON files
      if (fileName.endsWith('.json') || fileType === 'application/json') {
        return await this.extractFromJSON(file);
      }

      // Handle PDF files
      if (fileType === 'application/pdf') {
        return await this.extractFromPDF(file);
      }

      // Handle image files
      if (fileType.startsWith('image/')) {
        return await this.extractFromImage(file);
      }

      // Handle text files
      if (fileType === 'text/plain') {
        return await this.extractFromText(file);
      }

      throw new Error(`Unsupported file type: ${fileType}`);
    } catch (error: any) {
      console.error('Data extraction error:', error);
      throw error;
    }
  }

  private async extractFromExcel(file: File): Promise<ExtractionResult> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    
    if (!firstSheetName) {
      throw new Error('Excel file has no sheets');
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: false
    });
    
    if (jsonData.length === 0) {
      throw new Error('Excel file appears to be empty');
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];
    
    const data = rows
      .filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
      .map((row, index) => {
        const obj: any = { id: `excel-${index}` };
        headers.forEach((header, cellIndex) => {
          if (header && header.trim()) {
            obj[header.trim()] = row[cellIndex] || '';
          }
        });
        
        return this.normalizeDataItem(obj, index);
      });

    return {
      data,
      confidence: 95,
      method: 'excel_extraction'
    };
  }

  private async extractFromCSV(file: File): Promise<ExtractionResult> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (result) => {
          try {
            if (result.errors.length > 0) {
              console.warn('CSV parsing warnings:', result.errors);
            }

            let data = result.data as any[];
            
            if (data.length === 0) {
              throw new Error('CSV file is empty');
            }

            // Handle array format data
            const firstRow = data[0];
            if (Array.isArray(firstRow)) {
              const headers = firstRow.map((_, index) => `column_${index}`);
              data = data.slice(1).map((row: any[], index) => {
                const obj: any = { id: `csv-${index}` };
                headers.forEach((header, cellIndex) => {
                  obj[header] = row[cellIndex] || '';
                });
                return obj;
              });
            }

            const processedData = data
              .filter(row => row && Object.keys(row).length > 0)
              .map((row, index) => this.normalizeDataItem(row, index));

            resolve({
              data: processedData,
              confidence: 98,
              method: 'csv_extraction'
            });
          } catch (error: any) {
            reject(new Error(`CSV processing error: ${error.message}`));
          }
        },
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        error: (error) => reject(new Error(`CSV parsing failed: ${error.message}`))
      });
    });
  }

  private async extractFromJSON(file: File): Promise<ExtractionResult> {
    const text = await file.text();
    
    let jsonData;
    try {
      jsonData = JSON.parse(text);
    } catch (parseError) {
      throw new Error('Invalid JSON format');
    }
    
    let data: any[];
    if (Array.isArray(jsonData)) {
      data = jsonData;
    } else if (jsonData.data && Array.isArray(jsonData.data)) {
      data = jsonData.data;
    } else if (jsonData.products && Array.isArray(jsonData.products)) {
      data = jsonData.products;
    } else if (jsonData.items && Array.isArray(jsonData.items)) {
      data = jsonData.items;
    } else {
      data = [jsonData];
    }

    const processedData = data.map((item, index) => 
      this.normalizeDataItem({ ...item, id: item.id || `json-${index}` }, index)
    );

    return {
      data: processedData,
      confidence: 99,
      method: 'json_extraction'
    };
  }

  private async extractFromPDF(file: File): Promise<ExtractionResult> {
    const pdfResult = await pdfService.parsePDF(file);
    
    if (pdfResult.data && pdfResult.data.length > 0) {
      return {
        data: pdfResult.data,
        confidence: 80,
        method: 'pdf_extraction',
        extractedText: pdfResult.text
      };
    }

    // Fallback: create basic structure from text
    const data = [{
      id: 'pdf-content',
      product: `PDF Content from ${file.name}`,
      description: pdfResult.text.substring(0, 200) + (pdfResult.text.length > 200 ? '...' : ''),
      pages: pdfResult.numPages,
      extractedText: pdfResult.text,
      type: 'one_time',
      source: 'pdf_fallback'
    }];
    
    return {
      data,
      confidence: 40,
      method: 'pdf_text_extraction',
      extractedText: pdfResult.text
    };
  }

  private async extractFromImage(file: File): Promise<ExtractionResult> {
    const ocrResult = await ocrService.processImage(file);
    const preview = URL.createObjectURL(file);
    
    if (ocrResult.data && ocrResult.data.length > 0) {
      return {
        data: ocrResult.data,
        confidence: Math.round(ocrResult.confidence),
        method: 'image_ocr',
        extractedText: ocrResult.text,
        preview
      };
    }

    // Fallback processing
    const data = [{
      id: 'ocr-content',
      product: `OCR Text from ${file.name}`,
      description: ocrResult.text.substring(0, 300) + (ocrResult.text.length > 300 ? '...' : ''),
      confidence: ocrResult.confidence,
      fullText: ocrResult.text,
      type: 'one_time'
    }];

    return {
      data,
      confidence: Math.round(ocrResult.confidence),
      method: 'image_ocr_fallback',
      extractedText: ocrResult.text,
      preview
    };
  }

  private async extractFromText(file: File): Promise<ExtractionResult> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const data: any[] = [];
    const pricePattern = /\$\d+\.?\d*/g;
    const numberPattern = /\d+\.?\d*/;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 3) return;

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
        
        // Process lines that contain product information
        if (hasPrice || hasNumbers || parts.length >= 2) {
          const item: any = {
            id: `text-${index}`,
            product: parts[0] || `Service ${index + 1}`,
            description: parts[0] || `Service ${index + 1}`,
            source: 'text',
            lineNumber: index + 1,
            originalLine: trimmedLine
          };

          if (parts.length > 1) {
            item.details = parts.slice(1).join(' ');
          }

          if (hasPrice) {
            const mainPrice = prices[prices.length - 1] || prices[0];
            item.price = parseFloat(mainPrice.replace('$', '')) || 0;
            item.unit_amount = Math.round(item.price * 100);
          } else {
            item.price = 0;
            item.unit_amount = 0;
          }

          // Determine type
          const lowerLine = trimmedLine.toLowerCase();
          if (lowerLine.includes('per') || lowerLine.includes('usage') || lowerLine.includes('meter')) {
            item.type = 'metered';
          } else if (lowerLine.includes('month') || lowerLine.includes('subscription')) {
            item.type = 'recurring';
            item.interval = 'month';
          } else {
            item.type = 'one_time';
          }

          item.currency = 'usd';
          item.metadata = {
            auto_detected_type: item.type,
            source: 'text_parser',
            confidence: 85
          };

          data.push(item);
        }
      }
    });

    return {
      data,
      confidence: 85,
      method: 'text_extraction',
      extractedText: text
    };
  }

  private normalizeDataItem(item: any, index: number): any {
    const normalized = { ...item };

    // Ensure product name
    normalized.product = normalized.product || normalized.name || normalized['Metric Description'] || normalized.description || `Product ${index + 1}`;
    
    // Handle pricing
    const priceField = normalized.price || normalized['Per Unit Rate (USD)'] || normalized.amount || normalized.unit_amount;
    if (priceField) {
      normalized.price = typeof priceField === 'string' ? 
        parseFloat(priceField.replace(/[$,]/g, '')) : parseFloat(priceField);
    }
    normalized.price = normalized.price || 0;
    normalized.unit_amount = Math.round(normalized.price * 100);

    // Determine product type based on content
    const productText = `${normalized.product} ${normalized.description || ''} ${normalized.details || ''}`.toLowerCase();
    
    if (productText.includes('per') || productText.includes('usage') || productText.includes('meter') || productText.includes('api call')) {
      normalized.type = 'metered';
      normalized.billing_scheme = 'per_unit';
      normalized.usage_type = 'metered';
      normalized.aggregate_usage = 'sum';
    } else if (productText.includes('month') || productText.includes('subscription') || productText.includes('recurring')) {
      normalized.type = 'recurring';
      normalized.billing_scheme = 'per_unit';
      normalized.interval = 'month';
    } else {
      normalized.type = 'one_time';
    }

    normalized.currency = normalized.currency || 'usd';
    
    return normalized;
  }
}

export const dataExtractionService = new DataExtractionService();
