import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Scan, Loader2, Upload, Check, X } from "lucide-react";
import { toast } from "sonner";
import Tesseract from "tesseract.js";

interface ExtractedPolicyData {
  policy_name?: string;
  provider?: string;
  policy_number?: string;
  policy_type?: string;
  premium_amount?: string;
  sum_assured?: string;
  start_date?: string;
  renewal_date?: string;
}

interface PolicyDocumentScannerProps {
  onDataExtracted: (data: ExtractedPolicyData) => void;
}

const PolicyDocumentScanner = ({ onDataExtracted }: PolicyDocumentScannerProps) => {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPolicyData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractPolicyDetails = (text: string): ExtractedPolicyData => {
    const data: ExtractedPolicyData = {};
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Policy Number patterns
    const policyPatterns = [
      /policy\s*(?:no|number|#)[:\s]*([A-Z0-9\-\/]+)/i,
      /certificate\s*(?:no|number)[:\s]*([A-Z0-9\-\/]+)/i,
      /(?:policy|certificate)\s*([A-Z]{2,}\d{8,})/i,
    ];
    for (const pattern of policyPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.policy_number = match[1].trim();
        break;
      }
    }

    // Provider/Company name patterns
    const providerPatterns = [
      /(?:insurer|company|provider)[:\s]*([A-Za-z\s]+(?:Insurance|Assurance|Life))/i,
      /(ICICI|HDFC|SBI|LIC|Bajaj|Tata|Max|Star|Reliance|New India|Oriental|United India)[\s\w]*(?:Insurance|Life|General)?/i,
    ];
    for (const pattern of providerPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.provider = match[1]?.trim() || match[0].trim();
        break;
      }
    }

    // Sum Assured patterns
    const sumPatterns = [
      /sum\s*(?:assured|insured)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+)/i,
      /(?:coverage|cover)\s*(?:amount)?[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+)/i,
    ];
    for (const pattern of sumPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.sum_assured = match[1].replace(/,/g, '');
        break;
      }
    }

    // Premium patterns
    const premiumPatterns = [
      /(?:premium|annual\s*premium)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+)/i,
      /(?:premium\s*amount)[:\s]*(?:Rs\.?|INR|₹)\s*([\d,]+)/i,
    ];
    for (const pattern of premiumPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.premium_amount = match[1].replace(/,/g, '');
        break;
      }
    }

    // Date patterns
    const datePatterns = [
      /(?:commencement|start|effective)\s*date[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(?:policy|risk)\s*(?:start|from)\s*date[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    ];
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.start_date = parseDate(match[1]);
        break;
      }
    }

    // Renewal/Expiry date patterns
    const renewalPatterns = [
      /(?:renewal|expiry|maturity)\s*date[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(?:valid|policy)\s*(?:till|upto|until)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    ];
    for (const pattern of renewalPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.renewal_date = parseDate(match[1]);
        break;
      }
    }

    // Policy Type detection
    const typeKeywords = {
      'Health': /health|medical|mediclaim|hospitalization/i,
      'Term Life': /term\s*(?:life|insurance|plan)|life\s*cover/i,
      'Vehicle': /motor|vehicle|car|two\s*wheeler|bike|auto/i,
      'Home': /home|house|property|dwelling/i,
      'Travel': /travel|overseas|international/i,
    };
    for (const [type, pattern] of Object.entries(typeKeywords)) {
      if (pattern.test(text)) {
        data.policy_type = type;
        break;
      }
    }

    // Try to extract policy name from first few meaningful lines
    for (const line of lines.slice(0, 10)) {
      if (line.length > 10 && line.length < 100 && 
          /(?:policy|plan|scheme|insurance)/i.test(line) &&
          !/@|www\.|\.com|phone|tel|fax/i.test(line)) {
        data.policy_name = line.replace(/[^\w\s-]/g, '').trim();
        break;
      }
    }

    return data;
  };

  const parseDate = (dateStr: string): string => {
    try {
      const parts = dateStr.split(/[-\/]/);
      if (parts.length === 3) {
        let day = parts[0];
        let month = parts[1];
        let year = parts[2];
        
        if (year.length === 2) {
          year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        }
        
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    } catch (e) {
      console.error("Date parse error:", e);
    }
    return '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanning(true);
    setProgress(0);
    setExtractedData(null);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const extractedText = result.data.text;
      console.log("OCR Text:", extractedText);

      const data = extractPolicyDetails(extractedText);
      setExtractedData(data);

      if (Object.keys(data).length === 0) {
        toast.warning("Could not extract details. Please enter manually.");
      } else {
        toast.success("Details extracted! Review and confirm.");
      }
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Failed to scan document");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      setOpen(false);
      setExtractedData(null);
      setPreviewUrl(null);
      toast.success("Data applied to form");
    }
  };

  const handleCancel = () => {
    setExtractedData(null);
    setPreviewUrl(null);
  };

  return (
    <>
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Scan className="w-4 h-4" />
        Scan Document
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan Policy Document</DialogTitle>
            <DialogDescription>
              Upload a policy document image to auto-extract details using OCR
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!previewUrl && (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Policy Document
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports JPG, PNG, PDF (max 10MB)
                </p>
              </div>
            )}

            {scanning && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Scanning document... {progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {previewUrl && !scanning && (
              <div className="space-y-4">
                <div className="max-h-48 overflow-hidden rounded-lg border border-border">
                  <img 
                    src={previewUrl} 
                    alt="Document preview" 
                    className="w-full h-auto object-contain"
                  />
                </div>

                {extractedData && Object.keys(extractedData).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Extracted Details (Editable)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {extractedData.policy_name && (
                        <div className="space-y-1">
                          <Label className="text-xs">Policy Name</Label>
                          <Input 
                            value={extractedData.policy_name} 
                            onChange={(e) => setExtractedData({...extractedData, policy_name: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {extractedData.provider && (
                        <div className="space-y-1">
                          <Label className="text-xs">Provider</Label>
                          <Input 
                            value={extractedData.provider} 
                            onChange={(e) => setExtractedData({...extractedData, provider: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {extractedData.policy_number && (
                        <div className="space-y-1">
                          <Label className="text-xs">Policy Number</Label>
                          <Input 
                            value={extractedData.policy_number} 
                            onChange={(e) => setExtractedData({...extractedData, policy_number: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {extractedData.policy_type && (
                        <div className="space-y-1">
                          <Label className="text-xs">Policy Type</Label>
                          <Input 
                            value={extractedData.policy_type} 
                            onChange={(e) => setExtractedData({...extractedData, policy_type: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {extractedData.sum_assured && (
                        <div className="space-y-1">
                          <Label className="text-xs">Sum Assured</Label>
                          <Input 
                            value={extractedData.sum_assured} 
                            onChange={(e) => setExtractedData({...extractedData, sum_assured: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {extractedData.premium_amount && (
                        <div className="space-y-1">
                          <Label className="text-xs">Premium Amount</Label>
                          <Input 
                            value={extractedData.premium_amount} 
                            onChange={(e) => setExtractedData({...extractedData, premium_amount: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {extractedData.start_date && (
                        <div className="space-y-1">
                          <Label className="text-xs">Start Date</Label>
                          <Input 
                            type="date"
                            value={extractedData.start_date} 
                            onChange={(e) => setExtractedData({...extractedData, start_date: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {extractedData.renewal_date && (
                        <div className="space-y-1">
                          <Label className="text-xs">Renewal Date</Label>
                          <Input 
                            type="date"
                            value={extractedData.renewal_date} 
                            onChange={(e) => setExtractedData({...extractedData, renewal_date: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleConfirm} className="flex-1 gap-2">
                        <Check className="w-4 h-4" />
                        Apply to Form
                      </Button>
                      <Button variant="outline" onClick={handleCancel} className="gap-2">
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {extractedData && Object.keys(extractedData).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Could not extract details from this document.</p>
                    <p className="text-xs mt-1">Please enter the policy details manually.</p>
                    <Button variant="outline" onClick={handleCancel} className="mt-3">
                      Try Another Document
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PolicyDocumentScanner;