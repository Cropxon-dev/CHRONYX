import AchievementItem from "@/components/dashboard/AchievementItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useActivityLog } from "@/hooks/useActivityLog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const categories = ["All", "Learning", "Finance", "Health", "Personal", "Career"];

const Achievements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  
  const [filter, setFilter] = useState("All");
  const [isAddingAchievement, setIsAddingAchievement] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personal");
  const [achievedAt, setAchievedAt] = useState(format(new Date(), "yyyy-MM-dd"));

  // Fetch achievements
  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ["achievements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("achieved_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Add achievement mutation
  const addAchievementMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("achievements").insert({
        user_id: user!.id,
        title,
        description: description || null,
        category,
        achieved_at: achievedAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      toast({ title: "Achievement added" });
      logActivity(`Added achievement: ${title}`, "Achievements");
      resetForm();
      setIsAddingAchievement(false);
    },
    onError: () => {
      toast({ title: "Failed to add achievement", variant: "destructive" });
    },
  });

  // Update achievement mutation
  const updateAchievementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("achievements")
        .update({
          title,
          description: description || null,
          category,
          achieved_at: achievedAt,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      toast({ title: "Achievement updated" });
      logActivity(`Updated achievement: ${title}`, "Achievements");
      resetForm();
      setEditingAchievement(null);
    },
    onError: () => {
      toast({ title: "Failed to update achievement", variant: "destructive" });
    },
  });

  // Delete achievement mutation
  const deleteAchievementMutation = useMutation({
    mutationFn: async (id: string) => {
      const achievement = achievements.find(a => a.id === id);
      const { error } = await supabase.from("achievements").delete().eq("id", id);
      if (error) throw error;
      return achievement;
    },
    onSuccess: (deletedAchievement) => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      toast({ title: "Achievement deleted" });
      if (deletedAchievement) {
        logActivity(`Deleted achievement: ${deletedAchievement.title}`, "Achievements");
      }
    },
    onError: () => {
      toast({ title: "Failed to delete achievement", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("Personal");
    setAchievedAt(format(new Date(), "yyyy-MM-dd"));
  };

  const openEditDialog = (achievement: typeof achievements[0]) => {
    setTitle(achievement.title);
    setDescription(achievement.description || "");
    setCategory(achievement.category);
    setAchievedAt(achievement.achieved_at);
    setEditingAchievement(achievement.id);
  };

  const filteredAchievements = filter === "All" 
    ? achievements 
    : achievements.filter(a => a.category === filter);

  const currentYear = new Date().getFullYear();
  const thisYearCount = achievements.filter(a => 
    parseISO(a.achieved_at).getFullYear() === currentYear
  ).length;

  const currentMonth = new Date().getMonth();
  const thisMonthCount = achievements.filter(a => {
    const date = parseISO(a.achieved_at);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  }).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-light text-foreground tracking-wide">Achievements</h1>
        <p className="text-sm text-muted-foreground mt-1">Milestones worth remembering</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-semibold text-foreground">{achievements.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-semibold text-foreground">{thisYearCount}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">This Year</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-semibold text-vyom-accent">{thisMonthCount}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">This Month</p>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              filter === cat
                ? "bg-vyom-accent text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-card border border-border rounded-lg p-6">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filteredAchievements.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No achievements yet. Start tracking your milestones!
          </div>
        ) : (
          filteredAchievements.map((achievement) => (
            <div key={achievement.id} className="group relative">
              <AchievementItem 
                date={format(parseISO(achievement.achieved_at), "MMMM d, yyyy")}
                title={achievement.title}
                description={achievement.description || ""}
                category={achievement.category}
              />
              <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditDialog(achievement)}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => deleteAchievementMutation.mutate(achievement.id)}
                  className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Achievement Button */}
      <Button variant="vyom" className="w-full" onClick={() => setIsAddingAchievement(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Achievement
      </Button>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddingAchievement || !!editingAchievement} onOpenChange={(open) => {
        if (!open) {
          setIsAddingAchievement(false);
          setEditingAchievement(null);
          resetForm();
        }
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingAchievement ? "Edit Achievement" : "Add Achievement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What did you achieve?"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {categories.filter(c => c !== "All").map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Date Achieved</label>
              <Input
                type="date"
                value={achievedAt}
                onChange={(e) => setAchievedAt(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this milestone..."
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsAddingAchievement(false);
                  setEditingAchievement(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="vyom"
                className="flex-1"
                disabled={!title.trim()}
                onClick={() => {
                  if (editingAchievement) {
                    updateAchievementMutation.mutate(editingAchievement);
                  } else {
                    addAchievementMutation.mutate();
                  }
                }}
              >
                {editingAchievement ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Achievements;
