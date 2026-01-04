import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
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
import AddIncomeEntryForm from "./AddIncomeEntryForm";

interface IncomeEntry {
  id: string;
  income_date: string;
  amount: number;
  income_source_id: string | null;
  notes: string | null;
  income_sources?: {
    source_name: string;
    category: string;
  } | null;
}

interface IncomeEntriesListProps {
  onUpdate: () => void;
}

const IncomeEntriesList = ({ onUpdate }: IncomeEntriesListProps) => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("income_entries")
      .select(`
        *,
        income_sources (source_name, category)
      `)
      .eq("user_id", user.id)
      .order("income_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching entries:", error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    const { error } = await supabase.from("income_entries").delete().eq("id", deletingId);

    if (error) {
      toast({ title: "Error deleting entry", variant: "destructive" });
    } else {
      toast({ title: "Income entry deleted" });
      logActivity("Deleted income entry", "Income");
      fetchEntries();
      onUpdate();
    }
    setDeletingId(null);
  };

  const handleEditSuccess = () => {
    setEditingEntry(null);
    logActivity("Updated income entry", "Income");
    fetchEntries();
    onUpdate();
  };

  // Group entries by month
  const groupedEntries = entries.reduce((acc, entry) => {
    const monthKey = format(parseISO(entry.income_date), "MMMM yyyy");
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(entry);
    return acc;
  }, {} as Record<string, IncomeEntry[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-muted-foreground">Loading income entries...</div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No income entries recorded yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first income entry to start tracking.
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
            Income History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedEntries).map(([monthKey, monthEntries]) => {
            const monthTotal = monthEntries.reduce((sum, e) => sum + Number(e.amount), 0);
            return (
              <div key={monthKey}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-foreground">{monthKey}</p>
                  <p className="text-sm font-medium text-green-600">
                    +₹{monthTotal.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  {monthEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {entry.income_sources?.source_name || "Uncategorized"}
                          </p>
                          {entry.income_sources?.category && (
                            <Badge variant="secondary" className="text-xs">
                              {entry.income_sources.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(entry.income_date), "MMM d, yyyy")}
                          {entry.notes && ` · ${entry.notes}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-green-600">
                          +₹{Number(entry.amount).toLocaleString()}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(entry.id)}
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
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Income Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <AddIncomeEntryForm editEntry={editingEntry} onSuccess={handleEditSuccess} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The income entry will be permanently deleted.
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

export default IncomeEntriesList;
