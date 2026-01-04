import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Upload, 
  FileText, 
  Download, 
  Share2, 
  Trash2, 
  Eye,
  Loader2,
  File,
  Image,
  Mail,
  MessageCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, parseISO } from "date-fns";

interface LoanDocumentsProps {
  loanId: string;
}

const DOCUMENT_TYPES = ["Agreement", "Schedule", "Receipt", "Statement", "Other"];

export const LoanDocuments = ({ loanId }: LoanDocumentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("Agreement");

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["loan-documents", loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_documents")
        .select("*")
        .eq("loan_id", loanId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!loanId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user!.id}/${loanId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("loan-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("loan-documents")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("loan_documents").insert({
        loan_id: loanId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        document_type: documentType,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-documents", loanId] });
      toast({ title: "Document uploaded" });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("loan_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-documents", loanId] });
      toast({ title: "Document deleted" });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large (max 10MB)", variant: "destructive" });
      return;
    }

    setUploading(true);
    await uploadMutation.mutateAsync(file);
    setUploading(false);
    e.target.value = "";
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

  const handleShare = async (url: string, fileName: string, method: "whatsapp" | "email" | "native") => {
    if (method === "native" && navigator.share) {
      try {
        await navigator.share({
          title: fileName,
          url: url,
        });
      } catch (err) {
        // User cancelled
      }
    } else if (method === "whatsapp") {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${fileName}: ${url}`)}`;
      window.open(whatsappUrl, "_blank");
    } else if (method === "email") {
      const subject = encodeURIComponent(`Loan Document: ${fileName}`);
      const body = encodeURIComponent(`Please find the loan document attached:\n\n${fileName}\n${url}`);
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (fileType === "application/pdf") return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger className="w-full sm:w-40 bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <label className="flex-1">
          <Input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            id="doc-upload"
          />
          <Button
            variant="outline"
            className="w-full border-dashed border-2 cursor-pointer"
            asChild
            disabled={uploading}
          >
            <label htmlFor="doc-upload" className="cursor-pointer">
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Document
            </label>
          </Button>
        </label>
      </div>

      {/* Documents List */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No documents uploaded yet
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                {getFileIcon(doc.file_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-muted">{doc.document_type}</span>
                  <span>{format(parseISO(doc.uploaded_at), "MMM d, yyyy h:mm a")}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewUrl(doc.file_url)}
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
                    <DropdownMenuItem onClick={() => handleShare(doc.file_url, doc.file_name, "whatsapp")}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare(doc.file_url, doc.file_name, "email")}>
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </DropdownMenuItem>
                    {navigator.share && (
                      <DropdownMenuItem onClick={() => handleShare(doc.file_url, doc.file_name, "native")}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share...
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
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
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh] overflow-auto">
            {previewUrl?.endsWith(".pdf") ? (
              <iframe src={previewUrl} className="w-full h-full" />
            ) : (
              <img src={previewUrl || ""} alt="Preview" className="max-w-full h-auto" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
