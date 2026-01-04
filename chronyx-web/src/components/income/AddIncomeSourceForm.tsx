import { useState } from "react";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AddIncomeSourceFormProps {
  onSuccess: () => void;
  editSource?: {
    id: string;
    source_name: string;
    category: string;
    frequency: string;
    notes: string | null;
  };
}

const CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Rental",
  "Investment Returns",
  "Interest",
  "Bonus",
  "Other",
];

const FREQUENCIES = ["Monthly", "Quarterly", "Yearly", "Irregular"];

const AddIncomeSourceForm = ({ onSuccess, editSource }: AddIncomeSourceFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [sourceName, setSourceName] = useState(editSource?.source_name || "");
  const [category, setCategory] = useState(editSource?.category || "");
  const [frequency, setFrequency] = useState(editSource?.frequency || "Monthly");
  const [notes, setNotes] = useState(editSource?.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !sourceName || !category || !frequency) return;

    setLoading(true);

    try {
      const sourceData = {
        user_id: user.id,
        source_name: sourceName,
        category,
        frequency,
        notes: notes || null,
      };

      if (editSource) {
        const { error } = await supabase
          .from("income_sources")
          .update(sourceData)
          .eq("id", editSource.id);

        if (error) throw error;
        toast({ title: "Income source updated" });
      } else {
        const { error } = await supabase.from("income_sources").insert(sourceData);
        if (error) throw error;
        toast({ title: "Income source added" });
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
      {/* Source Name */}
      <div className="space-y-2">
        <Label htmlFor="sourceName">Source Name</Label>
        <Input
          id="sourceName"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="e.g., Company Name, Client, Property"
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
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={setFrequency} required>
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((freq) => (
              <SelectItem key={freq} value={freq}>
                {freq}
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
        {loading ? "Saving..." : editSource ? "Update Source" : "Add Source"}
      </Button>
    </form>
  );
};

export default AddIncomeSourceForm;
