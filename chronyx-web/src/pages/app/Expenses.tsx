import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, IndianRupee, TrendingUp, Calendar, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import ExpensesList from "@/components/expenses/ExpensesList";
import AddExpenseForm from "@/components/expenses/AddExpenseForm";
import ExpenseCharts from "@/components/expenses/ExpenseCharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ExpenseStats {
  todayTotal: number;
  monthTotal: number;
  topCategory: string;
  avgDaily: number;
}

const Expenses = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();
  const [stats, setStats] = useState<ExpenseStats>({
    todayTotal: 0,
    monthTotal: 0,
    topCategory: "-",
    avgDaily: 0,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, refreshKey]);

  const fetchStats = async () => {
    if (!user) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

    // Today's expenses
    const { data: todayExpenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .eq("expense_date", today);

    const todayTotal = todayExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // This month's expenses
    const { data: monthExpenses } = await supabase
      .from("expenses")
      .select("amount, category, expense_date")
      .eq("user_id", user.id)
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd);

    const monthTotal = monthExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // Top category
    const categoryTotals: Record<string, number> = {};
    monthExpenses?.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    // Average daily
    const uniqueDays = new Set(monthExpenses?.map((e) => e.expense_date)).size;
    const avgDaily = uniqueDays > 0 ? monthTotal / uniqueDays : 0;

    setStats({
      todayTotal,
      monthTotal,
      topCategory,
      avgDaily: Math.round(avgDaily),
    });
  };

  const handleExpenseAdded = () => {
    setIsDialogOpen(false);
    setRefreshKey((k) => k + 1);
    logActivity("Added expense", "Expenses");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-foreground tracking-wide">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your daily spending</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="vyom">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <AddExpenseForm onSuccess={handleExpenseAdded} />
          </DialogContent>
        </Dialog>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              ₹{stats.todayTotal.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              ₹{stats.monthTotal.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Top Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground truncate">
              {stats.topCategory}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <IndianRupee className="w-3.5 h-3.5" />
              Avg Daily
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              ₹{stats.avgDaily.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Charts Section */}
      <section>
        <h2 className="text-lg font-light text-foreground mb-4">Analytics</h2>
        <ExpenseCharts key={`charts-${refreshKey}`} />
      </section>

      {/* Expenses List */}
      <ExpensesList key={refreshKey} onUpdate={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
};

export default Expenses;
