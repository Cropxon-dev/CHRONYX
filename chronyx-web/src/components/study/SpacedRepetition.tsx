import { useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, Clock, RotateCcw, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInDays, addDays, isToday, isPast, isFuture } from "date-fns";
import { useSubjectColors } from "./SubjectColorPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface SyllabusTopic {
  id: string;
  subject: string;
  chapter_name: string;
  topic_name: string;
  is_completed: boolean;
  completed_at: string | null;
  next_review_date: string | null;
  review_count: number;
  interval_days: number;
  ease_factor: number;
}

// SM-2 Algorithm implementation
const calculateNextReview = (
  quality: number, // 0-5 scale (0-2: fail, 3-5: pass)
  currentInterval: number,
  currentEaseFactor: number,
  reviewCount: number
): { interval: number; easeFactor: number } => {
  let newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, newEaseFactor); // Minimum ease factor

  let newInterval: number;
  
  if (quality < 3) {
    // Failed review - reset
    newInterval = 1;
  } else {
    if (reviewCount === 0) {
      newInterval = 1;
    } else if (reviewCount === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * newEaseFactor);
    }
  }

  return { interval: newInterval, easeFactor: newEaseFactor };
};

const qualityLabels: Record<number, { label: string; color: string; description: string }> = {
  0: { label: "Forgot", color: "bg-destructive/20 text-destructive hover:bg-destructive/30", description: "Complete blackout" },
  1: { label: "Hard", color: "bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/30", description: "Incorrect, but remembered upon seeing" },
  2: { label: "Difficult", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30", description: "Struggled to recall" },
  3: { label: "Okay", color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30", description: "Recalled with effort" },
  4: { label: "Good", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30", description: "Recalled easily" },
  5: { label: "Easy", color: "bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30", description: "Perfect recall" },
};

export const SpacedRepetition = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getColor } = useSubjectColors();
  const [reviewingTopic, setReviewingTopic] = useState<SyllabusTopic | null>(null);

  // Fetch completed topics that need review
  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["syllabus-topics-review", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syllabus_topics")
        .select("*")
        .eq("is_completed", true)
        .order("next_review_date", { ascending: true });
      if (error) throw error;
      return data as SyllabusTopic[];
    },
    enabled: !!user,
  });

  // Update review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ topicId, quality }: { topicId: string; quality: number }) => {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) throw new Error("Topic not found");

      const { interval, easeFactor } = calculateNextReview(
        quality,
        topic.interval_days,
        topic.ease_factor,
        topic.review_count
      );

      const nextReviewDate = format(addDays(new Date(), interval), "yyyy-MM-dd");

      const { error } = await supabase
        .from("syllabus_topics")
        .update({
          next_review_date: nextReviewDate,
          interval_days: interval,
          ease_factor: easeFactor,
          review_count: topic.review_count + 1,
        })
        .eq("id", topicId);
      
      if (error) throw error;
      return { interval, nextReviewDate };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-topics-review"] });
      queryClient.invalidateQueries({ queryKey: ["syllabus-topics"] });
      toast({ 
        title: "Review recorded",
        description: `Next review in ${data.interval} day${data.interval === 1 ? '' : 's'}`,
      });
      setReviewingTopic(null);
    },
  });

  // Categorize topics
  const now = new Date();
  const dueToday = topics.filter(t => t.next_review_date && isToday(parseISO(t.next_review_date)));
  const overdue = topics.filter(t => t.next_review_date && isPast(parseISO(t.next_review_date)) && !isToday(parseISO(t.next_review_date)));
  const upcoming = topics.filter(t => t.next_review_date && isFuture(parseISO(t.next_review_date)))
    .slice(0, 10);
  const needsScheduling = topics.filter(t => !t.next_review_date);

  // Schedule first review for newly completed topics
  const scheduleReviewMutation = useMutation({
    mutationFn: async (topicId: string) => {
      const nextReviewDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
      const { error } = await supabase
        .from("syllabus_topics")
        .update({ 
          next_review_date: nextReviewDate,
          interval_days: 1,
          review_count: 0,
        })
        .eq("id", topicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-topics-review"] });
      queryClient.invalidateQueries({ queryKey: ["syllabus-topics"] });
      toast({ title: "Review scheduled for tomorrow" });
    },
  });

  const TopicCard = ({ topic, showActions = true }: { topic: SyllabusTopic; showActions?: boolean }) => {
    const daysUntil = topic.next_review_date 
      ? differenceInDays(parseISO(topic.next_review_date), now)
      : null;
    const isOverdue = daysUntil !== null && daysUntil < 0;
    const isDueToday = daysUntil === 0;

    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 bg-card border rounded-lg transition-colors",
        isOverdue ? "border-destructive/50" : isDueToday ? "border-primary/50" : "border-border"
      )}>
        <div 
          className="w-2 h-10 rounded-full flex-shrink-0"
          style={{ backgroundColor: getColor(topic.subject) }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{topic.topic_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {topic.subject} → {topic.chapter_name}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className={cn(
              "text-xs",
              isOverdue ? "text-destructive" : isDueToday ? "text-primary" : "text-muted-foreground"
            )}>
              {daysUntil === null 
                ? "Not scheduled"
                : isOverdue 
                  ? `${Math.abs(daysUntil)}d overdue` 
                  : isDueToday 
                    ? "Due today"
                    : `In ${daysUntil}d`}
            </p>
            <p className="text-xs text-muted-foreground">
              {topic.review_count} review{topic.review_count !== 1 ? 's' : ''}
            </p>
          </div>
          {showActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReviewingTopic(topic)}
              className="h-8"
            >
              <Brain className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading review schedule...</div>;
  }

  const totalDue = dueToday.length + overdue.length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-primary">
            <Brain className="w-4 h-4" />
            <span className="text-2xl font-light">{totalDue}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Due for Review</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-2xl font-light">{overdue.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Overdue</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-2xl font-light">{upcoming.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-2xl font-light">{topics.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Total Topics</p>
        </div>
      </div>

      {/* Topics Needing Schedule */}
      {needsScheduling.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Newly Completed — Schedule Reviews
            </h3>
          </div>
          <div className="space-y-2">
            {needsScheduling.slice(0, 5).map((topic) => (
              <div 
                key={topic.id} 
                className="flex items-center gap-3 px-4 py-3 bg-card border border-dashed border-border rounded-lg"
              >
                <div 
                  className="w-2 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColor(topic.subject) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{topic.topic_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {topic.subject} → {topic.chapter_name}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scheduleReviewMutation.mutate(topic.id)}
                  disabled={scheduleReviewMutation.isPending}
                  className="h-8 border-border"
                >
                  <Clock className="w-4 h-4 mr-1.5" />
                  Schedule
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Overdue Reviews */}
      {overdue.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-destructive uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Overdue Reviews
          </h3>
          <div className="space-y-2">
            {overdue.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>
      )}

      {/* Due Today */}
      {dueToday.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-primary uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Due Today
          </h3>
          <div className="space-y-2">
            {dueToday.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming Reviews
          </h3>
          <div className="space-y-2">
            {upcoming.map((topic) => (
              <TopicCard key={topic.id} topic={topic} showActions={false} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {topics.length === 0 && (
        <div className="py-12 text-center">
          <Brain className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-2">No topics to review yet</p>
          <p className="text-xs text-muted-foreground">Complete syllabus topics to start spaced repetition</p>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewingTopic} onOpenChange={() => setReviewingTopic(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">Review Topic</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              How well did you remember this topic?
            </DialogDescription>
          </DialogHeader>
          {reviewingTopic && (
            <div className="space-y-6 pt-2">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium">{reviewingTopic.topic_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {reviewingTopic.subject} → {reviewingTopic.chapter_name}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>Reviews: {reviewingTopic.review_count}</span>
                  <span>Interval: {reviewingTopic.interval_days}d</span>
                  <span>Ease: {reviewingTopic.ease_factor.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Rate your recall:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((quality) => (
                    <Button
                      key={quality}
                      variant="ghost"
                      onClick={() => reviewMutation.mutate({ topicId: reviewingTopic.id, quality })}
                      disabled={reviewMutation.isPending}
                      className={cn("h-auto py-3 flex-col", qualityLabels[quality].color)}
                    >
                      <span className="text-sm font-medium">{qualityLabels[quality].label}</span>
                      <span className="text-xs opacity-70 mt-0.5">{qualityLabels[quality].description}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
