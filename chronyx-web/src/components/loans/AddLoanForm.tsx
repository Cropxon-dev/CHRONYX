import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { INDIAN_BANKS, US_BANKS, LOAN_TYPES, REPAYMENT_MODES, getBankColor } from "./BankLogos";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LoanDocumentUpload } from "./LoanDocumentUpload";
import { useCustomBanks } from "@/hooks/useCustomBanks";

interface AddLoanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LoanFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<LoanFormData> & { id?: string };
  mode?: "add" | "edit";
}

export interface LoanFormData {
  country: string;
  bank_name: string;
  bank_logo_url?: string;
  loan_account_number: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  tenure_months: number;
  emi_amount: number;
  start_date: string;
  repayment_mode: string;
  notes?: string;
}

function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0) return principal / tenureMonths;
  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export const AddLoanForm = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initialData,
  mode = "add",
}: AddLoanFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { customBanks, addCustomBank } = useCustomBanks();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [country, setCountry] = useState("India");
  const [bankName, setBankName] = useState("");
  const [customBank, setCustomBank] = useState("");
  const [bankLogoUrl, setBankLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loanAccountNumber, setLoanAccountNumber] = useState("");
  const [loanType, setLoanType] = useState("Home");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const [emiOverride, setEmiOverride] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [repaymentMode, setRepaymentMode] = useState("Auto Debit");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && initialData) {
      setCountry(initialData.country || "India");
      setBankLogoUrl(initialData.bank_logo_url || "");
      setLoanAccountNumber(initialData.loan_account_number || "");
      setLoanType(initialData.loan_type || "Home");
      setPrincipal(initialData.principal_amount?.toString() || "");
      setInterestRate(initialData.interest_rate?.toString() || "");
      setTenure(initialData.tenure_months?.toString() || "");
      setEmiAmount(initialData.emi_amount?.toString() || "");
      setStartDate(initialData.start_date || new Date().toISOString().split("T")[0]);
      setRepaymentMode(initialData.repayment_mode || "Auto Debit");
      setNotes(initialData.notes || "");

      const allBanks = [...INDIAN_BANKS, ...US_BANKS];
      const isKnownBank = allBanks.some((b) => b.name === initialData.bank_name);
      if (!isKnownBank && initialData.bank_name) {
        setCustomBank(initialData.bank_name);
        setBankName("custom");
      } else {
        setBankName(initialData.bank_name || "");
        setCustomBank("");
      }
    } else if (open && !initialData) {
      setCountry("India");
      setBankName("");
      setCustomBank("");
      setBankLogoUrl("");
      setLoanAccountNumber("");
      setLoanType("Home");
      setPrincipal("");
      setInterestRate("");
      setTenure("");
      setEmiAmount("");
      setEmiOverride(false);
      setStartDate(new Date().toISOString().split("T")[0]);
      setRepaymentMode("Auto Debit");
      setNotes("");
    }
  }, [open, initialData]);

  // Combine built-in banks with custom banks (include logos)
  const builtInBanks = country === "India" ? INDIAN_BANKS : US_BANKS;
  const userCustomBanks = customBanks.filter(cb => cb.country === country || country === "Other");
  const banks = [
    ...builtInBanks.map(b => ({ ...b, logo_url: null as string | null })),
    ...userCustomBanks.map(cb => ({ 
      name: cb.name, 
      fullName: cb.full_name, 
      color: cb.color,
      logo_url: cb.logo_url 
    })),
  ];

  useEffect(() => {
    if (!emiOverride && principal && interestRate && tenure) {
      const p = parseFloat(principal);
      const r = parseFloat(interestRate);
      const t = parseInt(tenure);
      if (p > 0 && r >= 0 && t > 0) {
        const calculatedEmi = calculateEMI(p, r, t);
        setEmiAmount(calculatedEmi.toFixed(2));
      }
    }
  }, [principal, interestRate, tenure, emiOverride]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be less than 2MB", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `logos/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("loan-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("loan-documents")
        .getPublicUrl(filePath);

      setBankLogoUrl(urlData.publicUrl);
      toast({ title: "Logo uploaded" });
    } catch (error) {
      console.error("Logo upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBankName = bankName === "custom" ? customBank : bankName;

    // Save custom bank to database if it's a new custom bank
    if (bankName === "custom" && customBank && mode === "add") {
      const existingCustom = customBanks.find(cb => cb.name.toLowerCase() === customBank.toLowerCase());
      if (!existingCustom) {
        try {
          await addCustomBank.mutateAsync({
            name: customBank,
            full_name: customBank,
            color: getBankColor(customBank),
            logo_url: bankLogoUrl || undefined,
            country: country,
          });
        } catch (error) {
          console.error("Failed to save custom bank:", error);
        }
      }
    }

    onSubmit({
      country,
      bank_name: finalBankName,
      bank_logo_url: bankLogoUrl || undefined,
      loan_account_number: loanAccountNumber,
      loan_type: loanType,
      principal_amount: parseFloat(principal),
      interest_rate: parseFloat(interestRate),
      tenure_months: parseInt(tenure),
      emi_amount: parseFloat(emiAmount),
      start_date: startDate,
      repayment_mode: repaymentMode,
      notes: notes || undefined,
    });
  };

  const handleDocumentDataExtracted = (data: Partial<LoanFormData>) => {
    if (data.bank_name) {
      const allBanks = [...INDIAN_BANKS, ...US_BANKS];
      const isKnownBank = allBanks.some((b) => b.name === data.bank_name);
      if (isKnownBank) {
        setBankName(data.bank_name);
        setCustomBank("");
      } else {
        setBankName("custom");
        setCustomBank(data.bank_name);
      }
    }
    if (data.loan_account_number) setLoanAccountNumber(data.loan_account_number);
    if (data.principal_amount) setPrincipal(data.principal_amount.toString());
    if (data.interest_rate) setInterestRate(data.interest_rate.toString());
    if (data.tenure_months) setTenure(data.tenure_months.toString());
    if (data.emi_amount) {
      setEmiAmount(data.emi_amount.toString());
      setEmiOverride(true);
    }
    if (data.start_date) setStartDate(data.start_date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-light tracking-wide">
            {mode === "add" ? "Add New Loan" : "Edit Loan"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter loan details or upload a document to auto-extract
          </DialogDescription>
        </DialogHeader>

        {/* Document Upload for OCR */}
        {mode === "add" && (
          <LoanDocumentUpload onDataExtracted={handleDocumentDataExtracted} />
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Country */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Country</Label>
            <Select
              value={country}
              onValueChange={(v) => {
                setCountry(v);
                setBankName("");
              }}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bank Name */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Bank Name</Label>
            <Select value={bankName} onValueChange={(val) => {
              setBankName(val);
              // Set logo if custom bank has one
              const customBank = userCustomBanks.find(cb => cb.name === val);
              if (customBank?.logo_url) {
                setBankLogoUrl(customBank.logo_url);
              } else if (val !== "custom") {
                setBankLogoUrl("");
              }
            }}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {banks.map((bank) => (
                  <SelectItem key={bank.name} value={bank.name}>
                    <div className="flex items-center gap-2">
                      {bank.logo_url ? (
                        <img 
                          src={bank.logo_url} 
                          alt={bank.name}
                          className="w-5 h-5 rounded object-contain bg-white"
                        />
                      ) : (
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium text-white"
                          style={{ backgroundColor: bank.color }}
                        >
                          {bank.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span>{bank.fullName}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium bg-muted text-muted-foreground">
                      +
                    </div>
                    <span>Other (Custom)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {bankName === "custom" && (
              <Input
                placeholder="Enter bank name"
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                className="mt-2 bg-background border-border"
              />
            )}
          </div>

          {/* Bank Logo Upload */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Bank Logo (Optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              {bankLogoUrl ? (
                <div className="relative">
                  <img
                    src={bankLogoUrl}
                    alt="Bank logo"
                    className="w-12 h-12 rounded-lg object-contain bg-white border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setBankLogoUrl("")}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-medium text-white"
                  style={{
                    backgroundColor: getBankColor(bankName === "custom" ? customBank : bankName),
                  }}
                >
                  {(bankName === "custom" ? customBank : bankName).slice(0, 2).toUpperCase() || "?"}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="border-border"
              >
                {uploadingLogo ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload Logo
              </Button>
            </div>
          </div>

          {/* Loan Account Number */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Loan Account Number</Label>
            <Input
              placeholder="Enter account number"
              value={loanAccountNumber}
              onChange={(e) => setLoanAccountNumber(e.target.value)}
              className="bg-background border-border"
              required
            />
          </div>

          {/* Loan Type */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Loan Type</Label>
            <Select value={loanType} onValueChange={setLoanType}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {LOAN_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Principal Amount */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Principal Amount ({country === "USA" ? "$" : "₹"})
            </Label>
            <Input
              type="number"
              placeholder="500000"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="bg-background border-border"
              required
              min="1"
            />
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Annual Interest Rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="9.5"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="bg-background border-border"
              required
              min="0"
            />
          </div>

          {/* Tenure */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Loan Tenure (months)</Label>
            <Input
              type="number"
              placeholder="240"
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              className="bg-background border-border"
              required
              min="1"
            />
          </div>

          {/* EMI Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">
                EMI Amount ({country === "USA" ? "$" : "₹"})
              </Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={emiOverride}
                  onChange={(e) => setEmiOverride(e.target.checked)}
                  className="rounded border-border"
                />
                Override calculated EMI
              </label>
            </div>
            <Input
              type="number"
              step="0.01"
              placeholder="42000"
              value={emiAmount}
              onChange={(e) => setEmiAmount(e.target.value)}
              className="bg-background border-border"
              required
              disabled={!emiOverride}
            />
            {emiOverride && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Manual EMI override may cause schedule mismatch with bank
              </p>
            )}
          </div>

          {/* EMI Start Date */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">EMI Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border-border"
              required
            />
          </div>

          {/* Repayment Mode */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Repayment Mode</Label>
            <Select value={repaymentMode} onValueChange={setRepaymentMode}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {REPAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Notes (optional)</Label>
            <Textarea
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background border-border resize-none"
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !bankName || !loanAccountNumber || !principal || !interestRate || !tenure}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {isLoading ? "Saving..." : mode === "add" ? "Add Loan" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
