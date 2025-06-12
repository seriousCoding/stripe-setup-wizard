
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

    console.log('Processing file:', fileName, 'Type:', fileType, 'Size:', file.size);

    try {
      // Handle Excel files
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileType.includes('spreadsheet')) {
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
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await this.extractFromPDF(file);
      }

      // Handle image files
      if (fileType.startsWith('image/')) {
        return await this.extractFromImage(file);
      }

      // Handle text files
      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await this.extractFromText(file);
      }

      throw new Error(`Unsupported file type: ${fileType || 'unknown'}. Supported formats: Excel (.xlsx, .xls), CSV, JSON, PDF, Images, Text files.`);
    } catch (error: any) {
      console.error('Data extraction error:', error);
      throw error;
    }
  }

  private async extractFromExcel(file: File): Promise<ExtractionResult> {
    try {
      console.log('Processing Excel file...');
      
      if (file.size === 0) {
        throw new Error('Excel file is empty');
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: true,
        cellStyles: false
      });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel file has no sheets');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        throw new Error('Cannot read the first sheet of the Excel file');
      }

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false,
        raw: false
      });
      
      if (!jsonData || jsonData.length === 0) {
        throw new Error('Excel file appears to be empty or contains no readable data');
      }

      console.log('Excel data extracted, rows:', jsonData.length);

      // Handle both header and non-header formats
      let headers: string[] = [];
      let dataRows: any[][] = [];

      if (jsonData.length > 0) {
        const firstRow = jsonData[0] as any[];
        
        // Check if first row looks like headers (contains strings)
        const hasStringHeaders = firstRow.some(cell => 
          typeof cell === 'string' && cell.trim().length > 0 && !/^\d+\.?\d*$/.test(cell.trim())
        );

        if (hasStringHeaders && jsonData.length > 1) {
          headers = firstRow.map(cell => String(cell || '').trim()).filter(h => h);
          dataRows = jsonData.slice(1) as any[][];
        } else {
          // Generate generic headers
          headers = firstRow.map((_, index) => `column_${index + 1}`);
          dataRows = jsonData as any[][];
        }
      }

      const data = dataRows
        .filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
        .map((row, index) => {
          const obj: any = { id: `excel-${index}` };
          
          headers.forEach((header, cellIndex) => {
            if (header && header.trim()) {
              const cellValue = row[cellIndex];
              obj[header] = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
            }
          });
          
          return this.normalizeDataItem(obj, index);
        });

      if (data.length === 0) {
        throw new Error('No valid data rows found in Excel file');
      }

      console.log('Excel processing complete, extracted items:', data.length);

      return {
        data,
        confidence: 95,
        method: 'excel_extraction'
      };
    } catch (error: any) {
      console.error('Excel extraction failed:', error);
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  }

  private async extractFromCSV(file: File): Promise<ExtractionResult> {
    try {
      console.log('Processing CSV file...');
      
      if (file.size === 0) {
        throw new Error('CSV file is empty');
      }

      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          complete: (result) => {
            try {
              console.log('CSV parsing complete, errors:', result.errors.length);
              
              if (result.errors.length > 0) {
                const criticalErrors = result.errors.filter(error => error.type === 'Delimiter');
                if (criticalErrors.length > 0) {
                  console.warn('CSV parsing errors:', result.errors);
                }
              }

              let data = result.data as any[];
              
              if (!data || data.length === 0) {
                throw new Error('CSV file is empty or contains no data');
              }

              // Filter out completely empty rows
              data = data.filter(row => {
                if (Array.isArray(row)) {
                  return row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
                } else if (typeof row === 'object' && row !== null) {
                  return Object.values(row).some(value => value !== null && value !== undefined && String(value).trim() !== '');
                }
                return false;
              });

              if (data.length === 0) {
                throw new Error('CSV file contains no valid data rows');
              }

              // Handle array format data (when header: false or no headers detected)
              if (data.length > 0 && Array.isArray(data[0])) {
                const headers = data[0].map((_, index) => `column_${index + 1}`);
                data = data.slice(1).map((row: any[], index) => {
                  const obj: any = { id: `csv-${index}` };
                  headers.forEach((header, cellIndex) => {
                    obj[header] = row[cellIndex] !== null && row[cellIndex] !== undefined ? String(row[cellIndex]).trim() : '';
                  });
                  return obj;
                });
              }

              const processedData = data
                .filter(row => row && typeof row === 'object' && Object.keys(row).length > 0)
                .map((row, index) => this.normalizeDataItem(row, index));

              if (processedData.length === 0) {
                throw new Error('No valid data could be extracted from CSV file');
              }

              console.log('CSV processing complete, extracted items:', processedData.length);

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
          transformHeader: (header) => header ? header.trim() : '',
          transform: (value) => value ? value.trim() : '',
          error: (error) => reject(new Error(`CSV parsing failed: ${error.message}`))
        });
      });
    } catch (error: any) {
      console.error('CSV extraction failed:', error);
      throw new Error(`CSV processing failed: ${error.message}`);
    }
  }

  private async extractFromJSON(file: File): Promise<ExtractionResult> {
    try {
      console.log('Processing JSON file...');
      
      if (file.size === 0) {
        throw new Error('JSON file is empty');
      }

      const text = await file.text();
      
      if (!text.trim()) {
        throw new Error('JSON file contains no content');
      }

      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch (parseError: any) {
        throw new Error(`Invalid JSON format: ${parseError.message}`);
      }
      
      let data: any[];
      
      // Handle different JSON structures
      if (Array.isArray(jsonData)) {
        data = jsonData;
      } else if (jsonData && typeof jsonData === 'object') {
        // Try common array property names
        if (jsonData.data && Array.isArray(jsonData.data)) {
          data = jsonData.data;
        } else if (jsonData.products && Array.isArray(jsonData.products)) {
          data = jsonData.products;
        } else if (jsonData.items && Array.isArray(jsonData.items)) {
          data = jsonData.items;
        } else if (jsonData.services && Array.isArray(jsonData.services)) {
          data = jsonData.services;
        } else if (jsonData.records && Array.isArray(jsonData.records)) {
          data = jsonData.records;
        } else {
          // Single object, convert to array
          data = [jsonData];
        }
      } else {
        throw new Error('JSON data is not in a supported format');
      }

      if (!data || data.length === 0) {
        throw new Error('JSON file contains no data items');
      }

      const processedData = data
        .filter(item => item && typeof item === 'object')
        .map((item, index) => 
          this.normalizeDataItem({ ...item, id: item.id || `json-${index}` }, index)
        );

      if (processedData.length === 0) {
        throw new Error('No valid data objects found in JSON file');
      }

      console.log('JSON processing complete, extracted items:', processedData.length);

      return {
        data: processedData,
        confidence: 99,
        method: 'json_extraction'
      };
    } catch (error: any) {
      console.error('JSON extraction failed:', error);
      throw new Error(`JSON processing failed: ${error.message}`);
    }
  }

  private async extractFromPDF(file: File): Promise<ExtractionResult> {
    try {
      console.log('Processing PDF file...');
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
        source: 'pdf_fallback',
        price: 0,
        unit_amount: 0,
        currency: 'usd'
      }];
      
      return {
        data,
        confidence: 40,
        method: 'pdf_text_extraction',
        extractedText: pdfResult.text
      };
    } catch (error: any) {
      console.error('PDF extraction failed:', error);
      throw error;
    }
  }

  private async extractFromImage(file: File): Promise<ExtractionResult> {
    try {
      console.log('Processing image file...');
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
        type: 'one_time',
        price: 0,
        unit_amount: 0,
        currency: 'usd'
      }];

      return {
        data,
        confidence: Math.round(ocrResult.confidence),
        method: 'image_ocr_fallback',
        extractedText: ocrResult.text,
        preview
      };
    } catch (error: any) {
      console.error('Image extraction failed:', error);
      throw error;
    }
  }

  private async extractFromText(file: File): Promise<ExtractionResult> {
    try {
      console.log('Processing text file...');
      
      if (file.size === 0) {
        throw new Error('Text file is empty');
      }

      const text = await file.text();
      
      if (!text.trim()) {
        throw new Error('Text file contains no content');
      }

      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 2);
      
      const data: any[] = [];
      const pricePattern = /\$?\d+\.?\d*/g;
      const currencyPattern = /\$\d+(?:\.\d{2})?/g;
      
      lines.forEach((line, index) => {
        if (line.length < 5) return;

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

        const prices = line.match(currencyPattern) || [];
        const numbers = line.match(pricePattern) || [];
        const hasPrice = prices.length > 0;
        const hasNumbers = numbers.length > 0;
        
        // Process lines that contain product information
        const isProductLine = hasPrice || 
                             hasNumbers || 
                             parts.length >= 2 ||
                             line.toLowerCase().includes('service') ||
                             line.toLowerCase().includes('product');

        if (isProductLine) {
          const item: any = {
            id: `text-${index}`,
            product: parts[0] || `Service ${index + 1}`,
            description: parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || `Service ${index + 1}`,
            source: 'text',
            lineNumber: index + 1,
            originalLine: line
          };

          if (hasPrice) {
            const mainPrice = prices[0];
            const numericPrice = parseFloat(mainPrice.replace(/[$,]/g, ''));
            if (!isNaN(numericPrice)) {
              item.price = numericPrice;
              item.unit_amount = Math.round(numericPrice * 100);
            }
          } else if (hasNumbers) {
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

          // Determine type
          const lowerLine = line.toLowerCase();
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
            source: 'text_parser',
            confidence: 85
          };

          data.push(item);
        }
      });

      if (data.length === 0) {
        throw new Error('No structured data could be extracted from text file');
      }

      return {
        data,
        confidence: 85,
        method: 'text_extraction',
        extractedText: text
      };
    } catch (error: any) {
      console.error('Text extraction failed:', error);
      throw error;
    }
  }

  private normalizeDataItem(item: any, index: number): any {
    const normalized = { ...item };

    // Ensure product name
    normalized.product = normalized.product || 
                        normalized.name || 
                        normalized['Metric Description'] || 
                        normalized.description || 
                        normalized.service ||
                        `Product ${index + 1}`;
    
    // Handle pricing with better validation
    const priceFields = [
      normalized.price,
      normalized['Per Unit Rate (USD)'],
      normalized.amount,
      normalized.unit_amount,
      normalized.cost,
      normalized.rate
    ];

    let price = 0;
    for (const field of priceFields) {
      if (field !== undefined && field !== null && field !== '') {
        const numericPrice = typeof field === 'string' ? 
          parseFloat(field.replace(/[$,]/g, '')) : parseFloat(field);
        if (!isNaN(numericPrice) && numericPrice >= 0) {
          price = numericPrice;
          break;
        }
      }
    }

    normalized.price = price;
    normalized.unit_amount = Math.round(price * 100);

    // Determine product type based on content with better logic
    const searchText = `${normalized.product} ${normalized.description || ''} ${normalized.details || ''}`.toLowerCase();
    
    if (searchText.includes('per') || searchText.includes('usage') || searchText.includes('meter') || 
        searchText.includes('api call') || searchText.includes('request') || searchText.includes('transaction')) {
      normalized.type = 'metered';
      normalized.billing_scheme = 'per_unit';
      normalized.usage_type = 'metered';
      normalized.aggregate_usage = 'sum';
    } else if (searchText.includes('month') || searchText.includes('subscription') || 
               searchText.includes('recurring') || searchText.includes('annual')) {
      normalized.type = 'recurring';
      normalized.billing_scheme = 'per_unit';
      normalized.interval = searchText.includes('annual') ? 'year' : 'month';
    } else {
      normalized.type = 'one_time';
    }

    normalized.currency = normalized.currency || 'usd';
    
    // Ensure metadata exists
    if (!normalized.metadata) {
      normalized.metadata = {};
    }
    
    normalized.metadata = {
      ...normalized.metadata,
      auto_detected_type: normalized.type,
      extraction_confidence: 85
    };
    
    return normalized;
  }
}

export const dataExtractionService = new DataExtractionService();
