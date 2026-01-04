import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Loader2, BookOpen, Save, FileText, AlertTriangle, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Checkbox } from "@/components/ui/checkbox";
import { extractSyllabusFromPdf, ParsedInput } from "@/utils/pdfSyllabusExtractor";
import { detectSyllabusStructure, SyllabusStructure } from "@/utils/pdfExtractor";

const subjects = ["Mathematics", "Programming", "Philosophy", "Language", "Science", "History", "Literature", "Art", "Music", "Other"];

interface ParsedModule {
  chapter: string;
  topics: { name: string; hours: number; selected: boolean }[];
}

interface ParsedSyllabus {
  subject: string;
  modules: ParsedModule[];
  totalTopics: number;
  totalHours: number;
}

const SyllabusUploader = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isOCR, setIsOCR] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("Programming");
  const [parsedSyllabus, setParsedSyllabus] = useState<ParsedSyllabus | null>(null);
  const [fileName, setFileName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const parseTextContent = (text: string): ParsedModule[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    const modules: ParsedModule[] = [];
    let currentModule: ParsedModule | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Detect chapter/module headers
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
        // Parse topic with optional hours
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
          currentModule.topics.push({ name: topicName, hours, selected: true });
        }
      } else if (trimmed.length > 0 && !currentModule) {
        // No module yet, create default
        currentModule = { chapter: "General", topics: [] };
        const topicName = trimmed.replace(/^[-•*\d.)\]]\s*/, "").trim();
        if (topicName) {
          currentModule.topics.push({ name: topicName, hours: 1, selected: true });
        }
      }
    });

    // Add last module
    if (currentModule && currentModule.topics.length > 0) {
      modules.push(currentModule);
    }

    return modules;
  };

  const convertStructureToModules = (structure: SyllabusStructure): ParsedModule[] => {
    return structure.modules.map((m) => ({
      chapter: m.name,
      topics: m.topics.map((t) => ({
        name: t.name,
        hours: t.hours,
        selected: t.selected,
      })),
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);
    setUploadProgress(0);
    setIsOCR(false);
    setParseWarning(null);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      setIsParsing(true);
      let modules: ParsedModule[] = [];
      let warningMsg: string | null = null;

      const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');

      if (isPDF) {
        // Use clean PDF extraction with garbage guard
        const result = await extractSyllabusFromPdf(file, (msg) => {
          // Update progress message
          if (msg.includes("OCR")) setIsOCR(true);
        });
        
        if (!result.success || !result.data) {
          warningMsg = result.error || "Failed to extract text from PDF";
          toast.error(warningMsg);
        } else {
          // Successfully extracted clean text
          const { pages, source } = result.data;
          
          if (source === "ocr") {
            setIsOCR(true);
            toast.info("Document processed with OCR");
          }
          
          // Parse the clean text into syllabus structure
          const structure = detectSyllabusStructure(pages);
          
          if (structure.modules.length > 0) {
            modules = convertStructureToModules(structure);
          } else {
            // Fallback to simpler text parsing
            modules = parseTextContent(pages.join("\n"));
            if (modules.length === 0) {
              warningMsg = "No clear syllabus structure detected. The document may need manual organization.";
            }
          }
        }
      } else {
        // For text files, use simple text parsing
        const text = await file.text();
        modules = parseTextContent(text);
      }
      
      // Complete upload
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (modules.length === 0 || modules.every((m) => m.topics.length === 0)) {
        toast.error("Could not parse any topics from the file");
        setParsedSyllabus(null);
        setParseWarning(warningMsg || "No topics found in the document.");
        return;
      }

      const totalTopics = modules.reduce((sum, m) => sum + m.topics.length, 0);
      const totalHours = modules.reduce(
        (sum, m) => sum + m.topics.reduce((s, t) => s + t.hours, 0),
        0
      );

      setParsedSyllabus({
        subject: selectedSubject,
        modules,
        totalTopics,
        totalHours,
      });
      setParseWarning(warningMsg);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse file");
    } finally {
      setIsUploading(false);
      setIsParsing(false);
      setIsOCR(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleTopic = (moduleIndex: number, topicIndex: number) => {
    if (!parsedSyllabus) return;

    const newModules = [...parsedSyllabus.modules];
    newModules[moduleIndex].topics[topicIndex].selected =
      !newModules[moduleIndex].topics[topicIndex].selected;

    const totalTopics = newModules.reduce(
      (sum, m) => sum + m.topics.filter((t) => t.selected).length,
      0
    );
    const totalHours = newModules.reduce(
      (sum, m) => sum + m.topics.filter((t) => t.selected).reduce((s, t) => s + t.hours, 0),
      0
    );

    setParsedSyllabus({
      ...parsedSyllabus,
      modules: newModules,
      totalTopics,
      totalHours,
    });
  };

  const toggleModule = (moduleIndex: number, selected: boolean) => {
    if (!parsedSyllabus) return;

    const newModules = [...parsedSyllabus.modules];
    newModules[moduleIndex].topics = newModules[moduleIndex].topics.map((t) => ({
      ...t,
      selected,
    }));

    const totalTopics = newModules.reduce(
      (sum, m) => sum + m.topics.filter((t) => t.selected).length,
      0
    );
    const totalHours = newModules.reduce(
      (sum, m) => sum + m.topics.filter((t) => t.selected).reduce((s, t) => s + t.hours, 0),
      0
    );

    setParsedSyllabus({
      ...parsedSyllabus,
      modules: newModules,
      totalTopics,
      totalHours,
    });
  };

  const updateTopicHours = (moduleIndex: number, topicIndex: number, hours: number) => {
    if (!parsedSyllabus) return;

    const newModules = [...parsedSyllabus.modules];
    newModules[moduleIndex].topics[topicIndex].hours = hours;

    const totalHours = newModules.reduce(
      (sum, m) => sum + m.topics.filter((t) => t.selected).reduce((s, t) => s + t.hours, 0),
      0
    );

    setParsedSyllabus({
      ...parsedSyllabus,
      modules: newModules,
      totalHours,
    });
  };

  const saveSyllabus = async () => {
    if (!user || !parsedSyllabus) return;

    setIsSaving(true);
    try {
      const topicsToInsert: any[] = [];
      let sortOrder = 0;

      parsedSyllabus.modules.forEach((module) => {
        module.topics
          .filter((t) => t.selected)
          .forEach((topic) => {
            topicsToInsert.push({
              user_id: user.id,
              subject: parsedSyllabus.subject,
              chapter_name: module.chapter,
              topic_name: topic.name,
              estimated_hours: topic.hours,
              sort_order: sortOrder++,
            });
          });
      });

      if (topicsToInsert.length === 0) {
        toast.error("No topics selected to save");
        return;
      }

      const { error } = await supabase.from("syllabus_topics").insert(topicsToInsert);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["syllabus-topics"] });
      toast.success(`Imported ${topicsToInsert.length} topics successfully`);
      
      setIsOpen(false);
      setParsedSyllabus(null);
      setFileName("");
    } catch (error) {
      console.error("Error saving syllabus:", error);
      toast.error("Failed to save syllabus");
    } finally {
      setIsSaving(false);
    }
  };

  const resetUploader = () => {
    setParsedSyllabus(null);
    setFileName("");
    setUploadProgress(0);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 border-border text-muted-foreground hover:text-foreground"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Syllabus
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetUploader(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {parsedSyllabus ? "Preview & Edit Syllabus" : "Upload Syllabus"}
            </DialogTitle>
            <DialogDescription>
              {parsedSyllabus
                ? "Review and edit the parsed syllabus before saving"
                : "Upload a text file with your syllabus. Use headings for chapters and bullet points for topics."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {!parsedSyllabus ? (
              <div className="space-y-6 py-4">
                {/* Subject Selection */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Subject</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-full">
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

                {/* File Format Example */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Supported Format</label>
                  <pre className="text-xs bg-muted/50 p-4 rounded-md text-muted-foreground overflow-x-auto">
{`# Module 1: Introduction
- What is Programming - 2h
- Setting up Environment - 1h
- First Program - 1.5h

# Module 2: Variables
- Data Types - 2h
- Variables and Constants - 1h
- Type Conversion - 1.5h`}
                  </pre>
                </div>

                {/* Upload Area with Drag & Drop */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer relative",
                    isDragOver
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : isUploading
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent/30"
                  )}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const file = files[0];
                      if (file.type === "application/pdf" || file.name.endsWith('.pdf') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                        handleFileSelect({ target: { files: [file] } } as any);
                      } else {
                        toast.error("Please upload a PDF, TXT, or MD file");
                      }
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {isUploading ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                        {isOCR && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                            <FileText className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">{fileName}</p>
                        <div className="relative">
                          <Progress value={uploadProgress} className="h-3 w-64 mx-auto" />
                          <div 
                            className="absolute top-0 left-0 h-full bg-primary/30 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isOCR ? "Running OCR on scanned document..." : isParsing ? "Parsing content..." : `Uploading... ${uploadProgress}%`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={cn(
                        "w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all",
                        isDragOver ? "bg-primary/20 scale-110" : "bg-muted/50"
                      )}>
                        <Upload className={cn(
                          "w-8 h-8 transition-colors",
                          isDragOver ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {isDragOver ? "Drop your file here" : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, TXT, or MD files supported
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4 h-full flex flex-col">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="py-3 px-4">
                      <p className="text-2xl font-semibold text-foreground">
                        {parsedSyllabus.modules.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Modules</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-3 px-4">
                      <p className="text-2xl font-semibold text-foreground">
                        {parsedSyllabus.totalTopics}
                      </p>
                      <p className="text-xs text-muted-foreground">Topics Selected</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-3 px-4">
                      <p className="text-2xl font-semibold text-foreground">
                        {parsedSyllabus.totalHours.toFixed(1)}h
                      </p>
                      <p className="text-xs text-muted-foreground">Total Hours</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-3 px-4">
                      <p className="text-2xl font-semibold text-primary">
                        {parsedSyllabus.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">Subject</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Modules Table */}
                <ScrollArea className="flex-1 border rounded-lg">
                  <div className="space-y-4 p-4">
                    {parsedSyllabus.modules.map((module, moduleIndex) => {
                      const allSelected = module.topics.every((t) => t.selected);
                      const someSelected = module.topics.some((t) => t.selected);

                      return (
                        <div key={moduleIndex} className="space-y-2">
                          <div className="flex items-center gap-3 py-2 px-3 bg-muted/50 rounded-lg">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(checked) =>
                                toggleModule(moduleIndex, !!checked)
                              }
                              className={cn(!allSelected && someSelected && "opacity-50")}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{module.chapter}</p>
                              <p className="text-xs text-muted-foreground">
                                {module.topics.filter((t) => t.selected).length} of{" "}
                                {module.topics.length} topics •{" "}
                                {module.topics
                                  .filter((t) => t.selected)
                                  .reduce((s, t) => s + t.hours, 0)
                                  .toFixed(1)}
                                h
                              </p>
                            </div>
                          </div>

                          <div className="pl-8 space-y-1">
                            {module.topics.map((topic, topicIndex) => (
                              <div
                                key={topicIndex}
                                className={cn(
                                  "flex items-center gap-3 py-2 px-3 rounded-md transition-colors",
                                  topic.selected
                                    ? "bg-card border border-border"
                                    : "bg-muted/30 opacity-60"
                                )}
                              >
                                <Checkbox
                                  checked={topic.selected}
                                  onCheckedChange={() =>
                                    toggleTopic(moduleIndex, topicIndex)
                                  }
                                />
                                <span
                                  className={cn(
                                    "flex-1 text-sm",
                                    !topic.selected && "line-through text-muted-foreground"
                                  )}
                                >
                                  {topic.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    value={topic.hours}
                                    onChange={(e) =>
                                      updateTopicHours(
                                        moduleIndex,
                                        topicIndex,
                                        parseFloat(e.target.value) || 1
                                      )
                                    }
                                    className="w-16 h-7 text-xs text-center"
                                    min="0.5"
                                    step="0.5"
                                  />
                                  <span className="text-xs text-muted-foreground">h</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {parsedSyllabus ? (
              <>
                <Button variant="outline" onClick={resetUploader}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={saveSyllabus} disabled={isSaving || parsedSyllabus.totalTopics === 0}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save {parsedSyllabus.totalTopics} Topics
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SyllabusUploader;
