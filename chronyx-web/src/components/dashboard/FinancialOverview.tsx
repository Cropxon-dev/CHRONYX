import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { TrendingUp, TrendingDown, Shield, Landmark, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface LoanProgress {
  id: string;
  bankName: string;
  loanType: string;
  principal: number;
  remaining: number;
  progressPercent: number;
}

interface InsuranceCoverage {
  type: string;
  count: number;
  totalCoverage: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const FinancialOverview = () => {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loanProgress, setLoanProgress] = useState<LoanProgress[]>([]);
  const [insuranceCoverage, setInsuranceCoverage] = useState<InsuranceCoverage[]>([]);
  const [totals, setTotals] = useState({
    monthlyIncome: 0,
    monthlyExpenses: 0,
    totalLoans: 0,
    totalCoverage: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user]);

  const fetchFinancialData = async () => {
    if (!user) return;

    // Fetch last 6 months income vs expenses
    const monthlyStats: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const end = format(endOfMonth(monthDate), "yyyy-MM-dd");

      const [{ data: incomeData }, { data: expenseData }] = await Promise.all([
        supabase
          .from("income_entries")
          .select("amount")
          .eq("user_id", user.id)
          .gte("income_date", start)
          .lte("income_date", end),
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", user.id)
          .gte("expense_date", start)
          .lte("expense_date", end),
      ]);

      monthlyStats.push({
        month: format(monthDate, "MMM"),
        income: incomeData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
        expenses: expenseData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
      });
    }
    setMonthlyData(monthlyStats);

    // Current month totals
    const currentMonthData = monthlyStats[monthlyStats.length - 1];
    setTotals((prev) => ({
      ...prev,
      monthlyIncome: currentMonthData?.income || 0,
      monthlyExpenses: currentMonthData?.expenses || 0,
    }));

    // Fetch loan progress
    const { data: loans } = await supabase
      .from("loans")
      .select("id, bank_name, loan_type, principal_amount, status")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (loans) {
      const loanProgressData: LoanProgress[] = [];
      let totalLoanAmount = 0;

      for (const loan of loans) {
        const { data: schedule } = await supabase
          .from("emi_schedule")
          .select("remaining_principal")
          .eq("loan_id", loan.id)
          .eq("payment_status", "Pending")
          .order("emi_month", { ascending: true })
          .limit(1);

        const remaining = schedule?.[0]?.remaining_principal || 0;
        const principal = Number(loan.principal_amount);
        totalLoanAmount += Number(remaining);

        loanProgressData.push({
          id: loan.id,
          bankName: loan.bank_name,
          loanType: loan.loan_type,
          principal,
          remaining: Number(remaining),
          progressPercent: principal > 0 ? Math.round(((principal - Number(remaining)) / principal) * 100) : 0,
        });
      }

      setLoanProgress(loanProgressData);
      setTotals((prev) => ({ ...prev, totalLoans: totalLoanAmount }));
    }

    // Fetch insurance coverage
    const { data: insurances } = await supabase
      .from("insurances")
      .select("policy_type, sum_assured")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (insurances) {
      const coverageByType: Record<string, { count: number; total: number }> = {};
      let totalCoverage = 0;

      insurances.forEach((ins) => {
        if (!coverageByType[ins.policy_type]) {
          coverageByType[ins.policy_type] = { count: 0, total: 0 };
        }
        coverageByType[ins.policy_type].count++;
        coverageByType[ins.policy_type].total += Number(ins.sum_assured);
        totalCoverage += Number(ins.sum_assured);
      });

      setInsuranceCoverage(
        Object.entries(coverageByType).map(([type, data]) => ({
          type,
          count: data.count,
          totalCoverage: data.total,
        }))
      );
      setTotals((prev) => ({ ...prev, totalCoverage }));
    }

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const netFlow = totals.monthlyIncome - totals.monthlyExpenses;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Income (Month)</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(totals.monthlyIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Expenses (Month)</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(totals.monthlyExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Landmark className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Outstanding Loans</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(totals.totalLoans)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Shield className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Total Coverage</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(totals.totalCoverage)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Net Flow Indicator */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Monthly Net Flow</p>
              <p className={`text-3xl font-semibold mt-1 ${netFlow >= 0 ? "text-green-500" : "text-destructive"}`}>
                {netFlow >= 0 ? "+" : ""}{formatCurrency(netFlow)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${netFlow >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
              {netFlow >= 0 ? (
                <ArrowUpRight className="w-6 h-6 text-green-500" />
              ) : (
                <ArrowDownRight className="w-6 h-6 text-destructive" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income vs Expenses Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Income vs Expenses (6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={formatCurrency} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="income" name="Income" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Loan Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Loan Repayment Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loanProgress.length > 0 ? (
              <div className="space-y-4">
                {loanProgress.map((loan) => (
                  <div key={loan.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">{loan.bankName}</span>
                      <span className="text-muted-foreground">{loan.loanType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${loan.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {loan.progressPercent}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Remaining: {formatCurrency(loan.remaining)}</span>
                      <span>Principal: {formatCurrency(loan.principal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No active loans
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Insurance Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insuranceCoverage.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={insuranceCoverage}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="totalCoverage"
                    >
                      {insuranceCoverage.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {insuranceCoverage.map((item, index) => (
                    <div key={item.type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{item.type}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-foreground">{formatCurrency(item.totalCoverage)}</span>
                        <span className="text-xs text-muted-foreground ml-2">({item.count})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No active policies
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialOverview;
