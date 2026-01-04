// PDF text extraction using pdf.js
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedPage {
  pageNum: number;
  text: string;
}

/**
 * Extract readable text from a PDF file
 * Returns array of page texts, only human-readable content
 */
export async function extractPdfText(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    const pagesText: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText.length > 0) {
        pagesText.push(pageText);
      }
    }

    return pagesText;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Sanitize extracted text - remove PDF artifacts
 */
function sanitizeLine(line: string): string {
  return line
    .replace(/%PDF-.*/g, "")
    .replace(/obj|endobj/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\d+ \d+ R/g, "")
    .replace(/stream\s*endstream/g, "")
    .trim();
}

/**
 * Check if a line is valid content
 */
function isValidLine(line: string): boolean {
  return (
    line.length > 4 &&
    !line.match(/(Creator|Producer|SkiaPDF|Mozilla|Adobe|Acrobat)/i) &&
    !line.match(/^[\d\s]+$/) &&
    !line.match(/^\s*$/)
  );
}

export interface ParsedPhase {
  name: string;
  modules: ParsedModule[];
}

export interface ParsedModule {
  name: string;
  topics: ParsedTopic[];
}

export interface ParsedTopic {
  name: string;
  hours: number;
  selected: boolean;
}

export interface SyllabusStructure {
  phases: ParsedPhase[];
  modules: ParsedModule[];
  flatTopics: ParsedTopic[];
  totalTopics: number;
  totalHours: number;
}

/**
 * Detect syllabus structure using strict regex patterns
 */
export function detectSyllabusStructure(lines: string[]): SyllabusStructure {
  const phases: ParsedPhase[] = [];
  const modules: ParsedModule[] = [];
  const flatTopics: ParsedTopic[] = [];
  
  let currentPhase: ParsedPhase | null = null;
  let currentModule: ParsedModule | null = null;

  // Regex patterns for structure detection
  const phasePattern = /^(PHASE|PART)\s+(\d+|[IVX]+)[:\-]?\s*(.*)$/i;
  const modulePattern = /^(MODULE|CHAPTER|UNIT)\s+(\d+)[:\-]?\s*(.*)$/i;
  const numberedModulePattern = /^(\d+)\.\s+(.+)$/;
  const topicPattern = /^[-•–*]\s+(.+)$/;
  const numberedTopicPattern = /^(\d+\.\d+)\s+(.+)$/;

  for (const rawLine of lines) {
    const line = sanitizeLine(rawLine);
    if (!isValidLine(line)) continue;

    // Check for Phase/Part header
    const phaseMatch = line.match(phasePattern);
    if (phaseMatch) {
      if (currentModule && currentModule.topics.length > 0) {
        if (currentPhase) {
          currentPhase.modules.push(currentModule);
        } else {
          modules.push(currentModule);
        }
      }
      if (currentPhase && currentPhase.modules.length > 0) {
        phases.push(currentPhase);
      }
      currentPhase = {
        name: phaseMatch[3].trim() || `Phase ${phaseMatch[2]}`,
        modules: []
      };
      currentModule = null;
      continue;
    }

    // Check for Module/Chapter header
    const moduleMatch = line.match(modulePattern) || line.match(numberedModulePattern);
    if (moduleMatch) {
      if (currentModule && currentModule.topics.length > 0) {
        if (currentPhase) {
          currentPhase.modules.push(currentModule);
        } else {
          modules.push(currentModule);
        }
      }
      const moduleName = moduleMatch[3] || moduleMatch[2] || `Module ${moduleMatch[1] || moduleMatch[0]}`;
      currentModule = {
        name: moduleName.trim(),
        topics: []
      };
      continue;
    }

    // Check for topic (bullet or numbered)
    const topicMatch = line.match(topicPattern) || line.match(numberedTopicPattern);
    if (topicMatch && currentModule) {
      const topicText = topicMatch[2] || topicMatch[1];
      
      // Extract hours if present
      const hoursMatch = topicText.match(/[-–]\s*(\d+(?:\.\d+)?)\s*h(?:ours?)?/i) ||
                         topicText.match(/\((\d+(?:\.\d+)?)\s*h(?:ours?)?\)/i) ||
                         topicText.match(/:\s*(\d+(?:\.\d+)?)\s*h(?:ours?)?$/i);
      
      const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 1;
      const topicName = topicText
        .replace(/[-–]\s*\d+(?:\.\d+)?\s*h(?:ours?)?/i, "")
        .replace(/\(\d+(?:\.\d+)?\s*h(?:ours?)?\)/i, "")
        .replace(/:\s*\d+(?:\.\d+)?\s*h(?:ours?)?$/i, "")
        .trim();

      if (topicName.length > 1) {
        const topic = { name: topicName, hours, selected: true };
        currentModule.topics.push(topic);
        flatTopics.push(topic);
      }
      continue;
    }

    // If no structure matched but we have a current module, treat as topic
    if (currentModule && line.length > 3) {
      const topic = { name: line, hours: 1, selected: true };
      currentModule.topics.push(topic);
      flatTopics.push(topic);
    }
  }

  // Add remaining module/phase
  if (currentModule && currentModule.topics.length > 0) {
    if (currentPhase) {
      currentPhase.modules.push(currentModule);
    } else {
      modules.push(currentModule);
    }
  }
  if (currentPhase && currentPhase.modules.length > 0) {
    phases.push(currentPhase);
  }

  const totalTopics = flatTopics.filter(t => t.selected).length;
  const totalHours = flatTopics.filter(t => t.selected).reduce((sum, t) => sum + t.hours, 0);

  return {
    phases,
    modules,
    flatTopics,
    totalTopics,
    totalHours
  };
}

