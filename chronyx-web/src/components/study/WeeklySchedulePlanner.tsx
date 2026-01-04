import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Clock, BookOpen, AlertTriangle } from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface ScheduleEntry {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  topic_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  syllabus_topics?: {
    topic_name: string;
    chapter_name: string;
    priority: number;
    estimated_hours: number;
    is_completed: boolean;
    next_review_date: string | null;
  };
}

interface SyllabusTopic {
  id: string;
  subject: string;
  topic_name: string;
  chapter_name: string;
  priority: number;
  estimated_hours: number;
  is_completed: boolean;
  next_review_date: string | null;
}

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const subjects = [
  "Mathematics",
  "Programming",
  "Philosophy",
  "Language",
  "Science",
  "History",
  "Literature",
  "Art",
  "Music",
  "Other",
];

export const WeeklySchedulePlanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [subject, setSubject] = useState("Programming");
  const [topicId, setTopicId] = useState<string>("");

  // Fetch schedule entries
  const { data: scheduleEntries = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ["weekly-schedule", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_study_schedule")
        .select(`
          *,
          syllabus_topics (
            topic_name,
            chapter_name,
            priority,
            estimated_hours,
            is_completed,
            next_review_date
          )
        `)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;
      return data as ScheduleEntry[];
    },
    enabled: !!user,
  });

  // Fetch syllabus topics for linking
  const { data: syllabusTopics = [] } = useQuery({
    queryKey: ["syllabus-topics-for-schedule", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syllabus_topics")
        .select("*")
        .eq("is_completed", false)
        .order("priority", { ascending: false })
        .order("subject");

      if (error) throw error;
      return data as SyllabusTopic[];
    },
    enabled: !!user,
  });

  // Get recommended topics based on priority and deadline
  const recommendedTopics = useMemo(() => {
    const now = new Date();
    return syllabusTopics
      .map((topic) => {
        let urgencyScore = topic.priority || 1;

        // Increase urgency for topics due for review
        if (topic.next_review_date) {
          const daysUntilReview = differenceInDays(
            parseISO(topic.next_review_date),
            now
          );
          if (daysUntilReview <= 0) {
            urgencyScore += 5; // Overdue
          } else if (daysUntilReview <= 3) {
            urgencyScore += 3;
          } else if (daysUntilReview <= 7) {
            urgencyScore += 1;
          }
        }

        return { ...topic, urgencyScore };
      })
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 10);
  }, [syllabusTopics]);

  // Add schedule entry
  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("weekly_study_schedule").insert({
        user_id: user!.id,
        day_of_week: selectedDay,
        start_time: startTime,
        end_time: endTime,
        subject,
        topic_id: topicId && topicId !== "none" ? topicId : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-schedule"] });
      toast({ title: "Schedule entry added" });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to add entry", variant: "destructive" });
    },
  });

  // Delete schedule entry
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("weekly_study_schedule")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-schedule"] });
      toast({ title: "Schedule entry removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove entry", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedDay(1);
    setStartTime("09:00");
    setEndTime("10:00");
    setSubject("Programming");
    setTopicId("");
  };

  // Group entries by day
  const entriesByDay = useMemo(() => {
    const grouped: Record<number, ScheduleEntry[]> = {};
    daysOfWeek.forEach((_, index) => {
      grouped[index] = [];
    });
    scheduleEntries.forEach((entry) => {
      grouped[entry.day_of_week].push(entry);
    });
    return grouped;
  }, [scheduleEntries]);

  // Calculate total study hours per week
  const totalWeeklyHours = useMemo(() => {
    return scheduleEntries.reduce((total, entry) => {
      const [startH, startM] = entry.start_time.split(":").map(Number);
      const [endH, endM] = entry.end_time.split(":").map(Number);
      const hours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
      return total + hours;
    }, 0);
  }, [scheduleEntries]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const today = new Date().getDay();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Weekly Study Schedule</h3>
          <p className="text-sm text-muted-foreground">
            Plan your study sessions based on syllabus priorities
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-light">{totalWeeklyHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">Weekly Study Time</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Session
          </Button>
        </div>
      </div>

      {/* Recommended Topics */}
      {recommendedTopics.length > 0 && (
        <Card className="border-border bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              Recommended Topics (Priority Based)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recommendedTopics.slice(0, 5).map((topic) => (
                <div
                  key={topic.id}
                  className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                >
                  <span className="font-medium">{topic.topic_name}</span>
                  <span className="text-muted-foreground ml-1">
                    ({topic.subject})
                  </span>
                  {topic.next_review_date &&
                    differenceInDays(parseISO(topic.next_review_date), new Date()) <= 0 && (
                      <span className="ml-1 text-amber-600">• Due for review</span>
                    )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {daysOfWeek.map((day, index) => (
          <Card
            key={day}
            className={cn(
              "border-border",
              index === today && "ring-2 ring-primary/50"
            )}
          >
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle
                className={cn(
                  "text-sm font-medium",
                  index === today && "text-primary"
                )}
              >
                {day}
                {index === today && (
                  <span className="ml-1 text-xs text-muted-foreground">(Today)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {entriesByDay[index].length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  No sessions
                </div>
              ) : (
                <div className="space-y-2">
                  {entriesByDay[index].map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2 bg-muted/50 rounded-lg group relative"
                    >
                      <button
                        onClick={() => deleteEntryMutation.mutate(entry.id)}
                        className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                      </div>
                      <p className="text-sm font-medium truncate">{entry.subject}</p>
                      {entry.syllabus_topics && (
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.syllabus_topics.topic_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Session Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Study Session</DialogTitle>
            <DialogDescription>
              Schedule a recurring study session for your week
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={selectedDay.toString()}
                onValueChange={(v) => setSelectedDay(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day, index) => (
                    <SelectItem key={day} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subj) => (
                    <SelectItem key={subj} value={subj}>
                      {subj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Link to Syllabus Topic (Optional)</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">No topic linked</SelectItem>
                  {syllabusTopics
                    .filter((t) => t.subject === subject)
                    .map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3 h-3" />
                          {topic.topic_name}
                          <span className="text-muted-foreground text-xs">
                            ({topic.chapter_name})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addEntryMutation.mutate()}
                disabled={!startTime || !endTime}
              >
                Add Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
