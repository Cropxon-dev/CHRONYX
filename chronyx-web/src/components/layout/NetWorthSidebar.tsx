import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, TrendingDown, Minus, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NetWorthData {
  netWorth: number;
  assets: number;
  liabilities: number;
  monthlyDelta: number;
  breakdown: {
    totalIncome: number;
    totalExpenses: number;
    outstandingLoans: number;
    insuranceValue: number;
  };
}

const NetWorthSidebar = () => {
  const { user } = useAuth();
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const calculateNetWorth = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch all financial data in parallel
      const [incomeResult, expensesResult, loansResult, insurancesResult] = await Promise.all([
        supabase
          .from("income_entries")
          .select("amount, income_date")
          .eq("user_id", user.id),
        supabase
          .from("expenses")
          .select("amount, expense_date")
          .eq("user_id", user.id),
        supabase
          .from("loans")
          .select("id, principal_amount, status")
          .eq("user_id", user.id)
          .eq("status", "active"),
        supabase
          .from("insurances")
          .select("sum_assured, status")
          .eq("user_id", user.id)
          .eq("status", "active"),
      ]);

      // Calculate total income
      const totalIncome = incomeResult.data?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      // Calculate total expenses
      const totalExpenses = expensesResult.data?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      // Calculate outstanding loan amounts
      let outstandingLoans = 0;
      if (loansResult.data && loansResult.data.length > 0) {
        // Get remaining principal from EMI schedules
        const loanIds = loansResult.data.map(l => l.id);
        const { data: emiData } = await supabase
          .from("emi_schedule")
          .select("loan_id, remaining_principal, payment_status")
          .in("loan_id", loanIds)
          .eq("payment_status", "Pending")
          .order("emi_month", { ascending: true });

        // Get the first pending EMI for each loan (has remaining principal)
        const loanRemainingMap = new Map<string, number>();
        emiData?.forEach(emi => {
          if (!loanRemainingMap.has(emi.loan_id)) {
            loanRemainingMap.set(emi.loan_id, Number(emi.remaining_principal));
          }
        });
        outstandingLoans = Array.from(loanRemainingMap.values()).reduce((sum, val) => sum + val, 0);
      }

      // Calculate insurance value (sum assured of active policies)
      const insuranceValue = insurancesResult.data?.reduce((sum, ins) => sum + Number(ins.sum_assured), 0) || 0;

      // Calculate monthly delta (this month's income - expenses)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const thisMonthIncome = incomeResult.data
        ?.filter(e => e.income_date >= startOfMonth && e.income_date <= endOfMonth)
        .reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      const thisMonthExpenses = expensesResult.data
        ?.filter(e => e.expense_date >= startOfMonth && e.expense_date <= endOfMonth)
        .reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      const monthlyDelta = thisMonthIncome - thisMonthExpenses;

      // Calculate net worth
      const assets = totalIncome + insuranceValue;
      const liabilities = totalExpenses + outstandingLoans;
      const netWorth = assets - liabilities;

      setData({
        netWorth,
        assets,
        liabilities,
        monthlyDelta,
        breakdown: {
          totalIncome,
          totalExpenses,
          outstandingLoans,
          insuranceValue,
        },
      });
    } catch (error) {
      console.error("Error calculating net worth:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      calculateNetWorth();
    }
  }, [user, calculateNetWorth]);

  // Set up real-time subscriptions for dynamic sync
  useEffect(() => {
    if (!user) return;

    const incomeChannel = supabase
      .channel('income-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income_entries' }, calculateNetWorth)
      .subscribe();

    const expensesChannel = supabase
      .channel('expenses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, calculateNetWorth)
      .subscribe();

    const loansChannel = supabase
      .channel('loans-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, calculateNetWorth)
      .subscribe();

    const emiChannel = supabase
      .channel('emi-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emi_schedule' }, calculateNetWorth)
      .subscribe();

    const insuranceChannel = supabase
      .channel('insurance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insurances' }, calculateNetWorth)
      .subscribe();

    return () => {
      supabase.removeChannel(incomeChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(loansChannel);
      supabase.removeChannel(emiChannel);
      supabase.removeChannel(insuranceChannel);
    };
  }, [user, calculateNetWorth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await calculateNetWorth();
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (absAmount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else if (absAmount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-4"></div>
        <div className="h-8 bg-muted rounded w-32 mb-2"></div>
        <div className="h-3 bg-muted rounded w-20"></div>
      </div>
    );
  }

  if (!data) return null;

  const TrendIcon = data.monthlyDelta > 0 ? TrendingUp : data.monthlyDelta < 0 ? TrendingDown : Minus;
  const trendColor = data.monthlyDelta > 0 ? "text-vyom-success" : data.monthlyDelta < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-vyom-accent" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Worth</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
        </div>
      </div>

      {/* Main Net Worth */}
      <div>
        <p className={`text-2xl font-bold ${data.netWorth >= 0 ? "text-foreground" : "text-destructive"}`}>
          {data.netWorth < 0 ? "-" : ""}{formatCurrency(Math.abs(data.netWorth))}
        </p>
        <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
          {data.monthlyDelta !== 0 && (
            data.monthlyDelta > 0 ? 
              <ArrowUpRight className="w-3 h-3" /> : 
              <ArrowDownRight className="w-3 h-3" />
          )}
          <span className="text-xs">
            {data.monthlyDelta >= 0 ? "+" : ""}{formatCurrency(data.monthlyDelta)} this month
          </span>
        </div>
      </div>

      {/* Assets & Liabilities */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Assets</p>
          <p className="text-sm font-semibold text-vyom-success">{formatCurrency(data.assets)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Liabilities</p>
          <p className="text-sm font-semibold text-destructive">{formatCurrency(data.liabilities)}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Breakdown</p>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Income</span>
          <span className="text-foreground">{formatCurrency(data.breakdown.totalIncome)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Expenses</span>
          <span className="text-foreground">{formatCurrency(data.breakdown.totalExpenses)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Outstanding Loans</span>
          <span className="text-foreground">{formatCurrency(data.breakdown.outstandingLoans)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Insurance Coverage</span>
          <span className="text-foreground">{formatCurrency(data.breakdown.insuranceValue)}</span>
        </div>
      </div>
    </div>
  );
};

export default NetWorthSidebar;
