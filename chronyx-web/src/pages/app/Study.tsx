import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Clock, ChevronDown, Plus, Trash2, Edit2, BarChart3, Timer, Target, BookOpen, Brain, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, subDays, differenceInDays } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudyInsights } from "@/components/study/StudyInsights";
import { StudyTimer } from "@/components/study/StudyTimer";
import { StudyGoals } from "@/components/study/StudyGoals";
import { SubjectColorPicker, useSubjectColors } from "@/components/study/SubjectColorPicker";
import { SpacedRepetition } from "@/components/study/SpacedRepetition";
import { StudyNotes } from "@/components/study/StudyNotes";
import { StudyDataExport } from "@/components/study/StudyDataExport";
import { WeeklySchedulePlanner } from "@/components/study/WeeklySchedulePlanner";
import SimpleSyllabusUploader from "@/components/study/SimpleSyllabusUploader";
import FloatingTimer from "@/components/study/FloatingTimer";

const subjects = ["Mathematics", "Programming", "Philosophy", "Language", "Science", "History", "Literature", "Art", "Music", "Other"];
const focusLevels = ["low", "medium", "high"] as const;

type FocusLevel = typeof focusLevels[number];

// Focus level colors - muted and subtle
const focusColors: Record<FocusLevel, string> = {
  low: "bg-stone-300 dark:bg-stone-600",
  medium: "bg-slate-400 dark:bg-slate-500",
  high: "bg-emerald-300/70 dark:bg-emerald-700/50",
};

