// Clean PDF text extraction with hard guards against PDF internals
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export type ExtractResult = {
  pages: string[];
  totalChars: number;
  source: "pdfjs" | "ocr";
};

/**
 * HARD GUARD - Throws if PDF internals are detected
 * This prevents garbage from ever reaching the parser
 */
function assertNoPdfGarbage(text: string): void {
  const forbidden = [
    "%PDF-",
    " obj",
    "endobj",
    "/Creator",
    "/Producer",
    "/ModDate",
    "/CreationDate",
    "<<",
    ">>"
  ];

  for (const token of forbidden) {
    if (text.includes(token)) {
      throw new Error(
        "PDF internals detected. Text extraction failed. Aborting parsing."
      );
    }
  }
}

/**
 * Extract clean, readable text from a PDF file
 * Returns only human-readable content, guaranteed garbage-free
 */
export async function extractPdfSyllabus(
  file: File,
  onProgress?: (msg: string) => void
): Promise<ExtractResult> {
  onProgress?.("Reading document…");

  // Read file as ArrayBuffer - NEVER as text
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  let charCount = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Reading page ${i} of ${pdf.numPages}…`);

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText.length > 0) {
      charCount += pageText.length;
      pages.push(pageText);
    }
  }

  // HARD BLOCK: PDF internals must NEVER pass
  const joined = pages.join(" ");
  assertNoPdfGarbage(joined);

  onProgress?.("Extraction complete");

  return {
    pages,
    totalChars: charCount,
    source: "pdfjs"
  };
}

/**
 * Extract text using OCR (Tesseract.js) - fallback for scanned PDFs
 */
export async function extractViaOCR(
  file: File,
  onProgress?: (msg: string) => void
): Promise<ExtractResult> {
  onProgress?.("Starting OCR extraction…");
  
  // Dynamic import to avoid bundling if not needed
  const { createWorker } = await import('tesseract.js');
  
  const worker = await createWorker('eng');
  
  try {
    onProgress?.("Processing with OCR…");
    const { data: { text } } = await worker.recognize(file);
    
    const lines = text
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 4);
    
    const joined = lines.join(" ");
    
    // Apply same garbage check to OCR output
    assertNoPdfGarbage(joined);
    
    onProgress?.("OCR complete");
    
    return {
      pages: lines,
      totalChars: joined.length,
      source: "ocr"
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Check if OCR is needed based on extraction quality
 */
export function needsOCR(result: ExtractResult): boolean {
  // If less than 200 chars total, probably needs OCR
  return result.totalChars < 200;
}

/**
 * Parsed input format - only clean data goes to parser
 */
export type ParsedInput = {
  pages: string[];
  source: "pdfjs" | "ocr";
};

/**
 * Main extraction function with automatic OCR fallback
 */
export async function extractSyllabusFromPdf(
  file: File,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; data?: ParsedInput; error?: string }> {
  try {
    // First try pdf.js extraction
    const result = await extractPdfSyllabus(file, onProgress);
    
    // Check if OCR is needed
    if (needsOCR(result)) {
      onProgress?.("Low text quality detected, trying OCR…");
      const ocrResult = await extractViaOCR(file, onProgress);
      
      return {
        success: true,
        data: {
          pages: ocrResult.pages,
          source: ocrResult.source
        }
      };
    }
    
    return {
      success: true,
      data: {
        pages: result.pages,
        source: result.source
      }
    };
  } catch (error: any) {
    // If pdf.js fails with garbage detection, try OCR
    if (error.message?.includes("PDF internals detected")) {
      try {
        onProgress?.("Text extraction failed, trying OCR…");
        const ocrResult = await extractViaOCR(file, onProgress);
        
        return {
          success: true,
          data: {
            pages: ocrResult.pages,
            source: ocrResult.source
          }
        };
      } catch (ocrError: any) {
        return {
          success: false,
          error: ocrError.message || "OCR extraction also failed"
        };
      }
    }
    
    return {
      success: false,
      error: error.message || "Failed to extract text from PDF"
    };
  }
}
