import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Upload, FileText, Download, Trash2, Eye, Share2, Mail, MessageCircle, Loader2 } from "lucide-react";

interface InsuranceDocumentsProps {
  insuranceId: string;
}

const DOCUMENT_TYPES = [
  { value: "policy", label: "Policy Document" },
  { value: "premium_receipt", label: "Premium Receipt" },
  { value: "renewal_notice", label: "Renewal Notice" },
  { value: "claim_form", label: "Claim Form" },
  { value: "id_proof", label: "ID Proof" },
  { value: "other", label: "Other" },
];

export const InsuranceDocuments = ({ insuranceId }: InsuranceDocumentsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("policy");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["insurance-documents", insuranceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_documents")
        .select("*")
        .eq("insurance_id", insuranceId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${insuranceId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("insurance-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("insurance-documents")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("insurance_documents").insert({
        insurance_id: insuranceId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        document_type: selectedType,
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-documents", insuranceId] });
      toast({ title: "Document uploaded successfully" });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from("insurance_documents")
        .delete()
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-documents", insuranceId] });
      toast({ title: "Document deleted" });
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File must be less than 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = (doc: typeof documents[0], method: "whatsapp" | "email") => {
    const message = `Insurance Document: ${doc.file_name}\n${doc.file_url}`;
    
    if (method === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    } else if (method === "email") {
      window.location.href = `mailto:?subject=Insurance Document: ${doc.file_name}&body=${encodeURIComponent(message)}`;
    }
  };

  const handlePreview = (doc: typeof documents[0]) => {
    setPreviewUrl(doc.file_url);
    setPreviewType(doc.file_type);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "🖼️";
    if (fileType === "application/pdf") return "📄";
    return "📎";
  };

  const getDocTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="flex items-center gap-3 flex-wrap p-4 bg-muted/30 rounded-lg border border-border">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48 bg-background border-border">
            <SelectValue placeholder="Document type" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          type="file"
          id="insurance-doc-upload"
          className="hidden"
          onChange={handleUpload}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
        />
        <label htmlFor="insurance-doc-upload">
          <Button
            variant="outline"
            className="border-border cursor-pointer"
            disabled={uploading}
            asChild
          >
            <span>
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Document
            </span>
          </Button>
        </label>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No documents uploaded yet
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xl">{getFileIcon(doc.file_type)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getDocTypeLabel(doc.document_type)} •{" "}
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePreview(doc)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(doc.file_url, doc.file_name)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem onClick={() => handleShare(doc, "whatsapp")}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare(doc, "email")}>
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm("Delete this document?")) {
                      deleteMutation.mutate(doc.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewType === "application/pdf" ? (
              <iframe src={previewUrl || ""} className="w-full h-[70vh]" />
            ) : previewType.startsWith("image/") ? (
              <img
                src={previewUrl || ""}
                alt="Preview"
                className="max-w-full h-auto mx-auto"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Preview not available for this file type
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