const focusLabels: Record<FocusLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const Study = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  
  const [filter, setFilter] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [editingLog, setEditingLog] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("logs");
  const [showTimer, setShowTimer] = useState(false);
  
  // Form state
  const [logDate, setLogDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [subject, setSubject] = useState("Programming");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("");
  const [plannedDuration, setPlannedDuration] = useState("");
  const [focusLevel, setFocusLevel] = useState<FocusLevel>("medium");
  const [notes, setNotes] = useState("");

  // Fetch study logs
  const { data: studyLogs = [], isLoading } = useQuery({
    queryKey: ["study-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_logs")
        .select("*")
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    const todayMinutes = studyLogs
      .filter(log => log.date === today)
      .reduce((acc, log) => acc + log.duration, 0);
    
    const weeklyLogs = studyLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
    });
    
    const weekMinutes = weeklyLogs.reduce((acc, log) => acc + log.duration, 0);
    
    // Calculate streak
    let streak = 0;
    let checkDate = now;
    const logDates = new Set(studyLogs.map(log => log.date));
    
    while (logDates.has(format(checkDate, "yyyy-MM-dd"))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    }
    
    // Primary focus (most studied subject in last 7 days)
    const last7Days = studyLogs.filter(log => {
      const logDate = parseISO(log.date);
      return differenceInDays(now, logDate) <= 7;
    });
    
    const subjectTotals: Record<string, number> = {};
    last7Days.forEach(log => {
      subjectTotals[log.subject] = (subjectTotals[log.subject] || 0) + log.duration;
    });
    
    const primaryFocus = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
    return { todayMinutes, weekMinutes, streak, primaryFocus };
  }, [studyLogs]);

  // Add study log mutation
  const addLogMutation = useMutation({
    mutationFn: async (params?: { timerDuration?: number; timerSubject?: string; timerPlanned?: number }) => {
      const finalDuration = params?.timerDuration || parseInt(duration);
      const finalSubject = params?.timerSubject || subject;
      const finalPlanned = params?.timerPlanned || (plannedDuration ? parseInt(plannedDuration) : null);
      
      const { error } = await supabase.from("study_logs").insert({
        user_id: user!.id,
        subject: finalSubject,
        topic: topic || null,
        duration: finalDuration,
        planned_duration: finalPlanned,
        date: logDate,
        focus_level: focusLevel,
        notes: notes || null,
        is_timer_session: !!params?.timerDuration,
      });
      if (error) throw error;
      return { duration: finalDuration, subject: finalSubject };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["study-logs"] });
      toast({ title: "Study session logged" });
      logActivity(`Logged ${data?.duration || duration} minutes of ${data?.subject || subject} study`, "Study");
      resetForm();
      setIsAddingLog(false);
    },
    onError: () => {
      toast({ title: "Failed to log session", variant: "destructive" });
    },
  });

  // Update study log mutation
  const updateLogMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("study_logs")
        .update({
          subject,
          topic: topic || null,
          duration: parseInt(duration),
          date: logDate,
          focus_level: focusLevel,
          notes: notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-logs"] });
      toast({ title: "Study log updated" });
      logActivity(`Updated study log: ${duration} minutes of ${subject}`, "Study");
      resetForm();
      setEditingLog(null);
    },
    onError: () => {
      toast({ title: "Failed to update log", variant: "destructive" });
    },
  });

  // Delete study log mutation
  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => {
      const log = studyLogs.find(l => l.id === id);
      const { error } = await supabase.from("study_logs").delete().eq("id", id);
      if (error) throw error;
      return log;
    },
    onSuccess: (deletedLog) => {
      queryClient.invalidateQueries({ queryKey: ["study-logs"] });
      toast({ title: "Study log deleted" });
      if (deletedLog) {
        logActivity(`Deleted study log: ${deletedLog.duration} minutes of ${deletedLog.subject}`, "Study");
      }
      setDeleteConfirmId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete log", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setLogDate(format(new Date(), "yyyy-MM-dd"));
    setSubject("Programming");
    setTopic("");
    setDuration("");
    setPlannedDuration("");
    setFocusLevel("medium");
    setNotes("");
  };

  const handleTimerComplete = (timerDuration: number, timerSubject: string, timerPlanned: number) => {
    addLogMutation.mutate({ timerDuration, timerSubject, timerPlanned });
    setShowTimer(false);
  };

  const openEditDialog = (log: typeof studyLogs[0]) => {
    setLogDate(log.date);
    setSubject(log.subject);
    setTopic(log.topic || "");
    setDuration(log.duration.toString());
    setFocusLevel((log.focus_level as FocusLevel) || "medium");
    setNotes(log.notes || "");
    setEditingLog(log.id);
  };

  const filteredLogs = filter 
    ? studyLogs.filter(log => log.subject === filter)
    : studyLogs;

  // Get unique subjects from logs
  const uniqueSubjects = [...new Set(studyLogs.map(log => log.subject))];

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-foreground tracking-wide">Study</h1>
          <p className="text-sm text-muted-foreground mt-1">A quiet record of time invested</p>
        </div>
        <StudyDataExport />
      </header>

      {/* Top Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-light text-foreground tracking-tight">
            {metrics.todayMinutes > 0 ? formatDuration(metrics.todayMinutes) : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 tracking-wide">
            {metrics.todayMinutes > 0 ? "Study Today" : "No study logged today"}
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-light text-foreground tracking-tight">
            {formatDuration(metrics.weekMinutes)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 tracking-wide">This Week</p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-light text-foreground tracking-tight">
            {metrics.streak > 0 ? `${metrics.streak}d` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 tracking-wide">Current Streak</p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-light text-foreground tracking-tight truncate">
            {metrics.primaryFocus || "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 tracking-wide">Primary Focus</p>
        </div>
      </div>

      {/* Timer Toggle */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          className="border-border"
          onClick={() => setShowTimer(!showTimer)}
        >
          <Timer className="w-4 h-4 mr-2" />
          {showTimer ? "Hide Timer" : "Start Timer"}
        </Button>
      </div>

      {/* Floating Timer */}
      <FloatingTimer 
        onComplete={handleTimerComplete}
        subjects={subjects}
        defaultSubject={subject}
        isOpen={showTimer}
        onClose={() => setShowTimer(false)}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="logs" className="data-[state=active]:bg-card">
            Sessions
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-card">
            <FileText className="w-4 h-4 mr-1.5" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="goals" className="data-[state=active]:bg-card">
            <Target className="w-4 h-4 mr-1.5" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="syllabus" className="data-[state=active]:bg-card">
            <BookOpen className="w-4 h-4 mr-1.5" />
            Syllabus
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-card">
            <Clock className="w-4 h-4 mr-1.5" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="review" className="data-[state=active]:bg-card">
            <Brain className="w-4 h-4 mr-1.5" />
            Review
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-card">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          {/* Subject Filters */}
          {uniqueSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter(null)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors border",
                  filter === null
                    ? "bg-card border-border text-foreground"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {uniqueSubjects.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setFilter(subj)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md transition-colors border",
                    filter === subj
                      ? "bg-card border-border text-foreground"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {subj}
                </button>
              ))}
            </div>
          )}

          {/* Study Logs */}
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No study logged yet. Begin when you're ready.</p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingLog(true)}
                  className="border-border"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Study Entry
                </Button>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="group">
                  <div 
                    className="flex items-start justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Focus level indicator */}
                      <div className={cn(
                        "w-1 h-12 rounded-full mt-0.5 flex-shrink-0",
                        focusColors[(log.focus_level as FocusLevel) || "medium"]
                      )} />
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-muted-foreground">{format(parseISO(log.date), "MMM d")}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground mt-0.5">{log.subject}</p>
                        {log.topic && (
                          <p className="text-sm text-muted-foreground truncate">{log.topic}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-sm">{log.duration}m</span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(log);
                          }}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(log.id);
                          }}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      
                      {log.notes && (
                        <ChevronDown className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform",
                          expandedLog === log.id && "rotate-180"
                        )} />
                      )}
                    </div>
                  </div>
                  
                  {expandedLog === log.id && log.notes && (
                    <div className="px-4 pb-4 pt-0 animate-fade-in">
                      <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 ml-4 border-l-2 border-border">
                        {log.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add Log Button */}
          {filteredLogs.length > 0 && (
            <Button 
              variant="outline" 
              className="w-full border-border text-muted-foreground hover:text-foreground" 
              onClick={() => setIsAddingLog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Study Entry
            </Button>
          )}
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <StudyNotes />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <StudyGoals studyLogs={studyLogs} />
        </TabsContent>

        <TabsContent value="syllabus" className="space-y-6">
          <SimpleSyllabusUploader />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <WeeklySchedulePlanner />
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          <SpacedRepetition />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <StudyInsights studyLogs={studyLogs} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddingLog || !!editingLog} onOpenChange={(open) => {
        if (!open) {
          setIsAddingLog(false);
          setEditingLog(null);
          resetForm();
        }
      }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light">{editingLog ? "Edit Study Entry" : "Add Study Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Date</label>
              <Input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Topic</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What did you study?"
                className="bg-background border-border"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Actual (minutes)</label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                  min="1"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Planned (minutes)</label>
                <Input
                  type="number"
                  value={plannedDuration}
                  onChange={(e) => setPlannedDuration(e.target.value)}
                  placeholder="30"
                  min="1"
                  className="bg-background border-border"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Focus Level</label>
              <Select value={focusLevel} onValueChange={(v) => setFocusLevel(v as FocusLevel)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {focusLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", focusColors[level])} />
                        {focusLabels[level]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any reflections..."
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => {
                  setIsAddingLog(false);
                  setEditingLog(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
                <Button
                className="flex-1"
                disabled={!duration || parseInt(duration) <= 0}
                onClick={() => {
                  if (editingLog) {
                    updateLogMutation.mutate(editingLog);
                  } else {
                    addLogMutation.mutate({});
                  }
                }}
              >
                {editingLog ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-light">Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && deleteLogMutation.mutate(deleteConfirmId)}
              className="bg-muted text-foreground hover:bg-muted/80"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Study;
