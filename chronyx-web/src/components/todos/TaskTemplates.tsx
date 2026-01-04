import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Check, Calendar, Clock, Briefcase, Coffee, Users, BookOpen, Dumbbell, Heart, Plus, Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type Priority = "high" | "medium" | "low";

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  isCustom?: boolean;
  tasks: {
    text: string;
    priority: Priority;
    recurrence_type: "daily" | "weekly" | "monthly";
    recurrence_days?: number[];
  }[];
}

interface CustomTemplate {
  id: string;
  name: string;
  description: string | null;
  default_priority: string;
  is_recurring: boolean;
  recurrence_type: string | null;
  recurrence_days: number[] | null;
  icon: string;
}

const builtInTemplates: TaskTemplate[] = [
  {
    id: "daily-standup",
    name: "Daily Standup",
    description: "Morning routine for work planning",
    icon: <Coffee className="w-4 h-4" />,
    category: "Work",
    tasks: [
      { text: "Review yesterday's progress", priority: "medium", recurrence_type: "daily" },
      { text: "Plan today's priorities", priority: "high", recurrence_type: "daily" },
      { text: "Check calendar and meetings", priority: "medium", recurrence_type: "daily" },
    ],
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    description: "End of week reflection and planning",
    icon: <Calendar className="w-4 h-4" />,
    category: "Work",
    tasks: [
      { text: "Review week's accomplishments", priority: "high", recurrence_type: "weekly", recurrence_days: [4] },
      { text: "Clear inbox and pending items", priority: "medium", recurrence_type: "weekly", recurrence_days: [4] },
      { text: "Plan next week's goals", priority: "high", recurrence_type: "weekly", recurrence_days: [4] },
      { text: "Update project status", priority: "medium", recurrence_type: "weekly", recurrence_days: [4] },
    ],
  },
  {
    id: "morning-routine",
    name: "Morning Routine",
    description: "Start your day right",
    icon: <Clock className="w-4 h-4" />,
    category: "Personal",
    tasks: [
      { text: "Morning meditation", priority: "medium", recurrence_type: "daily" },
      { text: "Exercise", priority: "high", recurrence_type: "daily" },
      { text: "Review daily goals", priority: "high", recurrence_type: "daily" },
    ],
  },
  {
    id: "study-session",
    name: "Study Session",
    description: "Focused learning blocks",
    icon: <BookOpen className="w-4 h-4" />,
    category: "Learning",
    tasks: [
      { text: "Review previous notes", priority: "medium", recurrence_type: "daily" },
      { text: "Complete focused study block", priority: "high", recurrence_type: "daily" },
      { text: "Practice problems/exercises", priority: "medium", recurrence_type: "daily" },
      { text: "Update study log", priority: "low", recurrence_type: "daily" },
    ],
  },
  {
    id: "fitness-routine",
    name: "Fitness Routine",
    description: "Stay active throughout the week",
    icon: <Dumbbell className="w-4 h-4" />,
    category: "Health",
    tasks: [
      { text: "Strength training", priority: "high", recurrence_type: "weekly", recurrence_days: [0, 2, 4] },
      { text: "Cardio session", priority: "high", recurrence_type: "weekly", recurrence_days: [1, 3] },
      { text: "Stretching/Yoga", priority: "medium", recurrence_type: "daily" },
    ],
  },
  {
    id: "team-sync",
    name: "Team Sync",
    description: "Regular team communication",
    icon: <Users className="w-4 h-4" />,
    category: "Work",
    tasks: [
      { text: "Team standup meeting", priority: "high", recurrence_type: "weekly", recurrence_days: [0, 1, 2, 3, 4] },
      { text: "One-on-one check-in", priority: "medium", recurrence_type: "weekly", recurrence_days: [2] },
      { text: "Team retrospective", priority: "medium", recurrence_type: "weekly", recurrence_days: [4] },
    ],
  },
  {
    id: "self-care",
    name: "Self Care",
    description: "Wellness and mental health",
    icon: <Heart className="w-4 h-4" />,
    category: "Health",
    tasks: [
      { text: "Journaling", priority: "medium", recurrence_type: "daily" },
      { text: "Digital detox hour", priority: "low", recurrence_type: "daily" },
      { text: "Connect with a friend", priority: "medium", recurrence_type: "weekly", recurrence_days: [5, 6] },
    ],
  },
  {
    id: "project-management",
    name: "Project Management",
    description: "Keep projects on track",
    icon: <Briefcase className="w-4 h-4" />,
    category: "Work",
    tasks: [
      { text: "Update project board", priority: "medium", recurrence_type: "daily" },
      { text: "Review blocked items", priority: "high", recurrence_type: "daily" },
      { text: "Stakeholder update", priority: "medium", recurrence_type: "weekly", recurrence_days: [4] },
    ],
  },
];

