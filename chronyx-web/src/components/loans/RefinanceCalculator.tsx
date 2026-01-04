import { useState } from "react";
import { Calculator, TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

interface Loan {
  id: string;
  principal_amount: number;
  interest_rate: number;
  tenure_months: number;
  emi_amount: number;
  start_date: string;
}

interface RefinanceCalculatorProps {
  loans: Loan[];
}

interface RefinanceResult {
  currentEmi: number;
  newEmi: number;
  currentTotalInterest: number;
  newTotalInterest: number;
  monthlySavings: number;
  totalSavings: number;
  breakEvenMonths: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculateEMI = (principal: number, rate: number, months: number): number => {
  const monthlyRate = rate / 12 / 100;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
         (Math.pow(1 + monthlyRate, months) - 1);
};

const RefinanceCalculator = ({ loans }: RefinanceCalculatorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [newRate, setNewRate] = useState<string>("");
  const [newTenure, setNewTenure] = useState<string>("");
  const [processingFee, setProcessingFee] = useState<string>("0");
  const [result, setResult] = useState<RefinanceResult | null>(null);

  const selectedLoan = loans.find(l => l.id === selectedLoanId);

  const calculateRefinance = () => {
    if (!selectedLoan || !newRate) return;

    const currentPrincipal = selectedLoan.principal_amount;
    const currentRate = selectedLoan.interest_rate;
    const currentTenure = selectedLoan.tenure_months;
    
    // Calculate remaining principal (simplified - assumes start of loan)
    const paidMonths = Math.floor(
      (new Date().getTime() - new Date(selectedLoan.start_date).getTime()) / 
      (1000 * 60 * 60 * 24 * 30)
    );
    const remainingMonths = Math.max(1, currentTenure - paidMonths);
    
    // Calculate remaining principal
    const monthlyRate = currentRate / 12 / 100;
    let remainingPrincipal = currentPrincipal;
    for (let i = 0; i < paidMonths; i++) {
      const interestPayment = remainingPrincipal * monthlyRate;
      const principalPayment = selectedLoan.emi_amount - interestPayment;
      remainingPrincipal -= principalPayment;
    }
    remainingPrincipal = Math.max(0, remainingPrincipal);

    const newInterestRate = parseFloat(newRate);
    const refinanceTenure = newTenure ? parseInt(newTenure) : remainingMonths;
    const fee = parseFloat(processingFee) || 0;

    // Current scenario
    const currentEmi = selectedLoan.emi_amount;
    const currentTotalPayment = currentEmi * remainingMonths;
    const currentTotalInterest = currentTotalPayment - remainingPrincipal;

    // New scenario
    const newEmi = calculateEMI(remainingPrincipal + fee, newInterestRate, refinanceTenure);
    const newTotalPayment = newEmi * refinanceTenure;
    const newTotalInterest = newTotalPayment - remainingPrincipal;

    const monthlySavings = currentEmi - newEmi;
    const totalSavings = currentTotalInterest - newTotalInterest - fee;
    const breakEvenMonths = fee > 0 && monthlySavings > 0 ? Math.ceil(fee / monthlySavings) : 0;

    setResult({
      currentEmi,
      newEmi,
      currentTotalInterest,
      newTotalInterest,
      monthlySavings,
      totalSavings,
      breakEvenMonths,
    });
  };

  const reset = () => {
    setSelectedLoanId("");
    setNewRate("");
    setNewTenure("");
    setProcessingFee("0");
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calculator className="w-4 h-4 mr-2" />
          Refinance Calculator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            Loan Refinance Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Loan Selection */}
          <div className="space-y-2">
            <Label>Select Loan to Refinance</Label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
            >
              <option value="">Choose a loan...</option>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {formatCurrency(loan.principal_amount)} @ {loan.interest_rate}% - {loan.tenure_months} months
                </option>
              ))}
            </select>
          </div>

          {selectedLoan && (
            <>
              {/* Current Loan Info */}
              <Card className="p-4 bg-muted/50">
                <h4 className="text-sm font-medium mb-3">Current Loan Details</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Principal</p>
                    <p className="font-medium">{formatCurrency(selectedLoan.principal_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">{selectedLoan.interest_rate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">EMI</p>
                    <p className="font-medium">{formatCurrency(selectedLoan.emi_amount)}</p>
                  </div>
                </div>
              </Card>

              {/* Refinance Options */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>New Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="8.5"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Tenure (months)</Label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={newTenure}
                    onChange={(e) => setNewTenure(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Processing Fee</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={processingFee}
                    onChange={(e) => setProcessingFee(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={calculateRefinance} className="w-full">
                Calculate Savings
              </Button>

              {/* Results */}
              {result && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-medium">Refinance Analysis</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Current EMI</p>
                      <p className="text-2xl font-semibold mt-1">{formatCurrency(result.currentEmi)}</p>
                    </Card>
                    <Card className="p-4 border-primary">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">New EMI</p>
                      <p className="text-2xl font-semibold text-primary mt-1">{formatCurrency(result.newEmi)}</p>
                    </Card>
                  </div>

                  <div className="flex items-center justify-center gap-4 py-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Monthly Savings</p>
                      <p className={`text-xl font-bold ${result.monthlySavings > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {result.monthlySavings > 0 ? '+' : ''}{formatCurrency(result.monthlySavings)}
                      </p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Savings</p>
                      <p className={`text-xl font-bold ${result.totalSavings > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {result.totalSavings > 0 ? '+' : ''}{formatCurrency(result.totalSavings)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground">Current Total Interest</p>
                      <p className="font-medium">{formatCurrency(result.currentTotalInterest)}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground">New Total Interest</p>
                      <p className="font-medium">{formatCurrency(result.newTotalInterest)}</p>
                    </div>
                  </div>

                  {result.breakEvenMonths > 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Break-even in <span className="font-medium text-foreground">{result.breakEvenMonths} months</span> 
                      {" "}to recover processing fee
                    </p>
                  )}

                  {result.totalSavings > 0 ? (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg text-center">
                      <p className="text-green-700 dark:text-green-400 font-medium">
                        ✓ Refinancing is recommended with {formatCurrency(result.totalSavings)} total savings
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                      <p className="text-destructive font-medium">
                        ✗ Refinancing is not recommended - current loan terms are better
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RefinanceCalculator;
