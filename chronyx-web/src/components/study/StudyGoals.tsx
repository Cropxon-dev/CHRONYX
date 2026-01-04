import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Plus, Target, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { useSubjectColors } from "./SubjectColorPicker";
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

const subjects = ["Mathematics", "Programming", "Philosophy", "Language", "Science", "History", "Literature", "Art", "Music", "Other"];

interface StudyGoal {
  id: string;
  subject: string;
  target_hours_weekly: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

interface StudyLog {
  id: string;
  subject: string;
  duration: number;
  date: string;
}

interface StudyGoalsProps {
  studyLogs: StudyLog[];
}

export const StudyGoals = ({ studyLogs }: StudyGoalsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getColor } = useSubjectColors();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState("Programming");
  const [targetHours, setTargetHours] = useState("10");

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["study-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_goals")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as StudyGoal[];
    },
    enabled: !!user,
  });

  // Calculate weekly progress for each goal
  const weeklyProgress = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const progress: Record<string, { actual: number; target: number; percentage: number }> = {};

    goals.forEach((goal) => {
      const subjectLogs = studyLogs.filter(
        (log) =>
          log.subject === goal.subject &&
          isWithinInterval(parseISO(log.date), { start: weekStart, end: weekEnd })
      );
      const actualMinutes = subjectLogs.reduce((sum, log) => sum + log.duration, 0);
      const actualHours = actualMinutes / 60;
      const targetHours = goal.target_hours_weekly;
      const percentage = Math.min((actualHours / targetHours) * 100, 100);

      progress[goal.id] = { actual: actualHours, target: targetHours, percentage };
    });

    return progress;
  }, [goals, studyLogs]);

  const addGoalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("study_goals").insert({
        user_id: user!.id,
        subject,
        target_hours_weekly: parseInt(targetHours),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-goals"] });
      setIsAdding(false);
      setSubject("Programming");
      setTargetHours("10");
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("study_goals")
        .update({ target_hours_weekly: parseInt(targetHours) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-goals"] });
      setEditingId(null);
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("study_goals")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-goals"] });
    },
  });

  const existingSubjects = goals.map((g) => g.subject);
  const availableSubjects = subjects.filter((s) => !existingSubjects.includes(s));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm text-muted-foreground uppercase tracking-wider">Weekly Goals</h3>
        </div>
        {availableSubjects.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSubject(availableSubjects[0]);
              setIsAdding(true);
            }}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No weekly goals set</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="mt-3 border-border"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = weeklyProgress[goal.id] || { actual: 0, target: goal.target_hours_weekly, percentage: 0 };
            const isEditing = editingId === goal.id;
            const color = getColor(goal.subject);

            return (
              <div
                key={goal.id}
                className="bg-card border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-sm">{goal.subject}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Input
                          type="number"
                          value={targetHours}
                          onChange={(e) => setTargetHours(e.target.value)}
                          className="w-16 h-7 text-sm bg-background border-border"
                          min="1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateGoalMutation.mutate(goal.id)}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {progress.actual.toFixed(1)}h / {progress.target}h
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100"
                          onClick={() => {
                            setTargetHours(goal.target_hours_weekly.toString());
                            setEditingId(goal.id);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-foreground"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress
                    value={progress.percentage}
                    className="h-2 bg-muted"
                    style={{ 
                      '--progress-color': color 
                    } as React.CSSProperties}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {progress.percentage.toFixed(0)}% complete
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">Add Weekly Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {availableSubjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Target Hours per Week</label>
              <Input
                type="number"
                value={targetHours}
                onChange={(e) => setTargetHours(e.target.value)}
                placeholder="10"
                min="1"
                className="bg-background border-border"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => addGoalMutation.mutate()}
                disabled={!targetHours || parseInt(targetHours) <= 0}
              >
                Add Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
