import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle, Target } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BudgetLimit {
  id: string;
  category: string;
  monthly_limit: number;
  spent: number;
  percentage: number;
}

const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Rent",
  "Utilities",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Travel",
  "Insurance Premium",
  "Loan EMI",
  "Other",
];

const BudgetPlanner = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetLimit | null>(null);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");

  useEffect(() => {
    if (user) fetchBudgets();
  }, [user]);

  const fetchBudgets = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch budget limits
      const { data: limits, error } = await supabase
        .from("budget_limits")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      // Fetch this month's expenses
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

      const { data: expenses } = await supabase
        .from("expenses")
        .select("category, amount")
        .eq("user_id", user.id)
        .gte("expense_date", monthStart)
        .lte("expense_date", monthEnd);

      // Calculate spending per category
      const spendingByCategory: Record<string, number> = {};
      expenses?.forEach((e) => {
        spendingByCategory[e.category] = (spendingByCategory[e.category] || 0) + Number(e.amount);
      });

      // Combine data
      const budgetData: BudgetLimit[] = (limits || []).map((b: any) => {
        const spent = spendingByCategory[b.category] || 0;
        return {
          id: b.id,
          category: b.category,
          monthly_limit: Number(b.monthly_limit),
          spent,
          percentage: (spent / Number(b.monthly_limit)) * 100,
        };
      });

      setBudgets(budgetData.sort((a, b) => b.percentage - a.percentage));
    } catch (error) {
      console.error("Error fetching budgets:", error);
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !category || !limit) return;

    try {
      if (selectedBudget) {
        // Update
        const { error } = await supabase
          .from("budget_limits")
          .update({ monthly_limit: parseFloat(limit) })
          .eq("id", selectedBudget.id);

        if (error) throw error;
        toast.success("Budget updated");
      } else {
        // Insert
        const { error } = await supabase.from("budget_limits").insert({
          user_id: user.id,
          category,
          monthly_limit: parseFloat(limit),
        });

        if (error) throw error;
        toast.success("Budget limit added");
      }

      setDialogOpen(false);
      setCategory("");
      setLimit("");
      setSelectedBudget(null);
      fetchBudgets();
    } catch (error: any) {
      console.error("Error saving budget:", error);
      if (error.code === "23505") {
        toast.error("Budget limit for this category already exists");
      } else {
        toast.error("Failed to save budget");
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedBudget) return;

    try {
      const { error } = await supabase
        .from("budget_limits")
        .delete()
        .eq("id", selectedBudget.id);

      if (error) throw error;
      toast.success("Budget limit removed");
      setDeleteDialogOpen(false);
      setSelectedBudget(null);
      fetchBudgets();
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.error("Failed to delete budget");
    }
  };

  const openEditDialog = (budget: BudgetLimit) => {
    setSelectedBudget(budget);
    setCategory(budget.category);
    setLimit(budget.monthly_limit.toString());
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setSelectedBudget(null);
    setCategory("");
    setLimit("");
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 80) return "text-amber-500";
    return "text-green-500";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-green-500";
  };

  const usedCategories = budgets.map((b) => b.category);
  const availableCategories = DEFAULT_CATEGORIES.filter(
    (c) => !usedCategories.includes(c) || c === selectedBudget?.category
  );

  const overBudgetCount = budgets.filter((b) => b.percentage >= 100).length;
  const nearLimitCount = budgets.filter((b) => b.percentage >= 80 && b.percentage < 100).length;
  const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Target className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Total Budget</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(totalBudget)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <span className="text-xs uppercase tracking-wider">Total Spent</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(totalSpent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Over Budget</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{overBudgetCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Near Limit</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{nearLimitCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Category Budgets
        </h2>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Budget List */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          Loading...
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No budgets set</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set monthly limits for your expense categories
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => (
            <Card key={budget.id} className="group">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {budget.percentage >= 100 ? (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    ) : budget.percentage >= 80 ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{budget.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(budget.spent)} of {formatCurrency(budget.monthly_limit)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", getStatusColor(budget.percentage))}>
                      {budget.percentage.toFixed(0)}%
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(budget)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setSelectedBudget(budget);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all rounded-full",
                      getProgressColor(budget.percentage)
                    )}
                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                  />
                </div>
                {budget.percentage >= 80 && budget.percentage < 100 && (
                  <p className="text-xs text-amber-500 mt-2">
                    ⚠️ Approaching limit - {formatCurrency(budget.monthly_limit - budget.spent)} remaining
                  </p>
                )}
                {budget.percentage >= 100 && (
                  <p className="text-xs text-destructive mt-2">
                    🚨 Over budget by {formatCurrency(budget.spent - budget.monthly_limit)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBudget ? "Edit Budget" : "Add Budget Limit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Category</label>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={!!selectedBudget}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Monthly Limit (₹)</label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="10000"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!category || !limit}>
              {selectedBudget ? "Update" : "Add"} Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget Limit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the budget limit for {selectedBudget?.category}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BudgetPlanner;
