import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AddExpenseFormProps {
  onSuccess: () => void;
  editExpense?: {
    id: string;
    expense_date: string;
    amount: number;
    category: string;
    sub_category: string | null;
    payment_mode: string;
    notes: string | null;
  };
}

const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer"];

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

const AddExpenseForm = ({ onSuccess, editExpense }: AddExpenseFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const [date, setDate] = useState<Date>(
    editExpense ? new Date(editExpense.expense_date) : new Date()
  );
  const [amount, setAmount] = useState(editExpense?.amount?.toString() || "");
  const [category, setCategory] = useState(editExpense?.category || "");
  const [subCategory, setSubCategory] = useState(editExpense?.sub_category || "");
  const [paymentMode, setPaymentMode] = useState(editExpense?.payment_mode || "UPI");
  const [notes, setNotes] = useState(editExpense?.notes || "");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("expense_categories")
      .select("name")
      .order("name");

    if (data) {
      const uniqueCategories = [...new Set(data.map((c) => c.name))];
      setCategories(uniqueCategories);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !category || !paymentMode) return;

    setLoading(true);

    try {
      const expenseData = {
        user_id: user.id,
        expense_date: format(date, "yyyy-MM-dd"),
        amount: parseFloat(amount),
        category,
        sub_category: subCategory || null,
        payment_mode: paymentMode,
        notes: notes || null,
      };

      if (editExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editExpense.id);

        if (error) throw error;
        toast({ title: "Expense updated" });
      } else {
        const { error } = await supabase.from("expenses").insert(expenseData);
        if (error) throw error;
        toast({ title: "Expense added" });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div className="space-y-2">
        <Label>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
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

      {/* Sub-Category */}
      <div className="space-y-2">
        <Label htmlFor="subCategory">Sub-Category (optional)</Label>
        <Input
          id="subCategory"
          value={subCategory}
          onChange={(e) => setSubCategory(e.target.value)}
          placeholder="e.g., Groceries, Fuel"
        />
      </div>

      {/* Payment Mode */}
      <div className="space-y-2">
        <Label>Payment Mode</Label>
        <Select value={paymentMode} onValueChange={setPaymentMode} required>
          <SelectTrigger>
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {mode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes..."
          rows={2}
        />
      </div>

      <Button type="submit" variant="vyom" className="w-full" disabled={loading}>
        {loading ? "Saving..." : editExpense ? "Update Expense" : "Add Expense"}
      </Button>
    </form>
  );
};

export default AddExpenseForm;
