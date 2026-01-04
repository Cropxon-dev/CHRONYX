import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Loader2, X } from "lucide-react";
import { REPAYMENT_MODES } from "./BankLogos";
import { formatCurrency } from "./LoanSummaryCards";
import { format, parseISO } from "date-fns";
import { getBankColor, getBankInitials } from "./BankLogos";

interface EmiEntry {
  id: string;
  loan_id: string;
  emi_month: number;
  emi_date: string;
  emi_amount: number;
  payment_status: string;
}

interface Loan {
  id: string;
  bank_name: string;
  loan_type: string;
  country: string;
}

interface BulkEmiPaymentProps {
  pendingEmis: EmiEntry[];
  loans: Loan[];
  onMarkPaid: (emiIds: string[], paidDate: string, paymentMethod: string) => void;
  isLoading?: boolean;
  onClose: () => void;
}

export const BulkEmiPayment = ({
  pendingEmis,
  loans,
  onMarkPaid,
  isLoading,
  onClose,
}: BulkEmiPaymentProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Auto Debit");
  const [confirming, setConfirming] = useState(false);

  const selectedEmis = pendingEmis.filter((e) => selectedIds.has(e.id));
  const totalAmount = selectedEmis.reduce((sum, e) => sum + Number(e.emi_amount), 0);

  const getLoanById = (loanId: string) => loans.find((l) => l.id === loanId);

  // Group EMIs by loan
  const emisByLoan = loans.reduce((acc, loan) => {
    acc[loan.id] = pendingEmis.filter((e) => e.loan_id === loan.id).slice(0, 12);
    return acc;
  }, {} as Record<string, EmiEntry[]>);

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAllForLoan = (loanId: string) => {
    const loanEmis = emisByLoan[loanId] || [];
    const allSelected = loanEmis.every((e) => selectedIds.has(e.id));
    const newSet = new Set(selectedIds);
    
    loanEmis.forEach((e) => {
      if (allSelected) {
        newSet.delete(e.id);
      } else {
        newSet.add(e.id);
      }
    });
    
    setSelectedIds(newSet);
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;
    setConfirming(true);
    try {
      onMarkPaid(Array.from(selectedIds), paidDate, paymentMethod);
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            Bulk Mark EMIs as Paid
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* EMIs grouped by loan */}
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {Object.entries(emisByLoan).map(([loanId, emis]) => {
            if (emis.length === 0) return null;
            const loan = getLoanById(loanId);
            if (!loan) return null;
            
            const allSelected = emis.every((e) => selectedIds.has(e.id));
            const someSelected = emis.some((e) => selectedIds.has(e.id));
            
            return (
              <div key={loanId} className="border border-border rounded-lg overflow-hidden">
                <div 
                  className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer"
                  onClick={() => handleSelectAllForLoan(loanId)}
                >
                  <Checkbox 
                    checked={allSelected} 
                    ref={(ref) => {
                      if (ref) {
                        (ref as any).indeterminate = someSelected && !allSelected;
                      }
                    }}
                  />
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: getBankColor(loan.bank_name) }}
                  >
                    {getBankInitials(loan.bank_name)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{loan.bank_name}</p>
                    <p className="text-xs text-muted-foreground">{loan.loan_type} • {emis.length} pending</p>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {emis.slice(0, 6).map((emi) => (
                    <label
                      key={emi.id}
                      className="flex items-center gap-3 p-2 pl-14 hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedIds.has(emi.id)}
                        onCheckedChange={() => handleToggle(emi.id)}
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm">
                          EMI #{emi.emi_month}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-medium">
                            {formatCurrency(Number(emi.emi_amount), loan.country === "USA" ? "USD" : "INR")}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(parseISO(emi.emi_date), "MMM dd")}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                  {emis.length > 6 && (
                    <p className="p-2 text-xs text-muted-foreground text-center">
                      +{emis.length - 6} more pending
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Details */}
        {selectedIds.size > 0 && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="bg-primary/10 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Selected EMIs:</span>
                <span className="font-medium">{selectedIds.size}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-bold text-primary">
                  {formatCurrency(totalAmount, "INR")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Payment Date</Label>
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
            </div>

            <Button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || confirming || isLoading}
              className="w-full bg-primary text-primary-foreground"
            >
              {confirming || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Mark ${selectedIds.size} EMIs as Paid`
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
