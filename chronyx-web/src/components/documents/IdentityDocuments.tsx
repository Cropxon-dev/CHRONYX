import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  Upload, 
  Eye, 
  Download, 
  Trash2, 
  Edit2,
  Lock,
  Calendar,
  AlertCircle
} from "lucide-react";
import { format, isAfter, isBefore, addMonths } from "date-fns";

const IDENTITY_TYPES = [
  { id: "aadhaar", name: "Aadhaar Card" },
  { id: "pan", name: "PAN Card" },
  { id: "passport", name: "Passport" },
  { id: "driving_license", name: "Driving License" },
  { id: "voter_id", name: "Voter ID" },
  { id: "other", name: "Other" }
];

interface Document {
  id: string;
  document_type: string;
  category: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  is_locked: boolean | null;
  created_at: string;
}

const IdentityDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    document_type: "",
    title: "",
    issue_date: "",
    expiry_date: "",
    notes: "",
    file: null as File | null
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["identity-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user?.id)
        .eq("category", "identity")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!user?.id
  });

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("documents")
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.file) throw new Error("No file selected");
      
      setUploading(true);
      const fileUrl = await uploadFile(data.file);
      
      const docType = IDENTITY_TYPES.find(t => t.id === data.document_type);
      
      const { error } = await supabase.from("documents").insert({
        user_id: user?.id,
        category: "identity",
        document_type: data.document_type,
        title: data.title || docType?.name || "Document",
        file_url: fileUrl,
        issue_date: data.issue_date || null,
        expiry_date: data.expiry_date || null,
        notes: data.notes
      });
      
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: `Uploaded ${data.title || docType?.name}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-documents"] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Document uploaded successfully" });
      setUploading(false);
    },
    onError: (error) => {
      setUploading(false);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const doc = documents.find(d => d.id === id);
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: `Deleted ${doc?.title}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["identity-documents"] });
      toast({ title: "Document deleted" });
    }
  });

  const resetForm = () => {
    setFormData({
      document_type: "",
      title: "",
      issue_date: "",
      expiry_date: "",
      notes: "",
      file: null
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const warningDate = addMonths(now, 3);
    
    if (isBefore(expiry, now)) return "expired";
    if (isBefore(expiry, warningDate)) return "expiring";
    return "valid";
  };

  const handlePreview = async (doc: Document) => {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_url.split("/documents/")[1], 3600);
    
    if (data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
    }
  };

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_url.split("/documents/")[1], 60);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Identity Documents</h2>
          <p className="text-sm text-muted-foreground">
            Store your important identity documents securely
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Identity Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Document Type</Label>
                <Select 
                  value={formData.document_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, document_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {IDENTITY_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title (optional)</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Front side, Updated copy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Upload File</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {formData.file ? formData.file.name : "Click to upload PDF or image"}
                    </p>
                  </label>
                </div>
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Private notes..."
                  rows={2}
                />
              </div>

              <Button 
                onClick={() => addMutation.mutate(formData)}
                disabled={!formData.document_type || !formData.file || uploading}
                className="w-full"
              >
                {uploading ? "Uploading securely..." : "Save Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => {
          const docType = IDENTITY_TYPES.find(t => t.id === doc.document_type);
          const expiryStatus = getExpiryStatus(doc.expiry_date);
          
          return (
            <Card key={doc.id} className="bg-card/50 border-border/50 hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{doc.title}</h3>
                      <p className="text-xs text-muted-foreground">{docType?.name}</p>
                    </div>
                  </div>
                  {doc.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>

                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                  {doc.issue_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Issued: {format(new Date(doc.issue_date), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {doc.expiry_date && (
                    <div className="flex items-center gap-2">
                      {expiryStatus === "expired" && <AlertCircle className="h-3 w-3 text-destructive" />}
                      {expiryStatus === "expiring" && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                      <span className={expiryStatus === "expired" ? "text-destructive" : expiryStatus === "expiring" ? "text-yellow-500" : ""}>
                        Expires: {format(new Date(doc.expiry_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>

                {expiryStatus && (
                  <Badge 
                    variant={expiryStatus === "expired" ? "destructive" : expiryStatus === "expiring" ? "secondary" : "outline"}
                    className="mb-3"
                  >
                    {expiryStatus === "expired" ? "Expired" : expiryStatus === "expiring" ? "Expiring Soon" : "Valid"}
                  </Badge>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handlePreview(doc)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this document?")) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {documents.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No identity documents uploaded</p>
            <p className="text-sm">Add your first document to get started</p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} className="w-full h-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IdentityDocuments;
