import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Target, TrendingUp, Calendar, Wallet } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface SavingsGoal {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const categories = [
  "Emergency Fund",
  "Vacation",
  "Home Purchase",
  "Vehicle",
  "Education",
  "Wedding",
  "Retirement",
  "Investment",
  "General",
  "Other"
];

export const SavingsGoals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  // Form state
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("General");

  // Fetch savings goals
  const { data: savingsGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["savings-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SavingsGoal[];
    },
    enabled: !!user,
  });

  // Fetch income and expenses for automatic calculation
  const { data: financialData } = useQuery({
    queryKey: ["financial-summary", user?.id],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [incomeRes, expenseRes] = await Promise.all([
        supabase
          .from("income_entries")
          .select("amount")
          .gte("income_date", format(startOfMonth, "yyyy-MM-dd"))
          .lte("income_date", format(endOfMonth, "yyyy-MM-dd")),
        supabase
          .from("expenses")
          .select("amount")
          .gte("expense_date", format(startOfMonth, "yyyy-MM-dd"))
          .lte("expense_date", format(endOfMonth, "yyyy-MM-dd")),
      ]);

      const totalIncome = incomeRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalExpenses = expenseRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      return {
        monthlyIncome: totalIncome,
        monthlyExpenses: totalExpenses,
        monthlySavings: totalIncome - totalExpenses,
      };
    },
    enabled: !!user,
  });

  const resetForm = () => {
    setGoalName("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
    setCategory("General");
    setEditingGoal(null);
  };

  // Add goal mutation
  const addGoalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("savings_goals").insert({
        user_id: user!.id,
        goal_name: goalName,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0,
        deadline: deadline || null,
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      toast({ title: "Savings goal created" });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create goal", variant: "destructive" });
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async () => {
      if (!editingGoal) return;
      const { error } = await supabase
        .from("savings_goals")
        .update({
          goal_name: goalName,
          target_amount: parseFloat(targetAmount),
          current_amount: parseFloat(currentAmount) || 0,
          deadline: deadline || null,
          category,
        })
        .eq("id", editingGoal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      toast({ title: "Savings goal updated" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update goal", variant: "destructive" });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("savings_goals")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      toast({ title: "Savings goal removed" });
      setDeleteGoalId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete goal", variant: "destructive" });
    },
  });

  const openEditDialog = (goal: SavingsGoal) => {
    setGoalName(goal.goal_name);
    setTargetAmount(goal.target_amount.toString());
    setCurrentAmount(goal.current_amount.toString());
    setDeadline(goal.deadline || "");
    setCategory(goal.category);
    setEditingGoal(goal);
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalTarget = savingsGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);
    const totalSaved = savingsGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    return { totalTarget, totalSaved, overallProgress };
  }, [savingsGoals]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-light">{savingsGoals.length}</p>
                <p className="text-xs text-muted-foreground">Active Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-light">{formatCurrency(totals.totalSaved)}</p>
                <p className="text-xs text-muted-foreground">Total Saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-light">{formatCurrency(financialData?.monthlySavings || 0)}</p>
                <p className="text-xs text-muted-foreground">Monthly Savings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Calendar className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-light">{totals.overallProgress.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Overall Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Savings Goals</h3>
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Goal
        </Button>
      </div>

      {/* Goals List */}
      {goalsLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : savingsGoals.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No savings goals yet</p>
            <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {savingsGoals.map((goal) => {
            const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
            const remaining = Number(goal.target_amount) - Number(goal.current_amount);
            const daysLeft = goal.deadline
              ? differenceInDays(parseISO(goal.deadline), new Date())
              : null;

            return (
              <Card key={goal.id} className="border-border group">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-foreground">{goal.goal_name}</h4>
                      <p className="text-xs text-muted-foreground">{goal.category}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(goal)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteGoalId(goal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>

                    <Progress
                      value={Math.min(progress, 100)}
                      className={cn(
                        "h-3",
                        progress >= 100 && "bg-emerald-100"
                      )}
                    />

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-foreground font-medium">
                          {formatCurrency(Number(goal.current_amount))}
                        </span>
                        <span className="text-muted-foreground"> / {formatCurrency(Number(goal.target_amount))}</span>
                      </div>
                      {remaining > 0 && (
                        <span className="text-muted-foreground">
                          {formatCurrency(remaining)} to go
                        </span>
                      )}
                      {remaining <= 0 && (
                        <span className="text-emerald-600 font-medium">Goal Reached! 🎉</span>
                      )}
                    </div>

                    {daysLeft !== null && daysLeft > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{daysLeft} days until deadline</span>
                        {financialData?.monthlySavings && financialData.monthlySavings > 0 && (
                          <span className="ml-auto">
                            Est. {Math.ceil(remaining / financialData.monthlySavings)} months to reach
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || !!editingGoal}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
            setIsAddDialogOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "Add Savings Goal"}</DialogTitle>
            <DialogDescription>
              Set a financial target and track your progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Goal Name</Label>
              <Input
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., Emergency Fund"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Amount (₹)</Label>
                <Input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="100000"
                />
              </div>

              <div className="space-y-2">
                <Label>Current Amount (₹)</Label>
                <Input
                  type="number"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="25000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Deadline (Optional)</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => (editingGoal ? updateGoalMutation.mutate() : addGoalMutation.mutate())}
                disabled={!goalName || !targetAmount}
              >
                {editingGoal ? "Update" : "Create Goal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Savings Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this savings goal from your list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGoalId && deleteGoalMutation.mutate(deleteGoalId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
