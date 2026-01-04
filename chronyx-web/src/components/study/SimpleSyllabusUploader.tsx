import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
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
import { 
  Upload, 
  FileText, 
  Trash2, 
  Edit2, 
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  Download,
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  GripVertical,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  MoreVertical
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SyllabusDocument {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  progress_percentage: number;
  notes: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export const SimpleSyllabusUploader = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const queryClient = useQueryClient();

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<SyllabusDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProgress, setEditProgress] = useState(0);
  const [editNotes, setEditNotes] = useState("");

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOverDocId, setDragOverDocId] = useState<string | null>(null);

  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Fetch syllabus documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["syllabus-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syllabus_documents")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SyllabusDocument[];
    },
    enabled: !!user,
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (reorderedDocs: SyllabusDocument[]) => {
      const updates = reorderedDocs.map((doc, index) => ({
        id: doc.id,
        sort_order: index,
      }));
      
      for (const update of updates) {
        const { error } = await supabase
          .from("syllabus_documents")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-documents"] });
    },
  });

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, docId: string) => {
    setDraggedDocId(docId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, docId: string) => {
    e.preventDefault();
    if (draggedDocId && draggedDocId !== docId) {
      setDragOverDocId(docId);
    }
  }, [draggedDocId]);

  const handleDragLeave = useCallback(() => {
    setDragOverDocId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetDocId: string) => {
    e.preventDefault();
    if (!draggedDocId || draggedDocId === targetDocId) {
      setDraggedDocId(null);
      setDragOverDocId(null);
      return;
    }

    const draggedIndex = documents.findIndex(d => d.id === draggedDocId);
    const targetIndex = documents.findIndex(d => d.id === targetDocId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newDocs = [...documents];
    const [removed] = newDocs.splice(draggedIndex, 1);
    newDocs.splice(targetIndex, 0, removed);

    reorderMutation.mutate(newDocs);
    setDraggedDocId(null);
    setDragOverDocId(null);
  }, [draggedDocId, documents, reorderMutation]);

  const handleDragEnd = useCallback(() => {
    setDraggedDocId(null);
    setDragOverDocId(null);
  }, []);

  // Bulk selection handlers
  const toggleDocSelection = useCallback((docId: string) => {
    setSelectedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  }, []);

  const selectAllDocs = useCallback(() => {
    setSelectedDocs(new Set(documents.map(d => d.id)));
  }, [documents]);

  const deselectAllDocs = useCallback(() => {
    setSelectedDocs(new Set());
  }, []);

  const exitBulkMode = useCallback(() => {
    setBulkMode(false);
    setSelectedDocs(new Set());
  }, []);

  const moveSelectedUp = useCallback(() => {
    if (selectedDocs.size === 0) return;
    
    const selectedIndices = documents
      .map((d, i) => selectedDocs.has(d.id) ? i : -1)
      .filter(i => i !== -1);
    
    if (selectedIndices[0] === 0) return; // Already at top
    
    const newDocs = [...documents];
    selectedIndices.forEach(idx => {
      [newDocs[idx - 1], newDocs[idx]] = [newDocs[idx], newDocs[idx - 1]];
    });
    
    reorderMutation.mutate(newDocs);
  }, [selectedDocs, documents, reorderMutation]);

  const moveSelectedDown = useCallback(() => {
    if (selectedDocs.size === 0) return;
    
    const selectedIndices = documents
      .map((d, i) => selectedDocs.has(d.id) ? i : -1)
      .filter(i => i !== -1)
      .reverse();
    
    if (selectedIndices[0] === documents.length - 1) return; // Already at bottom
    
    const newDocs = [...documents];
    selectedIndices.forEach(idx => {
      [newDocs[idx], newDocs[idx + 1]] = [newDocs[idx + 1], newDocs[idx]];
    });
    
    reorderMutation.mutate(newDocs);
  }, [selectedDocs, documents, reorderMutation]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedFile) throw new Error("Missing data");
      
      setIsUploading(true);
      
      // Upload file to storage
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("syllabus")
        .upload(fileName, selectedFile);
      
      if (uploadError) throw uploadError;
      
      // Get signed URL for private bucket
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("syllabus")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry
      
      const fileUrl = signedUrlError ? fileName : signedUrlData.signedUrl;
      
      // Save to database (store path, not full URL)
      const { error: dbError } = await supabase
        .from("syllabus_documents")
        .insert({
          user_id: user.id,
          title: uploadTitle || selectedFile.name,
          description: uploadDescription || null,
          file_url: fileName, // Store path, generate signed URL on access
          file_name: selectedFile.name,
          file_type: selectedFile.type || "unknown",
          file_size: selectedFile.size,
          progress_percentage: 0,
        });
      
      if (dbError) throw dbError;
      
      return uploadTitle || selectedFile.name;
    },
    onSuccess: (title) => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-documents"] });
      toast({ title: "Syllabus uploaded", description: `"${title}" has been saved` });
      logActivity(`Uploaded syllabus: ${title}`, "Study");
      setSelectedFile(null);
      setUploadTitle("");
      setUploadDescription("");
      setIsUploading(false);
    },
    onError: (error) => {
      toast({ title: "Upload failed", description: String(error), variant: "destructive" });
      setIsUploading(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingDoc) throw new Error("No document selected");
      
      const { error } = await supabase
        .from("syllabus_documents")
        .update({
          title: editTitle,
          description: editDescription || null,
          progress_percentage: editProgress,
          notes: editNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingDoc.id);
      
      if (error) throw error;
      return editTitle;
    },
    onSuccess: (title) => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-documents"] });
      toast({ title: "Syllabus updated" });
      logActivity(`Updated syllabus: ${title}`, "Study");
      setEditDialogOpen(false);
      setEditingDoc(null);
    },
    onError: (error) => {
      toast({ title: "Update failed", description: String(error), variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const doc = documents.find(d => d.id === id);
      
      // Delete from storage using stored path
      if (doc?.file_url) {
        // file_url now stores the path, not full URL
        const path = doc.file_url.includes("/syllabus/") 
          ? doc.file_url.split("/syllabus/")[1]
          : doc.file_url;
        if (path) {
          await supabase.storage.from("syllabus").remove([path]);
        }
      }
      
      // Delete from database
      const { error } = await supabase
        .from("syllabus_documents")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return doc?.title;
    },
    onSuccess: (title) => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-documents"] });
      toast({ title: "Syllabus deleted" });
      logActivity(`Deleted syllabus: ${title}`, "Study");
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast({ title: "Delete failed", description: String(error), variant: "destructive" });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const docsToDelete = documents.filter(d => ids.includes(d.id));
      
      // Delete files from storage
      const paths = docsToDelete
        .map(doc => doc.file_url.includes("/syllabus/") 
          ? doc.file_url.split("/syllabus/")[1]
          : doc.file_url)
        .filter(Boolean);
      
      if (paths.length > 0) {
        await supabase.storage.from("syllabus").remove(paths);
      }
      
      // Delete from database
      const { error } = await supabase
        .from("syllabus_documents")
        .delete()
        .in("id", ids);
      
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-documents"] });
      toast({ title: `${count} document${count !== 1 ? 's' : ''} deleted` });
      logActivity(`Bulk deleted ${count} syllabus documents`, "Study");
      setSelectedDocs(new Set());
      setBulkMode(false);
      setBulkDeleteConfirmOpen(false);
    },
    onError: (error) => {
      toast({ title: "Bulk delete failed", description: String(error), variant: "destructive" });
    },
  });

  // Bulk delete confirmation state
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const openEdit = (doc: SyllabusDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditDescription(doc.description || "");
    setEditProgress(doc.progress_percentage);
    setEditNotes(doc.notes || "");
    setEditDialogOpen(true);
  };

  // Open preview with signed URL - fetch as blob to avoid Chrome blocking
  const openPreview = async (doc: SyllabusDocument) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewZoom(100);
    
    try {
      // Get the storage path
      const path = doc.file_url.includes("/syllabus/") 
        ? doc.file_url.split("/syllabus/")[1]
        : doc.file_url;
      
      // Generate fresh signed URL
      const { data, error } = await supabase.storage
        .from("syllabus")
        .createSignedUrl(path, 60 * 60); // 1 hour expiry
      
      if (error) throw error;
      
      // Fetch as blob to create a local URL that Chrome won't block
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error("Failed to fetch document");
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
    } catch (error) {
      console.error("Failed to generate preview URL:", error);
      toast({ 
        title: "Preview failed", 
        description: "Could not load document preview. Try downloading instead.",
        variant: "destructive" 
      });
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };
  
  // Cleanup blob URLs when dialog closes
  const handlePreviewClose = (open: boolean) => {
    if (!open && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewOpen(open);
  };

  // Get download URL with signed URL
  const getDownloadUrl = async (doc: SyllabusDocument): Promise<string> => {
    const path = doc.file_url.includes("/syllabus/") 
      ? doc.file_url.split("/syllabus/")[1]
      : doc.file_url;
    
    const { data, error } = await supabase.storage
      .from("syllabus")
      .createSignedUrl(path, 60 * 60); // 1 hour expiry
    
    if (error) throw error;
    return data.signedUrl;
  };

  const handleDownload = async (doc: SyllabusDocument) => {
    try {
      const path = doc.file_url.includes("/syllabus/") 
        ? doc.file_url.split("/syllabus/")[1]
        : doc.file_url;
      
      const { data, error } = await supabase.storage
        .from("syllabus")
        .createSignedUrl(path, 60 * 60);
      
      if (error) throw error;
      
      // Fetch as blob to avoid Chrome blocking
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error("Failed to fetch document");
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      toast({ 
        title: "Download failed", 
        description: "Could not download document. Please try again.",
        variant: "destructive" 
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-dashed border-2">
        <CardContent className="pt-6 pb-6">
          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center cursor-pointer py-6">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Drop your syllabus here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, DOCX, or TXT files
              </p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
              />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Title</label>
                  <Input
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Enter syllabus title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
                  <Textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={2}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadTitle("");
                    setUploadDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => uploadMutation.mutate()}
                  disabled={isUploading || !uploadTitle.trim()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Syllabus
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No syllabus documents yet</p>
          <p className="text-sm text-muted-foreground mt-1">Upload your first document to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bulk Mode Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {bulkMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectedDocs.size === documents.length ? deselectAllDocs : selectAllDocs}
                  >
                    {selectedDocs.size === documents.length ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Select All
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedDocs.size} selected
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {documents.length} document{documents.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {bulkMode && selectedDocs.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={moveSelectedUp}
                    disabled={reorderMutation.isPending}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={moveSelectedDown}
                    disabled={reorderMutation.isPending}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteConfirmOpen(true)}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete ({selectedDocs.size})
                  </Button>
                </>
              )}
              <Button
                variant={bulkMode ? "default" : "outline"}
                size="sm"
                onClick={bulkMode ? exitBulkMode : () => setBulkMode(true)}
              >
                {bulkMode ? "Done" : "Bulk Reorder"}
              </Button>
            </div>
          </div>

          {documents.map((doc) => (
            <Card 
              key={doc.id} 
              className={cn(
                "group hover:shadow-md transition-all",
                !bulkMode && "cursor-move",
                draggedDocId === doc.id && "opacity-50",
                dragOverDocId === doc.id && "ring-2 ring-primary ring-offset-2",
                bulkMode && selectedDocs.has(doc.id) && "ring-2 ring-primary bg-primary/5"
              )}
              draggable={!bulkMode}
              onDragStart={(e) => !bulkMode && handleDragStart(e, doc.id)}
              onDragOver={(e) => !bulkMode && handleDragOver(e, doc.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => !bulkMode && handleDrop(e, doc.id)}
              onDragEnd={handleDragEnd}
              onClick={bulkMode ? () => toggleDocSelection(doc.id) : undefined}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Checkbox / Drag Handle and Icon */}
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {bulkMode ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDocSelection(doc.id);
                          }}
                          className="p-1"
                        >
                          {selectedDocs.has(doc.id) ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                      )}
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                        {doc.progress_percentage >= 100 && (
                          <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(doc.created_at), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(doc.updated_at), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress and Actions */}
                  {!bulkMode && (
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{doc.progress_percentage}%</span>
                        </div>
                        <Progress 
                          value={doc.progress_percentage} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openPreview(doc)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(doc)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirmId(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes preview */}
                {doc.notes && !bulkMode && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground line-clamp-2">{doc.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Syllabus</DialogTitle>
            <DialogDescription>Update details and track your progress</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a description..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Progress: {editProgress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={editProgress}
                onChange={(e) => setEditProgress(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add study notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!editTitle.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline PDF Preview Dialog - hideCloseButton to avoid duplicate X */}
      <Dialog open={previewOpen} onOpenChange={handlePreviewClose}>
        <DialogContent 
          className={cn(
            "transition-all duration-300",
            previewFullscreen 
              ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none p-0" 
              : "max-w-5xl w-[90vw] h-[85vh]"
          )}
          hideCloseButton
        >
          <DialogHeader className={cn(
            "flex flex-row items-center justify-between pr-0",
            previewFullscreen && "absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur p-4"
          )}>
            <DialogTitle>Document Preview</DialogTitle>
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))}
                  disabled={previewZoom <= 50}
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <span className="text-xs font-medium w-12 text-center">{previewZoom}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))}
                  disabled={previewZoom >= 200}
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
              </div>
              
              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewFullscreen(!previewFullscreen)}
              >
                {previewFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
              
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className={cn(
            "flex-1 overflow-auto",
            previewFullscreen ? "h-full pt-16" : "h-full min-h-0 mt-4"
          )}>
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading preview...</span>
              </div>
            ) : (
              <div 
                className="w-full h-full flex items-start justify-center overflow-auto"
                style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top center' }}
              >
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[60vh] rounded-lg border bg-white"
                  title="Document Preview"
                  style={{ 
                    width: previewFullscreen ? '100%' : 'calc(100% - 2rem)',
                    height: previewFullscreen ? 'calc(100vh - 80px)' : 'calc(85vh - 120px)'
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this syllabus?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedDocs.size} document{selectedDocs.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected documents and their files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedDocs))}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedDocs.size} Document${selectedDocs.size !== 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SimpleSyllabusUploader;