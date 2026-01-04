import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { FileText, Link2, X, Search, Plus, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { useSubjectColors } from "./SubjectColorPicker";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StudyLog {
  id: string;
  subject: string;
  topic: string | null;
  duration: number;
  date: string;
  notes: string | null;
  linked_topic_id: string | null;
  focus_level: string;
}

interface SyllabusTopic {
  id: string;
  subject: string;
  chapter_name: string;
  topic_name: string;
}

export const StudyNotes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getColor } = useSubjectColors();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingLog, setEditingLog] = useState<StudyLog | null>(null);
  const [notes, setNotes] = useState("");
  const [linkedTopicId, setLinkedTopicId] = useState<string | null>(null);
  const [topicSearchOpen, setTopicSearchOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [previewMode, setPreviewMode] = useState(false);

  // Fetch study logs with notes
  const { data: studyLogs = [], isLoading } = useQuery({
    queryKey: ["study-logs-with-notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_logs")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as StudyLog[];
    },
    enabled: !!user,
  });

  // Fetch syllabus topics for linking
  const { data: syllabusTopics = [] } = useQuery({
    queryKey: ["syllabus-topics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syllabus_topics")
        .select("id, subject, chapter_name, topic_name")
        .order("subject")
        .order("chapter_name");
      if (error) throw error;
      return data as SyllabusTopic[];
    },
    enabled: !!user,
  });

  // Update study log mutation
  const updateLogMutation = useMutation({
    mutationFn: async ({ id, notes, linked_topic_id }: { id: string; notes: string | null; linked_topic_id: string | null }) => {
      const { error } = await supabase
        .from("study_logs")
        .update({ notes, linked_topic_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-logs-with-notes"] });
      queryClient.invalidateQueries({ queryKey: ["study-logs"] });
      toast({ title: "Notes saved" });
      setEditingLog(null);
    },
  });

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    return studyLogs.filter(log => {
      const matchesSubject = filterSubject === "all" || log.subject === filterSubject;
      const matchesSearch = searchQuery === "" || 
        log.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.topic?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSubject && matchesSearch;
    });
  }, [studyLogs, filterSubject, searchQuery]);

  // Logs with notes
  const logsWithNotes = filteredLogs.filter(log => log.notes);

  // Get unique subjects
  const uniqueSubjects = [...new Set(studyLogs.map(log => log.subject))];

  // Filter syllabus topics for linking
  const filteredTopics = syllabusTopics.filter(t =>
    topicSearch === "" ||
    t.topic_name.toLowerCase().includes(topicSearch.toLowerCase()) ||
    t.chapter_name.toLowerCase().includes(topicSearch.toLowerCase()) ||
    t.subject.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const openEditDialog = (log: StudyLog) => {
    setEditingLog(log);
    setNotes(log.notes || "");
    setLinkedTopicId(log.linked_topic_id);
    setPreviewMode(false);
  };

  const getLinkedTopic = (topicId: string | null) => {
    if (!topicId) return null;
    return syllabusTopics.find(t => t.id === topicId);
  };

  const handleSave = () => {
    if (editingLog) {
      updateLogMutation.mutate({
        id: editingLog.id,
        notes: notes.trim() || null,
        linked_topic_id: linkedTopicId,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm text-muted-foreground uppercase tracking-wider">Study Notes</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-40 bg-background border-border">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Subjects</SelectItem>
            {uniqueSubjects.map((subj) => (
              <SelectItem key={subj} value={subj}>{subj}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading notes...</div>
      ) : logsWithNotes.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-2">
            {searchQuery ? "No notes matching your search" : "No study notes yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            Add notes to your study sessions to track learnings
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logsWithNotes.map((log) => {
            const linkedTopic = getLinkedTopic(log.linked_topic_id);
            
            return (
              <div
                key={log.id}
                onClick={() => openEditDialog(log)}
                className="group bg-card border border-border rounded-lg p-4 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 h-12 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getColor(log.subject) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(parseISO(log.date), "MMM d, yyyy")}</span>
                      <span>•</span>
                      <span>{log.duration}m</span>
                      <span>•</span>
                      <span>{log.subject}</span>
                      {log.topic && (
                        <>
                          <span>→</span>
                          <span className="truncate">{log.topic}</span>
                        </>
                      )}
                    </div>
                    
                    {linkedTopic && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Link2 className="w-3 h-3 text-primary" />
                        <span className="text-xs text-primary">
                          Linked: {linkedTopic.topic_name}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none line-clamp-3">
                      <ReactMarkdown>
                        {log.notes || ""}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sessions Without Notes */}
      {filteredLogs.filter(l => !l.notes).length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Sessions Without Notes
          </h3>
          <div className="grid gap-2">
            {filteredLogs.filter(l => !l.notes).slice(0, 5).map((log) => (
              <div
                key={log.id}
                onClick={() => openEditDialog(log)}
                className="flex items-center gap-3 px-4 py-2 bg-muted/30 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div
                  className="w-1.5 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColor(log.subject) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{log.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(log.date), "MMM d")} • {log.duration}m
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Notes
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit Notes Dialog */}
      <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">Edit Study Notes</DialogTitle>
          </DialogHeader>
          {editingLog && (
            <div className="space-y-4 pt-2">
              {/* Session Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getColor(editingLog.subject) }}
                />
                <span>{editingLog.subject}</span>
                {editingLog.topic && (
                  <>
                    <span>→</span>
                    <span>{editingLog.topic}</span>
                  </>
                )}
                <span>•</span>
                <span>{format(parseISO(editingLog.date), "MMM d, yyyy")}</span>
                <span>•</span>
                <span>{editingLog.duration}m</span>
              </div>

              {/* Topic Linking */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Link to Syllabus Topic
                  </label>
                  {linkedTopicId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLinkedTopicId(null)}
                      className="h-6 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                
                {linkedTopicId ? (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-md">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      {getLinkedTopic(linkedTopicId)?.topic_name || "Unknown topic"}
                    </span>
                  </div>
                ) : (
                  <Popover open={topicSearchOpen} onOpenChange={setTopicSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start border-border text-muted-foreground">
                        <Search className="w-4 h-4 mr-2" />
                        Search topics to link...
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-card border-border" align="start">
                      <div className="p-2 border-b border-border">
                        <Input
                          placeholder="Search topics..."
                          value={topicSearch}
                          onChange={(e) => setTopicSearch(e.target.value)}
                          className="bg-background border-border"
                        />
                      </div>
                      <ScrollArea className="h-64">
                        <div className="p-1">
                          {filteredTopics.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-2 text-center">
                              No topics found
                            </p>
                          ) : (
                            filteredTopics.slice(0, 20).map((topic) => (
                              <button
                                key={topic.id}
                                onClick={() => {
                                  setLinkedTopicId(topic.id);
                                  setTopicSearchOpen(false);
                                  setTopicSearch("");
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-accent rounded-md transition-colors"
                              >
                                <p className="text-sm font-medium truncate">{topic.topic_name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {topic.subject} → {topic.chapter_name}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Notes Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Notes (Markdown supported)</label>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewMode(false)}
                      className={cn("h-7 text-xs", !previewMode && "bg-accent")}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewMode(true)}
                      className={cn("h-7 text-xs", previewMode && "bg-accent")}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
                
                {previewMode ? (
                  <div className="min-h-[200px] p-4 bg-muted/30 rounded-md prose prose-sm dark:prose-invert max-w-none">
                    {notes ? (
                      <ReactMarkdown>{notes}</ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground italic">No notes to preview</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write your notes here... Use **bold**, *italic*, - lists, etc."
                    className="min-h-[200px] bg-background border-border font-mono text-sm"
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingLog(null)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateLogMutation.isPending}
                  className="bg-primary text-primary-foreground"
                >
                  {updateLogMutation.isPending ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