const categoryColors: Record<string, string> = {
  Work: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  Personal: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  Learning: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Health: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  Custom: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

interface TaskTemplatesProps {
  onApplyTemplate: (tasks: TaskTemplate["tasks"]) => void;
}

export default function TaskTemplates({ onApplyTemplate }: TaskTemplatesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("builtin");
  
  // New template form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newRecurring, setNewRecurring] = useState(false);
  const [newRecurrenceType, setNewRecurrenceType] = useState<"daily" | "weekly" | "monthly">("daily");

  // Fetch custom templates
  const { data: customTemplates = [] } = useQuery({
    queryKey: ["task_templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomTemplate[];
    },
    enabled: !!user,
  });

  // Create custom template mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("task_templates").insert({
        user_id: user.id,
        name: newName,
        description: newDescription || null,
        default_priority: newPriority,
        is_recurring: newRecurring,
        recurrence_type: newRecurring ? newRecurrenceType : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_templates"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Template created" });
    },
  });

  // Delete custom template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const resetForm = () => {
    setNewName("");
    setNewDescription("");
    setNewPriority("medium");
    setNewRecurring(false);
    setNewRecurrenceType("daily");
  };

  const handleApply = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate.tasks);
      setOpen(false);
      setSelectedTemplate(null);
    }
  };

  const handleApplyCustom = (template: CustomTemplate) => {
    const tasks: TaskTemplate["tasks"] = [{
      text: template.name,
      priority: template.default_priority as Priority,
      recurrence_type: (template.recurrence_type as "daily" | "weekly" | "monthly") || "daily",
      recurrence_days: template.recurrence_days || undefined,
    }];
    onApplyTemplate(tasks);
    setOpen(false);
    toast({ title: "Template applied" });
  };

  // Convert custom templates for display
  const customTemplateCards: TaskTemplate[] = customTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description || "Custom template",
    icon: <Star className="w-4 h-4" />,
    category: "Custom",
    isCustom: true,
    tasks: [{
      text: t.name,
      priority: t.default_priority as Priority,
      recurrence_type: (t.recurrence_type as "daily" | "weekly" | "monthly") || "daily",
      recurrence_days: t.recurrence_days || undefined,
    }],
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Layers className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Task Templates</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Quick-start with pre-built task routines or create your own
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="builtin">Built-in</TabsTrigger>
            <TabsTrigger value="custom">My Templates ({customTemplates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="builtin" className="flex-1 overflow-y-auto mt-4">
            <div className="grid gap-3">
              {builtInTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-all",
                    selectedTemplate?.id === template.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30 bg-card"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{template.name}</h3>
                        <Badge variant="outline" className={cn("text-xs", categoryColors[template.category])}>
                          {template.category}
                        </Badge>
                        {selectedTemplate?.id === template.id && (
                          <Check className="w-4 h-4 text-primary ml-auto" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {template.tasks.slice(0, 3).map((task, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                          >
                            {task.text.length > 25 ? task.text.substring(0, 25) + "..." : task.text}
                          </span>
                        ))}
                        {template.tasks.length > 3 && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                            +{template.tasks.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Template
              </Button>

              {customTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No custom templates yet</p>
                  <p className="text-xs mt-1">Create templates for tasks you use often</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {customTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 rounded-lg border border-border bg-card hover:border-muted-foreground/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-amber-500/10">
                          <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">{template.name}</h3>
                            <Badge variant="outline" className={cn("text-xs", categoryColors.Custom)}>
                              Custom
                            </Badge>
                            {template.is_recurring && (
                              <Badge variant="secondary" className="text-xs">
                                {template.recurrence_type}
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {template.default_priority} priority
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleApplyCustom(template)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {selectedTemplate && activeTab === "builtin" && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{selectedTemplate.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedTemplate.tasks.length} tasks will be created
                </p>
              </div>
              <Button onClick={handleApply}>
                Apply Template
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Create Custom Template Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Template Name</label>
              <Input
                placeholder="e.g., Morning Standup"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
              <Textarea
                placeholder="What is this template for?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Default Priority</label>
              <Select value={newPriority} onValueChange={(v: Priority) => setNewPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring"
                checked={newRecurring}
                onChange={(e) => setNewRecurring(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="recurring" className="text-sm">Recurring task</label>
            </div>
            {newRecurring && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Recurrence</label>
                <Select value={newRecurrenceType} onValueChange={(v: "daily" | "weekly" | "monthly") => setNewRecurrenceType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createMutation.mutate()} 
              disabled={!newName.trim() || createMutation.isPending}
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
