import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, ArrowDownCircle, XCircle } from "lucide-react";
import { formatCurrency } from "./LoanSummaryCards";
import { REPAYMENT_MODES } from "./BankLogos";

interface LoanActionsProps {
  loanId: string;
  currency: string;
  outstandingPrincipal: number;
  onPartPayment: (amount: number, date: string, reductionType: "tenure" | "emi", method: string) => void;
  onForeclosure: (date: string, method: string) => void;
  isLoading?: boolean;
}

export const LoanActions = ({
  loanId,
  currency,
  outstandingPrincipal,
  onPartPayment,
  onForeclosure,
  isLoading,
}: LoanActionsProps) => {
  const [showPartPayment, setShowPartPayment] = useState(false);
  const [showForeclosure, setShowForeclosure] = useState(false);

  const [ppAmount, setPpAmount] = useState("");
  const [ppDate, setPpDate] = useState(new Date().toISOString().split("T")[0]);
  const [ppReductionType, setPpReductionType] = useState<"tenure" | "emi">("tenure");
  const [ppMethod, setPpMethod] = useState("Bank Transfer");

  const [fcDate, setFcDate] = useState(new Date().toISOString().split("T")[0]);
  const [fcMethod, setFcMethod] = useState("Bank Transfer");

  const handlePartPayment = () => {
    onPartPayment(parseFloat(ppAmount), ppDate, ppReductionType, ppMethod);
    setShowPartPayment(false);
    setPpAmount("");
  };

  const handleForeclosure = () => {
    onForeclosure(fcDate, fcMethod);
    setShowForeclosure(false);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs text-muted-foreground uppercase tracking-wider">Loan Actions</h4>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPartPayment(true)}
          className="border-border"
        >
          <Banknote className="w-4 h-4 mr-2" />
          Part-Payment
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForeclosure(true)}
          className="border-border"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Foreclose Loan
        </Button>
      </div>

      {/* Part-Payment Dialog */}
      <Dialog open={showPartPayment} onOpenChange={setShowPartPayment}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">Make Part-Payment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Pay extra to reduce your loan principal and save on interest
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Outstanding Principal</p>
              <p className="text-lg font-medium">{formatCurrency(outstandingPrincipal, currency)}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Part-Payment Amount</Label>
              <Input
                type="number"
                placeholder="100000"
                value={ppAmount}
                onChange={(e) => setPpAmount(e.target.value)}
                className="bg-background border-border"
                max={outstandingPrincipal}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Payment Date</Label>
              <Input
                type="date"
                value={ppDate}
                onChange={(e) => setPpDate(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Reduction Type</Label>
              <Select value={ppReductionType} onValueChange={(v: "tenure" | "emi") => setPpReductionType(v)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="tenure">
                    <div>
                      <p>Reduce Tenure</p>
                      <p className="text-xs text-muted-foreground">EMI stays same, loan ends earlier</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="emi">
                    <div>
                      <p>Reduce EMI</p>
                      <p className="text-xs text-muted-foreground">Lower monthly payment, same tenure</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Payment Method</Label>
              <Select value={ppMethod} onValueChange={setPpMethod}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {REPAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowPartPayment(false)}
                className="flex-1 border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePartPayment}
                disabled={isLoading || !ppAmount || parseFloat(ppAmount) > outstandingPrincipal}
                className="flex-1 bg-primary text-primary-foreground"
              >
                {isLoading ? "Processing..." : "Apply Part-Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Foreclosure Dialog */}
      <Dialog open={showForeclosure} onOpenChange={setShowForeclosure}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">Foreclose Loan</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Close your loan early by paying the outstanding principal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Approximate Foreclosure Amount</p>
              <p className="text-lg font-medium">{formatCurrency(outstandingPrincipal, currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                + accrued interest (calculated at bank rate)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Foreclosure Date</Label>
              <Input
                type="date"
                value={fcDate}
                onChange={(e) => setFcDate(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Payment Method</Label>
              <Select value={fcMethod} onValueChange={setFcMethod}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {REPAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ This action will mark all pending EMIs as cancelled and close the loan.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowForeclosure(false)}
                className="flex-1 border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleForeclosure}
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground"
              >
                {isLoading ? "Processing..." : "Confirm Foreclosure"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
