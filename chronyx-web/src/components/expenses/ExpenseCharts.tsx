import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

interface TrendData {
  month: string;
  amount: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220, 70%, 50%)",
  "hsl(280, 70%, 50%)",
  "hsl(340, 70%, 50%)",
  "hsl(40, 70%, 50%)",
  "hsl(100, 70%, 50%)",
];

const ExpenseCharts = () => {
  const { user } = useAuth();
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [paymentModeData, setPaymentModeData] = useState<CategoryData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChartData();
    }
  }, [user]);

  const fetchChartData = async () => {
    if (!user) return;

    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

    // Fetch this month's expenses for category breakdown
    const { data: monthExpenses } = await supabase
      .from("expenses")
      .select("amount, category, payment_mode, expense_date")
      .eq("user_id", user.id)
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd);

    if (monthExpenses) {
      // Category breakdown
      const categoryTotals: Record<string, number> = {};
      const paymentTotals: Record<string, number> = {};
      const dailyTotals: Record<string, number> = {};

      monthExpenses.forEach((e) => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
        paymentTotals[e.payment_mode] = (paymentTotals[e.payment_mode] || 0) + Number(e.amount);
        dailyTotals[e.expense_date] = (dailyTotals[e.expense_date] || 0) + Number(e.amount);
      });

      const totalAmount = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

      setCategoryData(
        Object.entries(categoryTotals)
          .map(([name, value]) => ({
            name,
            value,
            percentage: totalAmount > 0 ? Math.round((value / totalAmount) * 100) : 0,
          }))
          .sort((a, b) => b.value - a.value)
      );

      setPaymentModeData(
        Object.entries(paymentTotals).map(([name, value]) => ({
          name,
          value,
          percentage: totalAmount > 0 ? Math.round((value / totalAmount) * 100) : 0,
        }))
      );

      // Daily spending for last 14 days
      const last14Days = Array.from({ length: 14 }, (_, i) => {
        const date = format(subDays(new Date(), 13 - i), "yyyy-MM-dd");
        return {
          date: format(subDays(new Date(), 13 - i), "MMM d"),
          amount: dailyTotals[date] || 0,
        };
      });
      setDailyData(last14Days);
    }

    // Fetch last 6 months trend
    const trends: TrendData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const end = format(endOfMonth(monthDate), "yyyy-MM-dd");

      const { data: monthData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .gte("expense_date", start)
        .lte("expense_date", end);

      trends.push({
        month: format(monthDate, "MMM"),
        amount: monthData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
      });
    }
    setTrendData(trends);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Category Breakdown Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
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
              <div className="flex-1 space-y-2">
                {categoryData.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No expense data this month
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Mode Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentModeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentModeData} layout="vertical">
                <XAxis type="number" tickFormatter={formatCurrency} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No expense data this month
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            6-Month Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Spending (Last 14 days) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Daily Spending (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis tickFormatter={formatCurrency} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseCharts;
