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

interface IncomeSource {
  id: string;
  source_name: string;
  category: string;
}

interface AddIncomeEntryFormProps {
  onSuccess: () => void;
  editEntry?: {
    id: string;
    income_date: string;
    amount: number;
    income_source_id: string | null;
    notes: string | null;
  };
}

const AddIncomeEntryForm = ({ onSuccess, editEntry }: AddIncomeEntryFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<IncomeSource[]>([]);

  const [date, setDate] = useState<Date>(
    editEntry ? new Date(editEntry.income_date) : new Date()
  );
  const [amount, setAmount] = useState(editEntry?.amount?.toString() || "");
  const [sourceId, setSourceId] = useState(editEntry?.income_source_id || "");
  const [notes, setNotes] = useState(editEntry?.notes || "");

  useEffect(() => {
    fetchSources();
  }, [user]);

  const fetchSources = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("income_sources")
      .select("id, source_name, category")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("source_name");

    if (data) {
      setSources(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) return;

    setLoading(true);

    try {
      const entryData = {
        user_id: user.id,
        income_date: format(date, "yyyy-MM-dd"),
        amount: parseFloat(amount),
        income_source_id: sourceId || null,
        notes: notes || null,
      };

      if (editEntry) {
        const { error } = await supabase
          .from("income_entries")
          .update(entryData)
          .eq("id", editEntry.id);

        if (error) throw error;
        toast({ title: "Income entry updated" });
      } else {
        const { error } = await supabase.from("income_entries").insert(entryData);
        if (error) throw error;
        toast({ title: "Income entry added" });
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

      {/* Source */}
      <div className="space-y-2">
        <Label>Source (optional)</Label>
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger>
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            {sources.length === 0 ? (
              <SelectItem value="" disabled>
                No sources - add one first
              </SelectItem>
            ) : (
              sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.source_name} ({source.category})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
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
        {loading ? "Saving..." : editEntry ? "Update Entry" : "Add Income"}
      </Button>
    </form>
  );
};

export default AddIncomeEntryForm;
