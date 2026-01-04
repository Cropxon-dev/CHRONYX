import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
  Minimize2,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface CollapsibleNetWorthProps {
  isPinned: boolean;
  onTogglePin: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const CollapsibleNetWorth = ({ isPinned, onTogglePin, isCollapsed, onToggleCollapse }: CollapsibleNetWorthProps) => {
  const { user } = useAuth();
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const calculateNetWorth = useCallback(async () => {
    if (!user) return;

    try {
      const [incomeResult, expensesResult, loansResult, insurancesResult] = await Promise.all([
        supabase.from("income_entries").select("amount, income_date").eq("user_id", user.id),
        supabase.from("expenses").select("amount, expense_date").eq("user_id", user.id),
        supabase.from("loans").select("id, principal_amount, status").eq("user_id", user.id).eq("status", "active"),
        supabase.from("insurances").select("sum_assured, status").eq("user_id", user.id).eq("status", "active"),
      ]);

      const totalIncome = incomeResult.data?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
      const totalExpenses = expensesResult.data?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      let outstandingLoans = 0;
      if (loansResult.data && loansResult.data.length > 0) {
        const loanIds = loansResult.data.map(l => l.id);
        const { data: emiData } = await supabase
          .from("emi_schedule")
          .select("loan_id, remaining_principal, payment_status")
          .in("loan_id", loanIds)
          .eq("payment_status", "Pending")
          .order("emi_month", { ascending: true });

        const loanRemainingMap = new Map<string, number>();
        emiData?.forEach(emi => {
          if (!loanRemainingMap.has(emi.loan_id)) {
            loanRemainingMap.set(emi.loan_id, Number(emi.remaining_principal));
          }
        });
        outstandingLoans = Array.from(loanRemainingMap.values()).reduce((sum, val) => sum + val, 0);
      }

      const insuranceValue = insurancesResult.data?.reduce((sum, ins) => sum + Number(ins.sum_assured), 0) || 0;

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
      const assets = totalIncome + insuranceValue;
      const liabilities = totalExpenses + outstandingLoans;
      const netWorth = assets - liabilities;

      setData({ netWorth, assets, liabilities, monthlyDelta, breakdown: { totalIncome, totalExpenses, outstandingLoans, insuranceValue } });
    } catch (error) {
      console.error("Error calculating net worth:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) calculateNetWorth();
  }, [user, calculateNetWorth]);

  useEffect(() => {
    if (!user) return;

    const channels = [
      supabase.channel('income-changes-nw').on('postgres_changes', { event: '*', schema: 'public', table: 'income_entries' }, calculateNetWorth).subscribe(),
      supabase.channel('expenses-changes-nw').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, calculateNetWorth).subscribe(),
      supabase.channel('loans-changes-nw').on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, calculateNetWorth).subscribe(),
      supabase.channel('emi-changes-nw').on('postgres_changes', { event: '*', schema: 'public', table: 'emi_schedule' }, calculateNetWorth).subscribe(),
      supabase.channel('insurance-changes-nw').on('postgres_changes', { event: '*', schema: 'public', table: 'insurances' }, calculateNetWorth).subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, calculateNetWorth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await calculateNetWorth();
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (absAmount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    if (absAmount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-20 mb-2"></div>
        <div className="h-6 bg-muted rounded w-24"></div>
      </div>
    );
  }

  if (!data) return null;

  const TrendIcon = data.monthlyDelta > 0 ? TrendingUp : data.monthlyDelta < 0 ? TrendingDown : Minus;
  const trendColor = data.monthlyDelta > 0 ? "text-vyom-success" : data.monthlyDelta < 0 ? "text-destructive" : "text-muted-foreground";

  // Minimized view
  if (isCollapsed) {
    return (
      <div className="bg-card border border-border rounded-lg p-2 flex items-center gap-2 cursor-pointer hover:bg-accent/30 transition-colors" onClick={onToggleCollapse}>
        <Wallet className="w-4 h-4 text-vyom-accent" />
        <span className={`text-sm font-semibold ${data.netWorth >= 0 ? "text-foreground" : "text-destructive"}`}>
          {formatCurrency(Math.abs(data.netWorth))}
        </span>
        <TrendIcon className={`w-3 h-3 ${trendColor}`} />
        <Maximize2 className="w-3 h-3 text-muted-foreground ml-auto" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-vyom-accent" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Worth</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onTogglePin} title={isPinned ? "Unpin" : "Pin to screen"}>
            {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleCollapse}>
            <Minimize2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 space-y-3">
        <div>
          <p className={`text-xl font-bold ${data.netWorth >= 0 ? "text-foreground" : "text-destructive"}`}>
            {data.netWorth < 0 ? "-" : ""}{formatCurrency(Math.abs(data.netWorth))}
          </p>
          <div className={`flex items-center gap-1 mt-0.5 ${trendColor}`}>
            {data.monthlyDelta !== 0 && (data.monthlyDelta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
            <span className="text-xs">{data.monthlyDelta >= 0 ? "+" : ""}{formatCurrency(data.monthlyDelta)} this month</span>
          </div>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-7 px-2 text-xs">
              <span>Details</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-vyom-success/10 rounded p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Assets</p>
                <p className="text-xs font-semibold text-vyom-success">{formatCurrency(data.assets)}</p>
              </div>
              <div className="bg-destructive/10 rounded p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Liabilities</p>
                <p className="text-xs font-semibold text-destructive">{formatCurrency(data.liabilities)}</p>
              </div>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Income</span><span>{formatCurrency(data.breakdown.totalIncome)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span>{formatCurrency(data.breakdown.totalExpenses)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Loans</span><span>{formatCurrency(data.breakdown.outstandingLoans)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Insurance</span><span>{formatCurrency(data.breakdown.insuranceValue)}</span></div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default CollapsibleNetWorth;
