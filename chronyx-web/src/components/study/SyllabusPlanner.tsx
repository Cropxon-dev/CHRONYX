import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { FileText, Plus, Trash2, Check, GripVertical, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSubjectColors } from "./SubjectColorPicker";
import SyllabusUploader from "./SyllabusUploader";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const subjects = ["Mathematics", "Programming", "Philosophy", "Language", "Science", "History", "Literature", "Art", "Music", "Other"];

interface SyllabusTopic {
  id: string;
  subject: string;
  chapter_name: string;
  topic_name: string;
  estimated_hours: number;
  is_completed: boolean;
  completed_at: string | null;
  priority: number;
  notes: string | null;
  sort_order: number;
}

export const SyllabusPlanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getColor } = useSubjectColors();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isUploadingDialog, setIsUploadingDialog] = useState(false);
  const [uploadSubject, setUploadSubject] = useState("Programming");
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Manual topic form
  const [chapter, setChapter] = useState("");
  const [topicName, setTopicName] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("1");

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["syllabus-topics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syllabus_topics")
        .select("*")
        .order("subject")
        .order("sort_order");
      if (error) throw error;
      return data as SyllabusTopic[];
    },
    enabled: !!user,
  });

  // Group topics by subject and chapter
  const groupedTopics = topics.reduce((acc, topic) => {
    if (!acc[topic.subject]) acc[topic.subject] = {};
    if (!acc[topic.subject][topic.chapter_name]) acc[topic.subject][topic.chapter_name] = [];
    acc[topic.subject][topic.chapter_name].push(topic);
    return acc;
  }, {} as Record<string, Record<string, SyllabusTopic[]>>);

  const addTopicMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = topics
        .filter(t => t.subject === selectedSubject && t.chapter_name === chapter)
        .reduce((max, t) => Math.max(max, t.sort_order), -1);

      const { error } = await supabase.from("syllabus_topics").insert({
        user_id: user!.id,
        subject: selectedSubject!,
        chapter_name: chapter,
        topic_name: topicName,
        estimated_hours: parseFloat(estimatedHours) || 1,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-topics"] });
      setIsAddingTopic(false);
      setChapter("");
      setTopicName("");
      setEstimatedHours("1");
      toast({ title: "Topic added to syllabus" });
    },
  });

  const toggleTopicMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("syllabus_topics")
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-topics"] });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("syllabus_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-topics"] });
      toast({ title: "Topic removed" });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Parse text-based syllabus (simple format)
    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());

    let currentChapter = "General";
    const newTopics: { chapter: string; topic: string; hours: number }[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      // Detect chapter headers (lines starting with # or all caps or ending with :)
      if (trimmed.startsWith("#") || trimmed.endsWith(":") || trimmed === trimmed.toUpperCase()) {
        currentChapter = trimmed.replace(/^#+\s*/, "").replace(/:$/, "").trim();
      } else if (trimmed.length > 0) {
        // Parse topic with optional hours (e.g., "Topic Name - 2h" or "Topic Name (2 hours)")
        const hoursMatch = trimmed.match(/[-–]\s*(\d+(?:\.\d+)?)\s*h(?:ours?)?/i) || 
                          trimmed.match(/\((\d+(?:\.\d+)?)\s*h(?:ours?)?\)/i);
        const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 1;
        const topicName = trimmed.replace(/[-–]\s*\d+(?:\.\d+)?\s*h(?:ours?)?/i, "")
                                 .replace(/\(\d+(?:\.\d+)?\s*h(?:ours?)?\)/i, "")
                                 .replace(/^[-•*]\s*/, "")
                                 .trim();
        
        if (topicName) {
          newTopics.push({ chapter: currentChapter, topic: topicName, hours });
        }
      }
    });

    if (newTopics.length === 0) {
      toast({ title: "No topics found in file", variant: "destructive" });
      return;
    }

    // Insert all topics
    const insertData = newTopics.map((t, idx) => ({
      user_id: user!.id,
      subject: uploadSubject,
      chapter_name: t.chapter,
      topic_name: t.topic,
      estimated_hours: t.hours,
      sort_order: idx,
    }));

    const { error } = await supabase.from("syllabus_topics").insert(insertData);
    if (error) {
      toast({ title: "Failed to import syllabus", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["syllabus-topics"] });
      toast({ title: `Imported ${newTopics.length} topics` });
      setIsUploadingDialog(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleChapter = (key: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedChapters(newExpanded);
  };

  const subjectsWithTopics = Object.keys(groupedTopics);

  // Calculate progress per subject
  const subjectProgress = subjectsWithTopics.reduce((acc, subj) => {
    const allTopics = Object.values(groupedTopics[subj]).flat();
    const completed = allTopics.filter(t => t.is_completed).length;
    const total = allTopics.length;
    const totalHours = allTopics.reduce((sum, t) => sum + (t.estimated_hours || 1), 0);
    const completedHours = allTopics.filter(t => t.is_completed).reduce((sum, t) => sum + (t.estimated_hours || 1), 0);
    acc[subj] = { completed, total, totalHours, completedHours, percentage: total > 0 ? (completed / total) * 100 : 0 };
    return acc;
  }, {} as Record<string, { completed: number; total: number; totalHours: number; completedHours: number; percentage: number }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm text-muted-foreground uppercase tracking-wider">Syllabus Planner</h3>
        </div>
        <div className="flex gap-2">
          <SyllabusUploader />
          {subjectsWithTopics.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSubject(subjectsWithTopics[0]);
                setIsAddingTopic(true);
              }}
              className="h-8"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Subject Tabs */}
      {subjectsWithTopics.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 vyom-scrollbar">
          {subjectsWithTopics.map((subj) => {
            const progress = subjectProgress[subj];
            const color = getColor(subj);
            const isSelected = selectedSubject === subj;

            return (
              <button
                key={subj}
                onClick={() => setSelectedSubject(isSelected ? null : subj)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors whitespace-nowrap",
                  isSelected
                    ? "bg-accent border-border"
                    : "bg-card border-border/50 hover:border-border"
                )}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{subj}</span>
                <span className="text-xs text-muted-foreground">
                  {progress.completed}/{progress.total}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Topics List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading syllabus...</div>
      ) : subjectsWithTopics.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-4">No syllabus uploaded yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadingDialog(true)}
            className="border-border"
          >
            <FileText className="w-4 h-4 mr-2" />
            Upload Syllabus
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(selectedSubject ? [selectedSubject] : subjectsWithTopics).map((subj) => {
            const chapters = groupedTopics[subj];
            const color = getColor(subj);
            const progress = subjectProgress[subj];

            return (
              <div key={subj} className="space-y-2">
                {!selectedSubject && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-medium">{subj}</span>
                      <span className="text-xs text-muted-foreground">
                        {progress.completedHours.toFixed(1)}h / {progress.totalHours.toFixed(1)}h
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{progress.percentage.toFixed(0)}%</span>
                  </div>
                )}

                {Object.entries(chapters).map(([chapterName, chapterTopics]) => {
                  const chapterKey = `${subj}-${chapterName}`;
                  const isExpanded = expandedChapters.has(chapterKey) || selectedSubject !== null;
                  const chapterCompleted = chapterTopics.filter(t => t.is_completed).length;

                  return (
                    <Collapsible key={chapterKey} open={isExpanded} onOpenChange={() => toggleChapter(chapterKey)}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">{chapterName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {chapterCompleted}/{chapterTopics.length}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-6 mt-1 space-y-1">
                        {chapterTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-md group transition-colors",
                              topic.is_completed ? "bg-muted/30" : "hover:bg-accent/30"
                            )}
                          >
                            <Checkbox
                              checked={topic.is_completed}
                              onCheckedChange={(checked) =>
                                toggleTopicMutation.mutate({ id: topic.id, completed: !!checked })
                              }
                              className="border-border"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm truncate",
                                topic.is_completed && "line-through text-muted-foreground"
                              )}>
                                {topic.topic_name}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {topic.estimated_hours}h
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => deleteTopicMutation.mutate(topic.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}

                {selectedSubject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingTopic(true)}
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Topic
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadingDialog} onOpenChange={setIsUploadingDialog}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">Upload Syllabus</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Upload a text file with your syllabus. Use # for chapters and - for topics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Subject</label>
              <Select value={uploadSubject} onValueChange={setUploadSubject}>
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
              <label className="text-sm text-muted-foreground">File Format Example</label>
              <pre className="text-xs bg-muted/50 p-3 rounded-md text-muted-foreground overflow-x-auto">
{`# Chapter 1: Introduction
- Topic 1 - 2h
- Topic 2 - 1.5h

# Chapter 2: Advanced
- Complex topic - 3h`}
              </pre>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              Select File
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Topic Dialog */}
      <Dialog open={isAddingTopic} onOpenChange={setIsAddingTopic}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">Add Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Subject</label>
              <Select value={selectedSubject || "Programming"} onValueChange={setSelectedSubject}>
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
              <label className="text-sm text-muted-foreground">Chapter</label>
              <Input
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g., Chapter 1: Introduction"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Topic</label>
              <Input
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g., Variables and Data Types"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Estimated Hours</label>
              <Input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="1"
                min="0.5"
                step="0.5"
                className="bg-background border-border"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setIsAddingTopic(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => addTopicMutation.mutate()}
                disabled={!chapter || !topicName || !selectedSubject}
              >
                Add Topic
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
