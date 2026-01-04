import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Scale, X, Plus } from "lucide-react";
import { formatCurrency } from "./LoanSummaryCards";
import { getBankColor, getBankInitials } from "./BankLogos";

interface Loan {
  id: string;
  bank_name: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  tenure_months: number;
  emi_amount: number;
  start_date: string;
  country: string;
  status: string;
}

interface LoanComparisonProps {
  loans: Loan[];
  allEmis: any[];
  onClose: () => void;
}

export const LoanComparison = ({ loans, allEmis, onClose }: LoanComparisonProps) => {
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);

  const toggleLoan = (loanId: string) => {
    setSelectedLoans((prev) =>
      prev.includes(loanId)
        ? prev.filter((id) => id !== loanId)
        : prev.length < 4
        ? [...prev, loanId]
        : prev
    );
  };

  const getLoanMetrics = (loan: Loan) => {
    const loanEmis = allEmis.filter((e) => e.loan_id === loan.id);
    const paidEmis = loanEmis.filter((e) => e.payment_status === "Paid");
    const pendingEmis = loanEmis.filter((e) => e.payment_status === "Pending");

    const totalInterest = loanEmis.reduce(
      (sum, e) => sum + Number(e.interest_component),
      0
    );
    const totalAmount = loan.emi_amount * loan.tenure_months;
    const interestPercentage = ((totalInterest / loan.principal_amount) * 100).toFixed(1);

    const remainingPrincipal =
      pendingEmis.length > 0
        ? Number(pendingEmis[0].remaining_principal) +
          Number(pendingEmis[0].principal_component)
        : 0;

    const amountPaid = paidEmis.reduce((sum, e) => sum + Number(e.emi_amount), 0);
    const interestPaid = paidEmis.reduce(
      (sum, e) => sum + Number(e.interest_component),
      0
    );
    const principalPaid = paidEmis.reduce(
      (sum, e) => sum + Number(e.principal_component),
      0
    );

    const remainingInterest = totalInterest - interestPaid;
    const progressPercentage = (paidEmis.length / loanEmis.length) * 100;

    return {
      totalInterest,
      totalAmount,
      interestPercentage,
      remainingPrincipal,
      amountPaid,
      interestPaid,
      principalPaid,
      remainingInterest,
      progressPercentage,
      paidCount: paidEmis.length,
      pendingCount: pendingEmis.length,
      totalEmis: loanEmis.length,
    };
  };

  const comparedLoans = loans.filter((l) => selectedLoans.includes(l.id));
  const loansWithMetrics = comparedLoans.map((loan) => ({
    ...loan,
    metrics: getLoanMetrics(loan),
  }));

  // Find best/worst for highlighting
  const bestInterestRate =
    loansWithMetrics.length > 0
      ? Math.min(...loansWithMetrics.map((l) => l.interest_rate))
      : 0;
  const worstInterestRate =
    loansWithMetrics.length > 0
      ? Math.max(...loansWithMetrics.map((l) => l.interest_rate))
      : 0;
  const lowestTotalInterest =
    loansWithMetrics.length > 0
      ? Math.min(...loansWithMetrics.map((l) => l.metrics.totalInterest))
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-medium">Compare Loans</h2>
          <Badge variant="outline">{selectedLoans.length}/4 selected</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Loan Selection */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Select loans to compare (max 4)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loans
              .filter((l) => l.status === "active")
              .map((loan) => (
                <div
                  key={loan.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLoans.includes(loan.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => toggleLoan(loan.id)}
                >
                  <Checkbox
                    checked={selectedLoans.includes(loan.id)}
                    onCheckedChange={() => toggleLoan(loan.id)}
                  />
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: getBankColor(loan.bank_name) }}
                  >
                    {getBankInitials(loan.bank_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{loan.bank_name}</p>
                    <p className="text-xs text-muted-foreground">{loan.loan_type}</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {loansWithMetrics.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground bg-muted/30">
                      Metric
                    </th>
                    {loansWithMetrics.map((loan) => (
                      <th
                        key={loan.id}
                        className="text-center p-4 min-w-[180px] bg-muted/30"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium text-white"
                            style={{ backgroundColor: getBankColor(loan.bank_name) }}
                          >
                            {getBankInitials(loan.bank_name)}
                          </div>
                          <span className="text-sm font-medium">{loan.bank_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {loan.loan_type}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Principal Amount */}
                  <tr className="border-b border-border">
                    <td className="p-4 text-sm text-muted-foreground">Principal</td>
                    {loansWithMetrics.map((loan) => (
                      <td key={loan.id} className="p-4 text-center font-medium">
                        {formatCurrency(
                          loan.principal_amount,
                          loan.country === "USA" ? "USD" : "INR"
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Interest Rate */}
                  <tr className="border-b border-border">
                    <td className="p-4 text-sm text-muted-foreground">Interest Rate</td>
                    {loansWithMetrics.map((loan) => (
                      <td key={loan.id} className="p-4 text-center">
                        <span
                          className={`font-medium ${
                            loan.interest_rate === bestInterestRate
                              ? "text-green-600 dark:text-green-400"
                              : loan.interest_rate === worstInterestRate &&
                                loansWithMetrics.length > 1
                              ? "text-red-600 dark:text-red-400"
                              : ""
                          }`}
                        >
                          {loan.interest_rate}% p.a.
                        </span>
                        {loan.interest_rate === bestInterestRate &&
                          loansWithMetrics.length > 1 && (
                            <TrendingDown className="inline w-4 h-4 ml-1 text-green-600" />
                          )}
                      </td>
                    ))}
                  </tr>

                  {/* EMI */}
                  <tr className="border-b border-border">
                    <td className="p-4 text-sm text-muted-foreground">Monthly EMI</td>
                    {loansWithMetrics.map((loan) => (
                      <td key={loan.id} className="p-4 text-center font-medium">
                        {formatCurrency(
                          loan.emi_amount,
                          loan.country === "USA" ? "USD" : "INR"
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Tenure */}
                  <tr className="border-b border-border">
                    <td className="p-4 text-sm text-muted-foreground">Tenure</td>
                    {loansWithMetrics.map((loan) => (
                      <td key={loan.id} className="p-4 text-center">
                        {loan.tenure_months} months
                        <span className="text-xs text-muted-foreground ml-1">
                          ({(loan.tenure_months / 12).toFixed(1)} yrs)
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Total Interest */}
                  <tr className="border-b border-border bg-muted/20">
                    <td className="p-4 text-sm text-muted-foreground">Total Interest</td>
                    {loansWithMetrics.map((loan) => (
                      <td key={loan.id} className="p-4 text-center">
                        <span
                          className={`font-medium ${
                            loan.metrics.totalInterest === lowestTotalInterest
                              ? "text-green-600 dark:text-green-400"
                              : ""
                          }`}
                        >
                          {formatCurrency(
                            loan.metrics.totalInterest,
                            loan.country === "USA" ? "USD" : "INR"
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          ({loan.metrics.interestPercentage}% of principal)
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Total Payable */}
                  <tr className="border-b border-border bg-muted/20">
                    <td className="p-4 text-sm text-muted-foreground">Total Payable</td>
                    {loansWithMetrics.map((loan) => (
                      <td key={loan.id} className="p-4 text-center font-medium">
                        {formatCurrency(
                          loan.metrics.totalAmount,
                          loan.country === "USA" ? "USD" : "INR"
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Progress */}
                  <tr className="border-b border-border">
                    <td className="p-4 text-sm text-muted-foreground">Progress</td>
                    {loansWithMetrics.map((loan) => (
                      <td key={loan.id} className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${loan.metrics.progressPercentage}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {loan.metrics.paidCount}/{loan.metrics.totalEmis} EMIs (
                            {loan.metrics.progressPercentage.toFixed(0)}%)
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Remaining Principal */}
                  <tr className="border-b border-border">
                    <td className="p-4 text-sm text-muted-foreground">
                      Remaining Principal
                    </td>
                    {loansWithMetrics.map((loan) => (
                      <td key={loan.id} className="p-4 text-center font-medium">
                        {formatCurrency(
                          loan.metrics.remainingPrincipal,
                          loan.country === "USA" ? "USD" : "INR"
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Interest Saved if Foreclosed */}
                  <tr>
                    <td className="p-4 text-sm text-muted-foreground">
                      Interest Savings on Foreclosure
                    </td>
                    {loansWithMetrics.map((loan) => (
                      <td key={loan.id} className="p-4 text-center">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(
                            loan.metrics.remainingInterest,
                            loan.country === "USA" ? "USD" : "INR"
                          )}
                        </span>
                        <TrendingUp className="inline w-4 h-4 ml-1 text-green-600" />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedLoans.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select loans above to compare them side by side</p>
        </div>
      )}
    </div>
  );
};
