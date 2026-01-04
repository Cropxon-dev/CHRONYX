import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Check, X, Loader2, FileSearch } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Tesseract from "tesseract.js";
import { LoanFormData } from "./AddLoanForm";

interface ParsedLoanData {
  bank_name?: string;
  loan_account_number?: string;
  principal_amount?: number;
  interest_rate?: number;
  tenure_months?: number;
  emi_amount?: number;
  start_date?: string;
}

interface LoanDocumentUploadProps {
  onDataExtracted: (data: Partial<LoanFormData>) => void;
  loanId?: string;
}

export const LoanDocumentUpload = ({ onDataExtracted, loanId }: LoanDocumentUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedLoanData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload a PDF or image file",
        variant: "destructive" 
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Maximum file size is 10MB",
        variant: "destructive" 
      });
      return;
    }

    setFileName(file.name);
    setUploading(true);
    setParsedData(null);
    setOcrProgress(0);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const filePath = `documents/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("loan-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("loan-documents")
        .getPublicUrl(filePath);

      setUploadedUrl(urlData.publicUrl);
      setUploading(false);
      
      // Start OCR parsing
      await parseDocument(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
      setUploading(false);
    }
  };

  const parseDocument = async (file: File) => {
    setParsing(true);
    setOcrProgress(0);

    try {
      let extractedText = "";

      // Use Tesseract.js for OCR on images
      if (file.type.startsWith("image/")) {
        const result = await Tesseract.recognize(file, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        });
        extractedText = result.data.text;
      } else if (file.type === "application/pdf") {
        // For PDF, we'll extract using canvas conversion
        toast({
          title: "PDF detected",
          description: "For best results with PDFs, please upload images of individual pages",
        });
        setParsing(false);
        return;
      }

      // Parse the extracted text
      const parsed = parseExtractedText(extractedText);
      
      if (Object.keys(parsed).length > 0) {
        setParsedData(parsed);
        toast({ title: "Document parsed successfully" });
      } else {
        toast({ 
          title: "No loan data detected", 
          description: "Please enter details manually",
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast({ title: "Failed to parse document", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const parseExtractedText = (text: string): ParsedLoanData => {
    const parsed: ParsedLoanData = {};
    const cleanText = text.replace(/\s+/g, " ");

    // Bank name patterns
    const bankPatterns = [
      /(?:state bank of india|sbi)/i,
      /(?:hdfc bank|hdfc)/i,
      /(?:icici bank|icici)/i,
      /(?:axis bank|axis)/i,
      /(?:punjab national bank|pnb)/i,
      /(?:bank of baroda|bob)/i,
      /(?:kotak mahindra|kotak)/i,
      /(?:idfc first)/i,
      /(?:yes bank)/i,
      /(?:indusind bank|indusind)/i,
      /(?:chase|jpmorgan)/i,
      /(?:bank of america)/i,
      /(?:wells fargo)/i,
      /(?:citibank|citi)/i,
      /(?:capital one)/i,
      /(?:uco bank)/i,
      /(?:canara bank)/i,
      /(?:union bank)/i,
      /(?:indian bank)/i,
    ];

    for (const pattern of bankPatterns) {
      const match = text.match(pattern);
      if (match) {
        const bankMap: Record<string, string> = {
          "sbi": "SBI", "state bank of india": "SBI",
          "hdfc bank": "HDFC", "hdfc": "HDFC",
          "icici bank": "ICICI", "icici": "ICICI",
          "axis bank": "Axis", "axis": "Axis",
          "punjab national bank": "PNB", "pnb": "PNB",
          "bank of baroda": "Bank of Baroda", "bob": "Bank of Baroda",
          "kotak mahindra": "Kotak", "kotak": "Kotak",
          "idfc first": "IDFC First",
          "yes bank": "Yes Bank",
          "indusind bank": "IndusInd", "indusind": "IndusInd",
          "chase": "Chase", "jpmorgan": "Chase",
          "bank of america": "Bank of America",
          "wells fargo": "Wells Fargo",
          "citibank": "Citi", "citi": "Citi",
          "capital one": "Capital One",
          "uco bank": "UCO Bank",
          "canara bank": "Canara Bank",
          "union bank": "Union Bank",
          "indian bank": "Indian Bank",
        };
        parsed.bank_name = bankMap[match[0].toLowerCase()] || match[0];
        break;
      }
    }

    // Account number patterns
    const accountPatterns = [
      /(?:loan\s*(?:account|a\/c|ac)\s*(?:no|number|#)?[:\s]*)([\d\-\/]+)/i,
      /(?:account\s*(?:no|number|#)?[:\s]*)([\d\-\/]{8,20})/i,
      /(?:a\/c\s*(?:no)?[:\s]*)([\d\-\/]{8,20})/i,
    ];

    for (const pattern of accountPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        parsed.loan_account_number = match[1].trim();
        break;
      }
    }

    // Principal amount patterns
    const principalPatterns = [
      /(?:principal|loan\s*amount|sanctioned\s*amount|disbursed\s*amount)[:\s]*(?:rs\.?|₹|inr|usd|\$)?\s*([\d,]+(?:\.\d{2})?)/i,
      /(?:rs\.?|₹)\s*([\d,]+(?:\.\d{2})?)\s*(?:lakhs?|lacs?)/i,
    ];

    for (const pattern of principalPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        let amount = parseFloat(match[1].replace(/,/g, ""));
        if (/lakhs?|lacs?/i.test(match[0])) {
          amount *= 100000;
        }
        if (amount >= 1000) {
          parsed.principal_amount = amount;
          break;
        }
      }
    }

    // Interest rate patterns
    const ratePatterns = [
      /(?:rate\s*of\s*interest|interest\s*rate|roi)[:\s]*(\d+(?:\.\d+)?)\s*%?/i,
      /(\d+(?:\.\d+)?)\s*%\s*(?:p\.?a\.?|per\s*annum)/i,
    ];

    for (const pattern of ratePatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        const rate = parseFloat(match[1]);
        if (rate > 0 && rate < 50) {
          parsed.interest_rate = rate;
          break;
        }
      }
    }

    // Tenure patterns
    const tenurePatterns = [
      /(?:tenure|period|term)[:\s]*(\d+)\s*(?:months?|yrs?|years?)/i,
      /(\d+)\s*(?:months?)\s*(?:tenure|period|term)/i,
    ];

    for (const pattern of tenurePatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        let months = parseInt(match[1]);
        if (/yrs?|years?/i.test(match[0])) {
          months *= 12;
        }
        if (months >= 1 && months <= 600) {
          parsed.tenure_months = months;
          break;
        }
      }
    }

    // EMI patterns
    const emiPatterns = [
      /(?:emi|monthly\s*installment|instalment)[:\s]*(?:rs\.?|₹|inr|\$)?\s*([\d,]+(?:\.\d{2})?)/i,
      /(?:rs\.?|₹)\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s*month|monthly|emi)/i,
    ];

    for (const pattern of emiPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        const emi = parseFloat(match[1].replace(/,/g, ""));
        if (emi >= 100) {
          parsed.emi_amount = emi;
          break;
        }
      }
    }

    // Date patterns
    const datePatterns = [
      /(?:start\s*date|first\s*emi|commencement)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s*(?:start|first)/i,
    ];

    for (const pattern of datePatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        try {
          const parts = match[1].split(/[\/-]/);
          if (parts.length === 3) {
            let year = parseInt(parts[2]);
            if (year < 100) year += 2000;
            const date = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(date.getTime())) {
              parsed.start_date = date.toISOString().split("T")[0];
              break;
            }
          }
        } catch {
          // Skip invalid dates
        }
      }
    }

    return parsed;
  };

  const handleApprove = () => {
    if (parsedData) {
      onDataExtracted(parsedData);
      toast({ title: "Data applied to form" });
      setParsedData(null);
      setFileName(null);
      setUploadedUrl(null);
    }
  };

  const handleReject = () => {
    setParsedData(null);
    setFileName(null);
    setUploadedUrl(null);
  };

  return (
    <Card className="border-dashed border-2 border-border bg-muted/20">
      <CardContent className="p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!fileName ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer flex flex-col items-center gap-2 py-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileSearch className="w-8 h-8" />
            <p className="text-sm font-medium">Upload Loan Document</p>
            <p className="text-xs">AI will extract loan details automatically</p>
            <p className="text-xs text-muted-foreground">Supports PDF, PNG, JPG (max 10MB)</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {uploading ? "Uploading..." : parsing ? "Analyzing with OCR..." : "Ready"}
                </p>
              </div>
              {!parsedData && !uploading && !parsing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReject}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Progress */}
            {(uploading || parsing) && (
              <div className="space-y-2">
                <Progress value={parsing ? ocrProgress : 50} className="h-1" />
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {parsing ? `Analyzing document... ${ocrProgress}%` : "Uploading..."}
                </div>
              </div>
            )}

            {/* Parsed Data Preview */}
            {parsedData && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Data extracted successfully
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {parsedData.bank_name && (
                    <div className="bg-background/50 p-2 rounded">
                      <span className="text-muted-foreground">Bank:</span>{" "}
                      <span className="font-medium">{parsedData.bank_name}</span>
                    </div>
                  )}
                  {parsedData.loan_account_number && (
                    <div className="bg-background/50 p-2 rounded">
                      <span className="text-muted-foreground">Account:</span>{" "}
                      <span className="font-medium">{parsedData.loan_account_number}</span>
                    </div>
                  )}
                  {parsedData.principal_amount && (
                    <div className="bg-background/50 p-2 rounded">
                      <span className="text-muted-foreground">Principal:</span>{" "}
                      <span className="font-medium">₹{parsedData.principal_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {parsedData.interest_rate && (
                    <div className="bg-background/50 p-2 rounded">
                      <span className="text-muted-foreground">Interest:</span>{" "}
                      <span className="font-medium">{parsedData.interest_rate}%</span>
                    </div>
                  )}
                  {parsedData.tenure_months && (
                    <div className="bg-background/50 p-2 rounded">
                      <span className="text-muted-foreground">Tenure:</span>{" "}
                      <span className="font-medium">{parsedData.tenure_months} months</span>
                    </div>
                  )}
                  {parsedData.emi_amount && (
                    <div className="bg-background/50 p-2 rounded">
                      <span className="text-muted-foreground">EMI:</span>{" "}
                      <span className="font-medium">₹{parsedData.emi_amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReject}
                    className="flex-1 border-border"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Apply to Form
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};