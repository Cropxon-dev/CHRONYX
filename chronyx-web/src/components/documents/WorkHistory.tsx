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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  Briefcase, 
  Upload, 
  Eye, 
  Trash2, 
  Edit2,
  ChevronDown,
  FileText,
  Building,
  Calendar
} from "lucide-react";
import { format, differenceInMonths, differenceInYears } from "date-fns";

interface WorkRecord {
  id: string;
  company_name: string;
  role: string;
  employment_type: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean | null;
  notes: string | null;
  created_at: string;
}

interface WorkDocument {
  id: string;
  work_history_id: string;
  document_type: string;
  title: string;
  file_url: string;
  created_at: string;
}

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const DOCUMENT_TYPES = ["Offer Letter", "Experience Letter", "Relieving Letter", "Payslip", "Other"];

const WorkHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WorkRecord | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    company_name: "",
    role: "",
    employment_type: "Full-time",
    start_date: "",
    end_date: "",
    is_current: false,
    notes: ""
  });
  const [docFormData, setDocFormData] = useState({
    document_type: "Offer Letter",
    title: "",
    file: null as File | null
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["work-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_history")
        .select("*")
        .eq("user_id", user?.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as WorkRecord[];
    },
    enabled: !!user?.id
  });

  const { data: allDocuments = [] } = useQuery({
    queryKey: ["work-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_documents")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WorkDocument[];
    },
    enabled: !!user?.id
  });

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/work/${Date.now()}.${fileExt}`;
    
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
      const { error } = await supabase.from("work_history").insert({
        user_id: user?.id,
        company_name: data.company_name,
        role: data.role,
        employment_type: data.employment_type,
        start_date: data.start_date,
        end_date: data.is_current ? null : data.end_date || null,
        is_current: data.is_current,
        notes: data.notes || null
      });
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: `Added work history: ${data.company_name} - ${data.role}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-history"] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Work history added" });
    }
  });

  const updateRecordMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("work_history")
        .update({
          company_name: data.company_name,
          role: data.role,
          employment_type: data.employment_type,
          start_date: data.start_date,
          end_date: data.is_current ? null : data.end_date || null,
          is_current: data.is_current,
          notes: data.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-history"] });
      setEditingRecord(null);
      resetForm();
      toast({ title: "Record updated" });
    }
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const record = records.find(r => r.id === id);
      const { error } = await supabase.from("work_history").delete().eq("id", id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: `Deleted work history: ${record?.company_name}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-history"] });
      toast({ title: "Record deleted" });
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: async ({ workId, data }: { workId: string; data: typeof docFormData }) => {
      if (!data.file) throw new Error("No file selected");
      
      const fileUrl = await uploadFile(data.file);
      
      const { error } = await supabase.from("work_documents").insert({
        user_id: user?.id,
        work_history_id: workId,
        document_type: data.document_type,
        title: data.title || data.document_type,
        file_url: fileUrl
      });
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: `Uploaded ${data.document_type} for work history`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-documents"] });
      setUploadingFor(null);
      setDocFormData({ document_type: "Offer Letter", title: "", file: null });
      toast({ title: "Document uploaded" });
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-documents"] });
      toast({ title: "Document deleted" });
    }
  });

  const resetForm = () => {
    setFormData({
      company_name: "",
      role: "",
      employment_type: "Full-time",
      start_date: "",
      end_date: "",
      is_current: false,
      notes: ""
    });
  };

  const openEdit = (record: WorkRecord) => {
    setEditingRecord(record);
    setFormData({
      company_name: record.company_name,
      role: record.role,
      employment_type: record.employment_type,
      start_date: record.start_date,
      end_date: record.end_date || "",
      is_current: record.is_current || false,
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
    return allDocuments.filter(d => d.work_history_id === recordId);
  };

  const getDuration = (startDate: string, endDate: string | null, isCurrent: boolean | null) => {
    const start = new Date(startDate);
    const end = isCurrent ? new Date() : endDate ? new Date(endDate) : new Date();
    const years = differenceInYears(end, start);
    const months = differenceInMonths(end, start) % 12;
    
    if (years > 0) {
      return `${years}y ${months}m`;
    }
    return `${months}m`;
  };

  // Calculate total experience
  const totalExperience = records.reduce((total, record) => {
    const start = new Date(record.start_date);
    const end = record.is_current ? new Date() : record.end_date ? new Date(record.end_date) : new Date();
    return total + differenceInMonths(end, start);
  }, 0);

  const totalYears = Math.floor(totalExperience / 12);
  const remainingMonths = totalExperience % 12;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Work & Career History</h2>
          <p className="text-sm text-muted-foreground">
            Total Experience: {totalYears > 0 ? `${totalYears} years ` : ""}{remainingMonths} months
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Employment Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Company name"
                />
              </div>

              <div>
                <Label>Role / Designation</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g., Software Engineer"
                />
              </div>

              <div>
                <Label>Employment Type</Label>
                <Select 
                  value={formData.employment_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, employment_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    disabled={formData.is_current}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="is_current"
                  checked={formData.is_current}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_current: !!checked }))}
                />
                <Label htmlFor="is_current" className="text-sm">Currently working here</Label>
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
                disabled={!formData.company_name || !formData.role || !formData.start_date || addRecordMutation.isPending}
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
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{record.role}</CardTitle>
                          {record.is_current && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {record.company_name}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(record.start_date), "MMM yyyy")} - {record.is_current ? "Present" : record.end_date ? format(new Date(record.end_date), "MMM yyyy") : "N/A"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getDuration(record.start_date, record.end_date, record.is_current)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {record.employment_type}
                          </Badge>
                        </div>
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
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No work history added</p>
            <p className="text-sm">Add your first employment record to get started</p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employment Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Role / Designation</Label>
              <Input
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              />
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select 
                value={formData.employment_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, employment_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  disabled={formData.is_current}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="is_current_edit"
                checked={formData.is_current}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_current: !!checked }))}
              />
              <Label htmlFor="is_current_edit" className="text-sm">Currently working here</Label>
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
                placeholder="e.g., April 2024 Payslip"
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
                  id="work-doc-upload"
                />
                <label htmlFor="work-doc-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {docFormData.file ? docFormData.file.name : "Click to upload PDF or image"}
                  </p>
                </label>
              </div>
            </div>
            <Button 
              onClick={() => uploadingFor && uploadDocMutation.mutate({ workId: uploadingFor, data: docFormData })}
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

export default WorkHistory;
