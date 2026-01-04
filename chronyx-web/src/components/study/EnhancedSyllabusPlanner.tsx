import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, FileText, ChevronRight, ChevronDown, Check, 
  Loader2, Eye, Save, Trash2, Edit2, Clock, BookOpen,
  GripVertical, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedPhase {
  id: string;
  name: string;
  sourcePage?: string;
  modules: ParsedModule[];
}

interface ParsedModule {
  id: string;
  name: string;
  sourcePage?: string;
  topics: ParsedTopic[];
}

interface ParsedTopic {
  id: string;
  name: string;
  sourcePage?: string;
}

interface SyllabusPhase {
  id: string;
  syllabus_name: string;
  phase_name: string;
  phase_order: number;
  status: string;
  notes: string | null;
}

interface SyllabusModule {
  id: string;
  phase_id: string;
  module_name: string;
  module_order: number;
  status: string;
  notes: string | null;
  time_spent_minutes: number;
}

interface SyllabusTopic {
  id: string;
  module_id: string | null;
  subject: string;
  chapter_name: string;
  topic_name: string;
  status: string;
  notes: string | null;
  time_spent_minutes: number;
  is_completed: boolean;
}

type UploadStep = "upload" | "parsing" | "preview" | "tracking";

const EnhancedSyllabusPlanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Upload state
  const [step, setStep] = useState<UploadStep>("upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsingMessage, setParsingMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Preview state
  const [syllabusName, setSyllabusName] = useState("");
  const [parsedData, setParsedData] = useState<ParsedPhase[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: "phase" | "module" | "topic"; id: string } | null>(null);
  const [editingName, setEditingName] = useState("");
  
  // Tracking state
  const [phases, setPhases] = useState<SyllabusPhase[]>([]);
  const [modules, setModules] = useState<SyllabusModule[]>([]);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchExistingData();
    }
  }, [user]);

  const fetchExistingData = async () => {
    setLoading(true);
    try {
      const [phasesRes, modulesRes, topicsRes] = await Promise.all([
        supabase.from("syllabus_phases").select("*").order("phase_order"),
        supabase.from("syllabus_modules").select("*").order("module_order"),
        supabase.from("syllabus_topics").select("*").order("sort_order"),
      ]);

      if (phasesRes.data && phasesRes.data.length > 0) {
        setPhases(phasesRes.data);
        setModules(modulesRes.data || []);
        setTopics(topicsRes.data || []);
        setStep("tracking");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSyllabusName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const parseDocument = async () => {
    if (!selectedFile) return;
    
    setStep("parsing");
    setParsingMessage("Reading document…");
    setUploadProgress(20);
    
    try {
      // Simulate parsing stages
      await new Promise(r => setTimeout(r, 800));
      setParsingMessage("Detecting structure…");
      setUploadProgress(50);
      
      await new Promise(r => setTimeout(r, 800));
      setParsingMessage("Preparing preview…");
      setUploadProgress(80);
      
      // Read file content
      const text = await selectedFile.text();
      const parsed = parseTextContent(text);
      
      setUploadProgress(100);
      setParsedData(parsed);
      
      await new Promise(r => setTimeout(r, 500));
      setStep("preview");
    } catch (error) {
      console.error("Error parsing document:", error);
      toast({ title: "Error", description: "Failed to parse document", variant: "destructive" });
      setStep("upload");
    }
  };

  const parseTextContent = (text: string): ParsedPhase[] => {
    const lines = text.split("\n").filter(line => line.trim());
    const phases: ParsedPhase[] = [];
    let currentPhase: ParsedPhase | null = null;
    let currentModule: ParsedModule | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect phase/part headers (e.g., "Phase 1:", "Part I:", "Section A")
      if (/^(phase|part|section)\s*[:\-]?\s*\d*\s*[:\-]?\s*/i.test(line) || 
          /^[IVX]+\.\s+/i.test(line) ||
          /^[A-Z]\.\s+/.test(line)) {
        const name = line.replace(/^(phase|part|section)\s*[:\-]?\s*\d*\s*[:\-]?\s*/i, "").trim() || line;
        currentPhase = {
          id: `phase-${Date.now()}-${i}`,
          name,
          sourcePage: `Line ${i + 1}`,
          modules: [],
        };
        phases.push(currentPhase);
        currentModule = null;
      }
      // Detect module/chapter headers (e.g., "Module 1:", "Chapter 1:", numbered items)
      else if (/^(module|chapter|unit)\s*\d*\s*[:\-]/i.test(line) ||
               /^\d+\.\s+[A-Z]/.test(line)) {
        if (!currentPhase) {
          currentPhase = {
            id: `phase-${Date.now()}-${i}`,
            name: "Main Content",
            modules: [],
          };
          phases.push(currentPhase);
        }
        const name = line.replace(/^(module|chapter|unit)\s*\d*\s*[:\-]\s*/i, "").replace(/^\d+\.\s+/, "").trim();
        currentModule = {
          id: `module-${Date.now()}-${i}`,
          name,
          sourcePage: `Line ${i + 1}`,
          topics: [],
        };
        currentPhase.modules.push(currentModule);
      }
      // Detect topics (sub-items, bullets, numbered sub-items)
      else if (/^[\-•*]\s+/.test(line) ||
               /^\d+\.\d+\s+/.test(line) ||
               /^[a-z]\)\s+/.test(line)) {
        if (!currentModule && currentPhase) {
          currentModule = {
            id: `module-${Date.now()}-${i}`,
            name: "General Topics",
            topics: [],
          };
          currentPhase.modules.push(currentModule);
        }
        if (currentModule) {
          const name = line.replace(/^[\-•*]\s+/, "").replace(/^\d+\.\d+\s+/, "").replace(/^[a-z]\)\s+/, "").trim();
          currentModule.topics.push({
            id: `topic-${Date.now()}-${i}`,
            name,
            sourcePage: `Line ${i + 1}`,
          });
        }
      }
      // Regular lines become topics
      else if (line.length > 3 && currentModule) {
        currentModule.topics.push({
          id: `topic-${Date.now()}-${i}`,
          name: line,
          sourcePage: `Line ${i + 1}`,
        });
      }
    }
    
    // If no structure detected, create a default phase with all content as topics
    if (phases.length === 0) {
      const defaultPhase: ParsedPhase = {
        id: "phase-default",
        name: "Syllabus Content",
        modules: [{
          id: "module-default",
          name: "Topics",
          topics: lines.filter(l => l.trim().length > 3).map((line, i) => ({
            id: `topic-default-${i}`,
            name: line.trim(),
          })),
        }],
      };
      phases.push(defaultPhase);
    }
    
    return phases;
  };

  const updateParsedItem = (type: "phase" | "module" | "topic", id: string, newName: string) => {
    setParsedData(prev => {
      return prev.map(phase => {
        if (type === "phase" && phase.id === id) {
          return { ...phase, name: newName };
        }
        return {
          ...phase,
          modules: phase.modules.map(module => {
            if (type === "module" && module.id === id) {
              return { ...module, name: newName };
            }
            return {
              ...module,
              topics: module.topics.map(topic => {
                if (type === "topic" && topic.id === id) {
                  return { ...topic, name: newName };
                }
                return topic;
              }),
            };
          }),
        };
      });
    });
    setSelectedItem(null);
    setEditingName("");
  };

  const deleteItem = (type: "phase" | "module" | "topic", id: string) => {
    setParsedData(prev => {
      if (type === "phase") {
        return prev.filter(p => p.id !== id);
      }
      return prev.map(phase => ({
        ...phase,
        modules: type === "module"
          ? phase.modules.filter(m => m.id !== id)
          : phase.modules.map(module => ({
              ...module,
              topics: module.topics.filter(t => t.id !== id),
            })),
      }));
    });
  };

  const saveToDatabase = async () => {
    if (!user) return;
    
    try {
      // Save phases
      for (let pi = 0; pi < parsedData.length; pi++) {
        const phase = parsedData[pi];
        const { data: phaseData, error: phaseError } = await supabase
          .from("syllabus_phases")
          .insert({
            user_id: user.id,
            syllabus_name: syllabusName,
            phase_name: phase.name,
            phase_order: pi,
            source_page: phase.sourcePage,
          })
          .select()
          .single();
        
        if (phaseError) throw phaseError;
        
        // Save modules for this phase
        for (let mi = 0; mi < phase.modules.length; mi++) {
          const module = phase.modules[mi];
          const { data: moduleData, error: moduleError } = await supabase
            .from("syllabus_modules")
            .insert({
              user_id: user.id,
              phase_id: phaseData.id,
              module_name: module.name,
              module_order: mi,
              source_page: module.sourcePage,
            })
            .select()
            .single();
          
          if (moduleError) throw moduleError;
          
          // Save topics for this module
          if (module.topics.length > 0) {
            const topicsToInsert = module.topics.map((topic, ti) => ({
              user_id: user.id,
              module_id: moduleData.id,
              subject: syllabusName,
              chapter_name: module.name,
              topic_name: topic.name,
              source_page: topic.sourcePage,
              sort_order: ti,
            }));
            
            const { error: topicsError } = await supabase
              .from("syllabus_topics")
              .insert(topicsToInsert);
            
            if (topicsError) throw topicsError;
          }
        }
      }
      
      toast({ title: "Syllabus saved", description: "Your study plan is ready" });
      await fetchExistingData();
    } catch (error) {
      console.error("Error saving syllabus:", error);
      toast({ title: "Error", description: "Failed to save syllabus", variant: "destructive" });
    }
  };

  const updateTopicStatus = async (topicId: string, status: string) => {
    const isCompleted = status === "completed";
    const { error } = await supabase
      .from("syllabus_topics")
      .update({ 
        status, 
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", topicId);
    
    if (!error) {
      setTopics(prev => prev.map(t => 
        t.id === topicId ? { ...t, status, is_completed: isCompleted } : t
      ));
    }
  };

  const logTime = async (topicId: string, minutes: number) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    
    const newTime = (topic.time_spent_minutes || 0) + minutes;
    const { error } = await supabase
      .from("syllabus_topics")
      .update({ time_spent_minutes: newTime })
      .eq("id", topicId);
    
    if (!error) {
      setTopics(prev => prev.map(t => 
        t.id === topicId ? { ...t, time_spent_minutes: newTime } : t
      ));
    }
  };

  const calculateProgress = (phaseId?: string, moduleId?: string) => {
    let relevantTopics = topics;
    
    if (moduleId) {
      relevantTopics = topics.filter(t => t.module_id === moduleId);
    } else if (phaseId) {
      const phaseModuleIds = modules.filter(m => m.phase_id === phaseId).map(m => m.id);
      relevantTopics = topics.filter(t => t.module_id && phaseModuleIds.includes(t.module_id));
    }
    
    if (relevantTopics.length === 0) return 0;
    const completed = relevantTopics.filter(t => t.is_completed).length;
    return Math.round((completed / relevantTopics.length) * 100);
  };

  const togglePhase = (id: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Upload Step
  if (step === "upload") {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-light text-foreground">Upload Syllabus</h2>
          <p className="text-sm text-muted-foreground">
            Upload a document to create your study plan
          </p>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8">
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Drop your file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, DOC, DOCX, TXT
              </p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
              />
            </label>
          </CardContent>
        </Card>
        
        {selectedFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Syllabus Name</label>
              <Input
                value={syllabusName}
                onChange={(e) => setSyllabusName(e.target.value)}
                placeholder="Enter a name for this syllabus"
              />
            </div>
            
            <Button onClick={parseDocument} className="w-full" disabled={!syllabusName}>
              <Eye className="w-4 h-4 mr-2" />
              Parse & Preview
            </Button>
          </div>
        )}
        
        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Important:</strong> The system extracts structure from your document.</p>
            <p>No content is invented or auto-generated. You review everything before saving.</p>
          </div>
        </div>
      </div>
    );
  }

  // Parsing Step
  if (step === "parsing") {
    return (
      <div className="max-w-md mx-auto space-y-6 py-24 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mx-auto" />
        <p className="text-lg font-light text-foreground">{parsingMessage}</p>
        <Progress value={uploadProgress} className="h-1" />
      </div>
    );
  }

  // Preview Step
  if (step === "preview") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-light text-foreground">{syllabusName}</h2>
            <p className="text-sm text-muted-foreground">Review the extracted structure before saving</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button onClick={saveToDatabase}>
              <Save className="w-4 h-4 mr-2" />
              Approve & Add to Study Tracker
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tree View */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {parsedData.map((phase) => (
                    <div key={phase.id} className="space-y-1">
                      <button
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                          selectedItem?.id === phase.id ? "bg-accent" : "hover:bg-muted"
                        )}
                        onClick={() => {
                          setSelectedItem({ type: "phase", id: phase.id });
                          setEditingName(phase.name);
                        }}
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{phase.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {phase.modules.length} modules
                        </Badge>
                      </button>
                      
                      <div className="ml-6 space-y-1">
                        {phase.modules.map((module) => (
                          <div key={module.id} className="space-y-1">
                            <button
                              className={cn(
                                "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                                selectedItem?.id === module.id ? "bg-accent" : "hover:bg-muted"
                              )}
                              onClick={() => {
                                setSelectedItem({ type: "module", id: module.id });
                                setEditingName(module.name);
                              }}
                            >
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{module.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {module.topics.length} topics
                              </span>
                            </button>
                            
                            <div className="ml-6 space-y-0.5">
                              {module.topics.map((topic) => (
                                <button
                                  key={topic.id}
                                  className={cn(
                                    "w-full flex items-center gap-2 p-1.5 rounded-md text-left transition-colors",
                                    selectedItem?.id === topic.id ? "bg-accent" : "hover:bg-muted"
                                  )}
                                  onClick={() => {
                                    setSelectedItem({ type: "topic", id: topic.id });
                                    setEditingName(topic.name);
                                  }}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                  <span className="text-xs text-muted-foreground truncate">{topic.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Details Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedItem ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Title</label>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => updateParsedItem(selectedItem.type, selectedItem.id, editingName)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Update
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => deleteItem(selectedItem.type, selectedItem.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Click on items in the tree to edit or delete them.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select an item from the tree to view and edit details.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Tracking Step
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-light text-foreground">Study Progress</h2>
          <p className="text-sm text-muted-foreground">
            Track your learning journey
          </p>
        </div>
        <Button variant="outline" onClick={() => setStep("upload")}>
          <Upload className="w-4 h-4 mr-2" />
          Upload New Syllabus
        </Button>
      </div>
      
      {/* Overall Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{topics.filter(t => t.is_completed).length} completed</span>
            <span>{topics.length} total topics</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Phases */}
      <div className="space-y-4">
        {phases.map((phase) => {
          const phaseModules = modules.filter(m => m.phase_id === phase.id);
          const isExpanded = expandedPhases.has(phase.id);
          const progress = calculateProgress(phase.id);
          
          return (
            <Card key={phase.id}>
              <Collapsible open={isExpanded} onOpenChange={() => togglePhase(phase.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-base">{phase.phase_name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {phaseModules.length} modules
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24">
                          <Progress value={progress} className="h-1.5" />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3 ml-8">
                      {phaseModules.map((module) => {
                        const moduleTopics = topics.filter(t => t.module_id === module.id);
                        const isModuleExpanded = expandedModules.has(module.id);
                        const moduleProgress = calculateProgress(undefined, module.id);
                        
                        return (
                          <Collapsible 
                            key={module.id} 
                            open={isModuleExpanded} 
                            onOpenChange={() => toggleModule(module.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                                {isModuleExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium flex-1">{module.module_name}</span>
                                <div className="flex items-center gap-3">
                                  <div className="w-16">
                                    <Progress value={moduleProgress} className="h-1" />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {moduleTopics.filter(t => t.is_completed).length}/{moduleTopics.length}
                                  </span>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <div className="ml-10 mt-2 space-y-1">
                                {moduleTopics.map((topic) => (
                                  <div 
                                    key={topic.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 group"
                                  >
                                    <button
                                      onClick={() => updateTopicStatus(
                                        topic.id, 
                                        topic.is_completed ? "not_started" : "completed"
                                      )}
                                      className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                        topic.is_completed 
                                          ? "bg-vyom-success border-vyom-success" 
                                          : "border-muted-foreground hover:border-vyom-success"
                                      )}
                                    >
                                      {topic.is_completed && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                    <span className={cn(
                                      "text-sm flex-1",
                                      topic.is_completed && "text-muted-foreground line-through"
                                    )}>
                                      {topic.topic_name}
                                    </span>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="h-7 px-2"
                                        onClick={() => logTime(topic.id, 30)}
                                      >
                                        <Clock className="w-3 h-3 mr-1" />
                                        +30m
                                      </Button>
                                    </div>
                                    {(topic.time_spent_minutes || 0) > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        {Math.floor((topic.time_spent_minutes || 0) / 60)}h {(topic.time_spent_minutes || 0) % 60}m
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default EnhancedSyllabusPlanner;
