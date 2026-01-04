import { useState, useEffect } from "react";
import { CreditCard, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface LoanSummary {
  totalLoans: number;
  totalOutstanding: number;
  totalPaid: number;
  upcomingPayments: Array<{
    loanId: string;
    bankName: string;
    amount: number;
    dueDate: string;
    daysUntil: number;
  }>;
  overallProgress: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const LoanWidget = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLoanSummary();
    }
  }, [user]);

  const fetchLoanSummary = async () => {
    try {
      // Fetch active loans
      const { data: loans } = await supabase
        .from("loans")
        .select("id, bank_name, principal_amount, emi_amount, status")
        .eq("status", "active");

      if (!loans || loans.length === 0) {
        setSummary(null);
        setLoading(false);
        return;
      }

      // Fetch EMI schedule for upcoming payments
      const loanIds = loans.map(l => l.id);
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      const { data: schedules } = await supabase
        .from("emi_schedule")
        .select("loan_id, emi_amount, emi_date, payment_status, remaining_principal")
        .in("loan_id", loanIds)
        .order("emi_date", { ascending: true });

      // Calculate totals
      let totalPaid = 0;
      let totalOutstanding = 0;
      const upcomingPayments: LoanSummary['upcomingPayments'] = [];

      loans.forEach(loan => {
        const loanSchedules = schedules?.filter(s => s.loan_id === loan.id) || [];
        const paidSchedules = loanSchedules.filter(s => s.payment_status === 'Paid');
        const pendingSchedules = loanSchedules.filter(s => s.payment_status !== 'Paid');
        
        totalPaid += paidSchedules.reduce((sum, s) => sum + Number(s.emi_amount), 0);
        
        if (pendingSchedules.length > 0) {
          totalOutstanding += Number(pendingSchedules[0].remaining_principal || 0);
          
          // Find next unpaid EMI
          const nextUnpaid = pendingSchedules.find(s => s.emi_date >= today);
          if (nextUnpaid && nextUnpaid.emi_date <= nextMonth) {
            const daysUntil = Math.ceil(
              (new Date(nextUnpaid.emi_date).getTime() - new Date().getTime()) / 
              (1000 * 60 * 60 * 24)
            );
            upcomingPayments.push({
              loanId: loan.id,
              bankName: loan.bank_name,
              amount: Number(nextUnpaid.emi_amount),
              dueDate: nextUnpaid.emi_date,
              daysUntil,
            });
          }
        }
      });

      const totalPrincipal = loans.reduce((sum, l) => sum + Number(l.principal_amount), 0);
      const overallProgress = totalPrincipal > 0 
        ? Math.round((totalPaid / (totalPaid + totalOutstanding)) * 100)
        : 0;

      setSummary({
        totalLoans: loans.length,
        totalOutstanding,
        totalPaid,
        upcomingPayments: upcomingPayments.slice(0, 3),
        overallProgress,
      });
    } catch (error) {
      console.error("Error fetching loan summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Loans</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">No active loans</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Loan Summary</h3>
            <p className="text-xs text-muted-foreground">{summary.totalLoans} active loan{summary.totalLoans > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-foreground">{formatCurrency(summary.totalOutstanding)}</p>
          <p className="text-xs text-muted-foreground">Outstanding</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Repayment Progress</span>
          <span className="font-medium">{summary.overallProgress}%</span>
        </div>
        <Progress value={summary.overallProgress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Paid: {formatCurrency(summary.totalPaid)}</span>
          <span>Remaining: {formatCurrency(summary.totalOutstanding)}</span>
        </div>
      </div>

      {/* Upcoming Payments */}
      {summary.upcomingPayments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming EMIs
          </h4>
          <div className="space-y-2">
            {summary.upcomingPayments.map((payment, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  payment.daysUntil <= 5 
                    ? 'bg-destructive/10 border border-destructive/20' 
                    : 'bg-muted/50'
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{payment.bankName}</p>
                  <p className="text-xs text-muted-foreground">
                    Due: {format(new Date(payment.dueDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(payment.amount)}</p>
                  <p className={`text-xs ${payment.daysUntil <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {payment.daysUntil <= 0 ? 'Due today' : `${payment.daysUntil} days`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanWidget;
