import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Upload, 
  Loader2, 
  FileText, 
  CheckCircle, 
  XCircle, 
  FolderUp,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { extractSyllabusFromPdf } from "@/utils/pdfSyllabusExtractor";
import { detectSyllabusStructure } from "@/utils/pdfExtractor";
import { cn } from "@/lib/utils";

const subjects = ["Mathematics", "Programming", "Philosophy", "Language", "Science", "History", "Literature", "Art", "Music", "Other"];

interface FileStatus {
  file: File;
  status: "pending" | "processing" | "success" | "error";
  progress: number;
  message: string;
  topicsCount?: number;
}

interface ParsedModule {
  chapter: string;
  topics: { name: string; hours: number }[];
}

const BatchSyllabusUploader = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("Programming");
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);

  const parseTextContent = (text: string): ParsedModule[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    const modules: ParsedModule[] = [];
    let currentModule: ParsedModule | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      const isHeader =
        trimmed.startsWith("#") ||
        trimmed.match(/^(PHASE|PART)\s+\d+/i) ||
        trimmed.match(/^MODULE\s+\d+/i) ||
        trimmed.startsWith("Module") ||
        trimmed.startsWith("Chapter") ||
        trimmed.startsWith("Unit") ||
        trimmed.endsWith(":") ||
        (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.match(/^\d/));

      if (isHeader) {
        if (currentModule && currentModule.topics.length > 0) {
          modules.push(currentModule);
        }
        const chapterName = trimmed
          .replace(/^#+\s*/, "")
          .replace(/^(PHASE|PART|Module|Chapter|Unit)\s*\d*[\.:]\s*/i, "")
          .replace(/:$/, "")
          .trim();
        currentModule = { chapter: chapterName || "General", topics: [] };
      } else if (trimmed.length > 0 && currentModule) {
        const hoursMatch =
          trimmed.match(/[-–]\s*(\d+(?:\.\d+)?)\s*h(?:ours?)?/i) ||
          trimmed.match(/\((\d+(?:\.\d+)?)\s*h(?:ours?)?\)/i) ||
          trimmed.match(/:\s*(\d+(?:\.\d+)?)\s*h(?:ours?)?$/i);

        const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 1;
        const topicName = trimmed
          .replace(/[-–]\s*\d+(?:\.\d+)?\s*h(?:ours?)?/i, "")
          .replace(/\(\d+(?:\.\d+)?\s*h(?:ours?)?\)/i, "")
          .replace(/:\s*\d+(?:\.\d+)?\s*h(?:ours?)?$/i, "")
          .replace(/^[-•*\d.)\]]\s*/, "")
          .trim();

        if (topicName && topicName.length > 1) {
          currentModule.topics.push({ name: topicName, hours });
        }
      } else if (trimmed.length > 0 && !currentModule) {
        currentModule = { chapter: "General", topics: [] };
        const topicName = trimmed.replace(/^[-•*\d.)\]]\s*/, "").trim();
        if (topicName) {
          currentModule.topics.push({ name: topicName, hours: 1 });
        }
      }
    });

    if (currentModule && currentModule.topics.length > 0) {
      modules.push(currentModule);
    }

    return modules;
  };

  const handleFilesSelect = (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const validFiles = fileArray.filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf") || f.name.endsWith(".txt") || f.name.endsWith(".md")
    );

    if (validFiles.length !== fileArray.length) {
      toast.warning(`${fileArray.length - validFiles.length} file(s) skipped (unsupported format)`);
    }

    const newFiles: FileStatus[] = validFiles.map((file) => ({
      file,
      status: "pending",
      progress: 0,
      message: "Ready to process",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (!user || files.length === 0) return;

    setIsProcessing(true);
    let successCount = 0;
    let totalTopics = 0;

    for (let i = 0; i < files.length; i++) {
      const fileStatus = files[i];
      if (fileStatus.status !== "pending") continue;

      // Update status to processing
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "processing", progress: 10, message: "Reading file..." } : f
        )
      );

      try {
        let modules: ParsedModule[] = [];
        const isPDF = fileStatus.file.type === "application/pdf" || fileStatus.file.name.endsWith(".pdf");

        if (isPDF) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, progress: 30, message: "Extracting text..." } : f
            )
          );

          const result = await extractSyllabusFromPdf(fileStatus.file);

          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to extract PDF");
          }

          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, progress: 60, message: "Parsing structure..." } : f
            )
          );

          const structure = detectSyllabusStructure(result.data.pages);
          if (structure.modules.length > 0) {
            modules = structure.modules.map((m) => ({
              chapter: m.name,
              topics: m.topics.map((t) => ({ name: t.name, hours: t.hours })),
            }));
          } else {
            modules = parseTextContent(result.data.pages.join("\n"));
          }
        } else {
          const text = await fileStatus.file.text();
          modules = parseTextContent(text);
        }

        if (modules.length === 0 || modules.every((m) => m.topics.length === 0)) {
          throw new Error("No topics found in document");
        }

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, progress: 80, message: "Saving to database..." } : f
          )
        );

        // Save to database
        const topicsToInsert: any[] = [];
        let sortOrder = 0;

        modules.forEach((module) => {
          module.topics.forEach((topic) => {
            topicsToInsert.push({
              user_id: user.id,
              subject: selectedSubject,
              chapter_name: module.chapter,
              topic_name: topic.name,
              estimated_hours: topic.hours,
              sort_order: sortOrder++,
            });
          });
        });

        const { error } = await supabase.from("syllabus_topics").insert(topicsToInsert);
        if (error) throw error;

        totalTopics += topicsToInsert.length;
        successCount++;

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "success",
                  progress: 100,
                  message: `Imported ${topicsToInsert.length} topics`,
                  topicsCount: topicsToInsert.length,
                }
              : f
          )
        );
      } catch (error) {
        console.error("Error processing file:", error);
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  progress: 100,
                  message: error instanceof Error ? error.message : "Processing failed",
                }
              : f
          )
        );
      }

      // Update overall progress
      setOverallProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["syllabus-topics"] });

    if (successCount > 0) {
      toast.success(`Imported ${totalTopics} topics from ${successCount} file(s)`);
    }
  };

  const resetUploader = () => {
    setFiles([]);
    setOverallProgress(0);
  };

  const toggleFileExpand = (index: number) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 border-border text-muted-foreground hover:text-foreground"
      >
        <FolderUp className="w-4 h-4 mr-2" />
        Batch Import
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetUploader(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderUp className="w-5 h-5" />
              Batch Syllabus Import
            </DialogTitle>
            <DialogDescription>
              Upload multiple PDF or text files at once. All syllabi will be imported to the selected subject.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden space-y-4">
            {/* Subject Selection */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Subject:</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={isProcessing}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drop Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
                isDragOver
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-accent/30",
                isProcessing && "pointer-events-none opacity-50"
              )}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFilesSelect(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf"
                multiple
                onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
                className="hidden"
              />
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isDragOver ? "Drop files here" : "Click or drag PDF/TXT files here"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Supports multiple files
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Files ({files.length})
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    {pendingCount > 0 && (
                      <span className="text-muted-foreground">{pendingCount} pending</span>
                    )}
                    {successCount > 0 && (
                      <span className="text-green-600">{successCount} done</span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-destructive">{errorCount} failed</span>
                    )}
                  </div>
                </div>

                <ScrollArea className="h-48 border rounded-lg">
                  <div className="p-2 space-y-2">
                    {files.map((fileStatus, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {fileStatus.status === "pending" && (
                                <FileText className="w-5 h-5 text-muted-foreground" />
                              )}
                              {fileStatus.status === "processing" && (
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                              )}
                              {fileStatus.status === "success" && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                              {fileStatus.status === "error" && (
                                <XCircle className="w-5 h-5 text-destructive" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{fileStatus.file.name}</p>
                              <p className={cn(
                                "text-xs",
                                fileStatus.status === "error" ? "text-destructive" : "text-muted-foreground"
                              )}>
                                {fileStatus.message}
                              </p>
                            </div>
                            {fileStatus.status === "pending" && !isProcessing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeFile(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                            {fileStatus.topicsCount !== undefined && (
                              <button
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => toggleFileExpand(index)}
                              >
                                {expandedFiles.has(index) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                          {fileStatus.status === "processing" && (
                            <Progress value={fileStatus.progress} className="h-1 mt-2" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Overall Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsOpen(false); resetUploader(); }}>
              Cancel
            </Button>
            <Button
              onClick={processFiles}
              disabled={pendingCount === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Import {pendingCount} File{pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BatchSyllabusUploader;
