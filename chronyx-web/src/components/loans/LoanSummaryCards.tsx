import { Wallet, Calendar, TrendingDown, PiggyBank } from "lucide-react";

interface LoanSummaryCardsProps {
  totalOutstanding: number;
  activeLoansCount: number;
  emiDueThisMonth: number;
  totalEmiThisMonth: number;
  currency: string;
}

export const formatCurrency = (amount: number, currency: string = "INR") => {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const currencyCode = currency === "INR" ? "INR" : "USD";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const LoanSummaryCards = ({
  totalOutstanding,
  activeLoansCount,
  emiDueThisMonth,
  totalEmiThisMonth,
  currency = "INR",
}: LoanSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Outstanding</p>
        </div>
        <p className="text-2xl font-light text-foreground tracking-tight">
          {formatCurrency(totalOutstanding, currency)}
        </p>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Loans</p>
        </div>
        <p className="text-2xl font-light text-foreground tracking-tight">
          {activeLoansCount}
        </p>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">EMI Due This Month</p>
        </div>
        <p className="text-2xl font-light text-foreground tracking-tight">
          {emiDueThisMonth}
        </p>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total EMI This Month</p>
        </div>
        <p className="text-2xl font-light text-foreground tracking-tight">
          {formatCurrency(totalEmiThisMonth, currency)}
        </p>
      </div>
    </div>
  );
};
