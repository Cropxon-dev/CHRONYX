import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import AddExpenseForm from "./AddExpenseForm";

interface Expense {
  id: string;
  expense_date: string;
  amount: number;
  category: string;
  sub_category: string | null;
  payment_mode: string;
  notes: string | null;
  is_auto_generated: boolean;
}

interface ExpensesListProps {
  onUpdate: () => void;
}

const PAYMENT_MODE_COLORS: Record<string, string> = {
  Cash: "bg-green-500/10 text-green-600",
  UPI: "bg-purple-500/10 text-purple-600",
  Card: "bg-blue-500/10 text-blue-600",
  "Bank Transfer": "bg-orange-500/10 text-orange-600",
};

const ExpensesList = ({ onUpdate }: ExpensesListProps) => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const fetchExpenses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching expenses:", error);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    const { error } = await supabase.from("expenses").delete().eq("id", deletingId);

    if (error) {
      toast({ title: "Error deleting expense", variant: "destructive" });
    } else {
      toast({ title: "Expense deleted" });
      logActivity("Deleted expense", "Expenses");
      fetchExpenses();
      onUpdate();
    }
    setDeletingId(null);
  };

  const handleEditSuccess = () => {
    setEditingExpense(null);
    logActivity("Updated expense", "Expenses");
    fetchExpenses();
    onUpdate();
  };

  // Group expenses by date
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const dateKey = expense.expense_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-muted-foreground">Loading expenses...</div>
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No expenses recorded yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first expense to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedExpenses).map(([dateKey, dayExpenses]) => {
            const dayTotal = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
            return (
              <div key={dateKey}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-foreground">
                    {format(parseISO(dateKey), "EEEE, MMM d, yyyy")}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    ₹{dayTotal.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  {dayExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {expense.category}
                            {expense.sub_category && (
                              <span className="text-muted-foreground">
                                {" "}
                                · {expense.sub_category}
                              </span>
                            )}
                          </p>
                          {expense.is_auto_generated && (
                            <Badge variant="outline" className="text-xs">
                              Auto
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              PAYMENT_MODE_COLORS[expense.payment_mode]
                            )}
                          >
                            {expense.payment_mode}
                          </Badge>
                          {expense.notes && (
                            <button
                              onClick={() =>
                                setExpandedId(
                                  expandedId === expense.id ? null : expense.id
                                )
                              }
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              Notes
                              {expandedId === expense.id ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {expandedId === expense.id && expense.notes && (
                          <p className="text-xs text-muted-foreground mt-2 bg-background p-2 rounded">
                            {expense.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          ₹{Number(expense.amount).toLocaleString()}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingExpense(expense)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(expense.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <AddExpenseForm editExpense={editingExpense} onSuccess={handleEditSuccess} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The expense will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Helper for className merging
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export default ExpensesList;
