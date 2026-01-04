import { cn } from "@/lib/utils";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { getBankColor, getBankInitials } from "./BankLogos";
import { formatCurrency } from "./LoanSummaryCards";
import { Button } from "@/components/ui/button";

interface Loan {
  id: string;
  bank_name: string;
  bank_logo_url?: string;
  loan_account_number: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  tenure_months: number;
  emi_amount: number;
  start_date: string;
  status: string;
  country: string;
}

interface LoanCardProps {
  loan: Loan;
  remainingPrincipal: number;
  paidCount: number;
  pendingCount: number;
  nextEmiDate?: string;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const LoanCard = ({
  loan,
  remainingPrincipal,
  paidCount,
  pendingCount,
  nextEmiDate,
  onClick,
  onEdit,
  onDelete,
}: LoanCardProps) => {
  const totalEmis = paidCount + pendingCount;
  const progress = totalEmis > 0 ? (paidCount / totalEmis) * 100 : 0;
  const paidAmount = Number(loan.principal_amount) - remainingPrincipal;
  const currency = loan.country === "USA" ? "USD" : "INR";
  const bankColor = getBankColor(loan.bank_name);

  const maskAccountNumber = (num: string) => {
    if (num.length <= 4) return num;
    return "••••" + num.slice(-4);
  };

  return (
    <div className="w-full bg-card border border-border rounded-lg p-5 hover:bg-accent/30 transition-colors text-left group relative">
      {/* Edit/Delete buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      <button onClick={onClick} className="w-full text-left">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Bank Logo */}
            {loan.bank_logo_url ? (
              <img
                src={loan.bank_logo_url}
                alt={loan.bank_name}
                className="w-10 h-10 rounded-lg object-contain bg-white"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium text-white"
                style={{ backgroundColor: bankColor }}
              >
                {getBankInitials(loan.bank_name)}
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-foreground">{loan.bank_name}</h3>
              <p className="text-xs text-muted-foreground">
                {maskAccountNumber(loan.loan_account_number)} • {loan.loan_type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{loan.interest_rate}% p.a.</p>
              {nextEmiDate && (
                <p className="text-xs text-muted-foreground">Next: {nextEmiDate}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Paid: {formatCurrency(paidAmount, currency)}</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: "hsl(var(--vyom-success))" }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-base font-medium text-foreground">
              {formatCurrency(Number(loan.principal_amount), currency)}
            </p>
            <p className="text-xs text-muted-foreground">Principal</p>
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              {formatCurrency(remainingPrincipal, currency)}
            </p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              {formatCurrency(Number(loan.emi_amount), currency)}
            </p>
            <p className="text-xs text-muted-foreground">EMI</p>
          </div>
        </div>

        {/* Status badge for closed loans */}
        {loan.status === "closed" && (
          <div className="mt-3 inline-flex items-center px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground">
            Loan Closed
          </div>
        )}
      </button>
    </div>
  );
};
