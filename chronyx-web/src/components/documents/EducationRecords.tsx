import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  GraduationCap, 
  Upload, 
  Eye, 
  Download, 
  Trash2, 
  Edit2,
  ChevronDown,
  FileText,
  Building
} from "lucide-react";

interface EducationRecord {
  id: string;
  institution: string;
  degree: string;
  course: string | null;
  start_year: number | null;
  end_year: number | null;
  notes: string | null;
  created_at: string;
}

interface EducationDocument {
  id: string;
  education_id: string;
  document_type: string;
  title: string;
  file_url: string;
  created_at: string;
}

const DOCUMENT_TYPES = ["Certificate", "Marksheet", "Degree", "Transcript", "Other"];

const EducationRecords = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EducationRecord | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    institution: "",
    degree: "",
    course: "",
    start_year: "",
    end_year: "",
    notes: ""
  });
  const [docFormData, setDocFormData] = useState({
    document_type: "Certificate",
    title: "",
    file: null as File | null
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["education-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("education_records")
        .select("*")
        .eq("user_id", user?.id)
        .order("end_year", { ascending: false, nullsFirst: true });
      if (error) throw error;
      return data as EducationRecord[];
    },
    enabled: !!user?.id
  });

  const { data: allDocuments = [] } = useQuery({
    queryKey: ["education-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("education_documents")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EducationDocument[];
    },
    enabled: !!user?.id
  });

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/education/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("documents")
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const addRecordMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("education_records").insert({
        user_id: user?.id,
        institution: data.institution,
        degree: data.degree,
        course: data.course || null,
        start_year: data.start_year ? parseInt(data.start_year) : null,
        end_year: data.end_year ? parseInt(data.end_year) : null,
        notes: data.notes || null
      });
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: `Added education record: ${data.institution}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-records"] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Education record added" });
    }
  });

  const updateRecordMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("education_records")
        .update({
          institution: data.institution,
          degree: data.degree,
          course: data.course || null,
          start_year: data.start_year ? parseInt(data.start_year) : null,
          end_year: data.end_year ? parseInt(data.end_year) : null,
          notes: data.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-records"] });
      setEditingRecord(null);
      resetForm();
      toast({ title: "Record updated" });
    }
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const record = records.find(r => r.id === id);
      const { error } = await supabase.from("education_records").delete().eq("id", id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: `Deleted education record: ${record?.institution}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-records"] });
      toast({ title: "Record deleted" });
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: async ({ educationId, data }: { educationId: string; data: typeof docFormData }) => {
      if (!data.file) throw new Error("No file selected");
      
      const fileUrl = await uploadFile(data.file);
      
      const { error } = await supabase.from("education_documents").insert({
        user_id: user?.id,
        education_id: educationId,
        document_type: data.document_type,
        title: data.title || data.document_type,
        file_url: fileUrl
      });
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: `Uploaded ${data.document_type} for education record`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-documents"] });
      setUploadingFor(null);
      setDocFormData({ document_type: "Certificate", title: "", file: null });
      toast({ title: "Document uploaded" });
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("education_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-documents"] });
      toast({ title: "Document deleted" });
    }
  });

  const resetForm = () => {
    setFormData({
      institution: "",
      degree: "",
      course: "",
      start_year: "",
      end_year: "",
      notes: ""
    });
  };

  const openEdit = (record: EducationRecord) => {
    setEditingRecord(record);
    setFormData({
      institution: record.institution,
      degree: record.degree,
      course: record.course || "",
      start_year: record.start_year?.toString() || "",
      end_year: record.end_year?.toString() || "",
      notes: record.notes || ""
    });
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecords(newExpanded);
  };

  const getDocumentsForRecord = (recordId: string) => {
    return allDocuments.filter(d => d.education_id === recordId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Education Records</h2>
          <p className="text-sm text-muted-foreground">
            Your academic history and certificates
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Education
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Education Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Institution Name</Label>
                <Input
                  value={formData.institution}
                  onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                  placeholder="University / School name"
                />
              </div>

              <div>
                <Label>Degree / Qualification</Label>
                <Input
                  value={formData.degree}
                  onChange={(e) => setFormData(prev => ({ ...prev, degree: e.target.value }))}
                  placeholder="e.g., B.Tech, MBA, 12th Standard"
                />
              </div>

              <div>
                <Label>Course / Specialization (optional)</Label>
                <Input
                  value={formData.course}
                  onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                  placeholder="e.g., Computer Science"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Year</Label>
                  <Input
                    type="number"
                    value={formData.start_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_year: e.target.value }))}
                    placeholder="2018"
                  />
                </div>
                <div>
                  <Label>End Year</Label>
                  <Input
                    type="number"
                    value={formData.end_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_year: e.target.value }))}
                    placeholder="2022"
                  />
                </div>
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button 
                onClick={() => addRecordMutation.mutate(formData)}
                disabled={!formData.institution || !formData.degree || addRecordMutation.isPending}
                className="w-full"
              >
                {addRecordMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {records.map((record) => {
          const docs = getDocumentsForRecord(record.id);
          const isExpanded = expandedRecords.has(record.id);
          
          return (
            <Card key={record.id} className="bg-card/50 border-border/50">
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(record.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{record.degree}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {record.institution}
                          {record.start_year && record.end_year && (
                            <span>• {record.start_year} - {record.end_year}</span>
                          )}
                        </div>
                        {record.course && (
                          <p className="text-xs text-muted-foreground mt-1">{record.course}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this record and all its documents?")) {
                            deleteRecordMutation.mutate(record.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border-t border-border/50 pt-4 mt-2">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium">Documents ({docs.length})</h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setUploadingFor(record.id)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                      
                      {docs.length > 0 ? (
                        <div className="grid gap-2">
                          {docs.map(doc => (
                            <div 
                              key={doc.id} 
                              className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm">{doc.title}</p>
                                  <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => window.open(doc.file_url, "_blank")}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    if (confirm("Delete this document?")) {
                                      deleteDocMutation.mutate(doc.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No documents uploaded yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {records.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No education records added</p>
            <p className="text-sm">Add your first record to get started</p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Education Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Institution Name</Label>
              <Input
                value={formData.institution}
                onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
              />
            </div>
            <div>
              <Label>Degree / Qualification</Label>
              <Input
                value={formData.degree}
                onChange={(e) => setFormData(prev => ({ ...prev, degree: e.target.value }))}
              />
            </div>
            <div>
              <Label>Course / Specialization</Label>
              <Input
                value={formData.course}
                onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Year</Label>
                <Input
                  type="number"
                  value={formData.start_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_year: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Year</Label>
                <Input
                  type="number"
                  value={formData.end_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_year: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <Button 
              onClick={() => editingRecord && updateRecordMutation.mutate({ ...formData, id: editingRecord.id })}
              disabled={updateRecordMutation.isPending}
              className="w-full"
            >
              {updateRecordMutation.isPending ? "Saving..." : "Update Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={!!uploadingFor} onOpenChange={(open) => !open && setUploadingFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Document Type</Label>
              <select 
                className="w-full p-2 border rounded-md bg-background"
                value={docFormData.document_type}
                onChange={(e) => setDocFormData(prev => ({ ...prev, document_type: e.target.value }))}
              >
                {DOCUMENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Title (optional)</Label>
              <Input
                value={docFormData.title}
                onChange={(e) => setDocFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Final Year Marksheet"
              />
            </div>
            <div>
              <Label>Upload File</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setDocFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="hidden"
                  id="edu-doc-upload"
                />
                <label htmlFor="edu-doc-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {docFormData.file ? docFormData.file.name : "Click to upload PDF or image"}
                  </p>
                </label>
              </div>
            </div>
            <Button 
              onClick={() => uploadingFor && uploadDocMutation.mutate({ educationId: uploadingFor, data: docFormData })}
              disabled={!docFormData.file || uploadDocMutation.isPending}
              className="w-full"
            >
              {uploadDocMutation.isPending ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EducationRecords;