/**
 * Check if OCR is needed (text extraction insufficient)
 */
export function needsOCR(fullText: string): boolean {
  const totalChars = fullText.length;
  
  // If less than 200 chars total, probably needs OCR
  if (totalChars < 200) return true;
  
  // If no module/phase patterns detected, may need OCR
  const hasStructure = 
    /^(PHASE|PART|MODULE|CHAPTER|UNIT)\s+\d/im.test(fullText) ||
    /^\d+\.\s+/m.test(fullText);
  
  return !hasStructure && totalChars < 500;
}

/**
 * Extract text using OCR (Tesseract.js)
 */
export async function extractViaOCR(file: File): Promise<string[]> {
  // Dynamic import to avoid bundling if not needed
  const { createWorker } = await import('tesseract.js');
  
  const worker = await createWorker('eng');
  
  try {
    const { data: { text } } = await worker.recognize(file);
    return text.split("\n").filter(line => line.trim().length > 0);
  } finally {
    await worker.terminate();
  }
}

/**
 * Main syllabus parsing function
 */
export async function parseSyllabusFile(file: File): Promise<{
  status: 'success' | 'needs_ocr' | 'error';
  structure?: SyllabusStructure;
  message?: string;
  rawText?: string[];
}> {
  try {
    let pagesText: string[];
    
    if (file.type === 'application/pdf') {
      pagesText = await extractPdfText(file);
      
      // Check if OCR is needed
      if (needsOCR(pagesText.join('\n'))) {
        return {
          status: 'needs_ocr',
          message: 'Document appears to be scanned. OCR extraction needed.'
        };
      }
    } else {
      // Plain text file
      const text = await file.text();
      pagesText = text.split('\n');
    }

    // Clean and detect structure
    const cleanedLines = pagesText
      .join('\n')
      .split('\n')
      .map(line => sanitizeLine(line))
      .filter(line => isValidLine(line));

    const structure = detectSyllabusStructure(cleanedLines);

    if (structure.modules.length === 0 && structure.phases.length === 0) {
      return {
        status: 'needs_ocr',
        message: 'No syllabus structure detected',
        rawText: cleanedLines
      };
    }

    return {
      status: 'success',
      structure,
      rawText: cleanedLines
    };
  } catch (error) {
    console.error('Syllabus parsing error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to parse syllabus'
    };
  }
}
