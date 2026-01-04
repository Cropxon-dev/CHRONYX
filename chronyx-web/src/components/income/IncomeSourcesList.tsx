import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useToast } from "@/hooks/use-toast";
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
import AddIncomeSourceForm from "./AddIncomeSourceForm";

interface IncomeSource {
  id: string;
  source_name: string;
  category: string;
  frequency: string;
  notes: string | null;
  is_active: boolean;
}

interface IncomeSourcesListProps {
  onUpdate: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Salary: "bg-green-500/10 text-green-600",
  Freelance: "bg-purple-500/10 text-purple-600",
  Business: "bg-blue-500/10 text-blue-600",
  Rental: "bg-orange-500/10 text-orange-600",
  "Investment Returns": "bg-cyan-500/10 text-cyan-600",
  Interest: "bg-yellow-500/10 text-yellow-600",
  Bonus: "bg-pink-500/10 text-pink-600",
  Other: "bg-gray-500/10 text-gray-600",
};

const IncomeSourcesList = ({ onUpdate }: IncomeSourcesListProps) => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSources();
    }
  }, [user]);

  const fetchSources = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("source_name");

    if (error) {
      console.error("Error fetching sources:", error);
    } else {
      setSources(data || []);
    }
    setLoading(false);
  };

  const handleToggleActive = async (source: IncomeSource) => {
    const { error } = await supabase
      .from("income_sources")
      .update({ is_active: !source.is_active })
      .eq("id", source.id);

    if (error) {
      toast({ title: "Error updating source", variant: "destructive" });
    } else {
      toast({ title: source.is_active ? "Source deactivated" : "Source activated" });
      fetchSources();
      onUpdate();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    const { error } = await supabase.from("income_sources").delete().eq("id", deletingId);

    if (error) {
      toast({ title: "Error deleting source", variant: "destructive" });
    } else {
      toast({ title: "Income source deleted" });
      logActivity("Deleted income source", "Income");
      fetchSources();
      onUpdate();
    }
    setDeletingId(null);
  };

  const handleEditSuccess = () => {
    setEditingSource(null);
    logActivity("Updated income source", "Income");
    fetchSources();
    onUpdate();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-muted-foreground">Loading sources...</div>
        </CardContent>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No income sources added yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first income source to start tracking.
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
            Income Sources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                source.is_active ? "bg-card" : "bg-muted/30 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {source.source_name}
                  </p>
                  {!source.is_active && (
                    <Badge variant="outline" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={CATEGORY_COLORS[source.category] || CATEGORY_COLORS.Other}
                  >
                    {source.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {source.frequency}
                  </span>
                </div>
                {source.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{source.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleActive(source)}
                  title={source.is_active ? "Deactivate" : "Activate"}
                >
                  {source.is_active ? (
                    <ToggleRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingSource(source)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeletingId(source.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSource} onOpenChange={() => setEditingSource(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Income Source</DialogTitle>
          </DialogHeader>
          {editingSource && (
            <AddIncomeSourceForm editSource={editingSource} onSuccess={handleEditSuccess} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Source?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the income source. Income entries linked to this source will
              remain but will no longer be associated with it.
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

export default IncomeSourcesList;
