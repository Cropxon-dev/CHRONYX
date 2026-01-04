import { useState, useEffect } from "react";
import { FileText, Upload, Download, Share2, Printer, Mail, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { toast } from "sonner";
import { format } from "date-fns";

interface ClaimDocument {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  document_type: string;
  uploaded_at: string;
}

interface Claim {
  id: string;
  insurance_id: string;
  insured_member_id: string | null;
  claim_reference_no: string | null;
  claim_type: string;
  claim_date: string;
  claimed_amount: number;
  approved_amount: number | null;
  settled_amount: number | null;
  status: string;
  notes: string | null;
  insurance?: {
    policy_name: string;
    provider: string;
    policy_number: string;
  };
  family_member?: {
    full_name: string;
  };
}

interface ClaimDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: Claim | null;
  onUpdate: () => void;
}

const DOCUMENT_TYPES = ["Claim Form", "Hospital Bill", "Discharge Summary", "FIR", "Surveyor Report", "Settlement Letter", "Other"];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const ClaimDetails = ({ open, onOpenChange, claim, onUpdate }: ClaimDetailsProps) => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("Other");

  useEffect(() => {
    if (open && claim) {
      fetchDocuments();
    }
  }, [open, claim]);

  const fetchDocuments = async () => {
    if (!claim) return;
    
    try {
      const { data, error } = await supabase
        .from("insurance_claim_documents")
        .select("*")
        .eq("claim_id", claim.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !claim || !user) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${claim.insurance_id}/claims/${claim.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("insurance-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("insurance-documents")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("insurance_claim_documents")
        .insert({
          claim_id: claim.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          document_type: docType,
        });

      if (dbError) throw dbError;

      await logActivity("Uploaded claim document", "insurance");
      toast.success("Document uploaded");
      fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (doc: ClaimDocument) => {
    window.open(doc.file_url, '_blank');
  };

  const handlePrint = (doc: ClaimDocument) => {
    const printWindow = window.open(doc.file_url, '_blank');
    printWindow?.print();
  };

  const handleEmailShare = (doc: ClaimDocument) => {
    const subject = `Claim Document: ${doc.file_name}`;
    const body = `Please find the attached claim document.\n\nDocument: ${doc.file_name}\nType: ${doc.document_type}\n\nView/Download: ${doc.file_url}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleWhatsAppShare = (doc: ClaimDocument) => {
    const text = `Claim Document: ${doc.file_name}\nType: ${doc.document_type}\n${doc.file_url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDelete = async (doc: ClaimDocument) => {
    try {
      const { error } = await supabase
        .from("insurance_claim_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;
      await logActivity("Deleted claim document", "insurance");
      toast.success("Document deleted");
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  if (!claim) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claim Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Claim Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Reference No</p>
              <p className="font-medium">{claim.claim_reference_no || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary">{claim.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Policy</p>
              <p className="font-medium">{claim.insurance?.provider}</p>
              <p className="text-xs text-muted-foreground">{claim.insurance?.policy_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Claim Type</p>
              <p className="font-medium">{claim.claim_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Claim Date</p>
              <p className="font-medium">{format(new Date(claim.claim_date), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member</p>
              <p className="font-medium">{claim.family_member?.full_name || 'Self'}</p>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Claimed</p>
              <p className="text-lg font-semibold">{formatCurrency(claim.claimed_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-lg font-semibold text-green-600">
                {claim.approved_amount ? formatCurrency(claim.approved_amount) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Settled</p>
              <p className="text-lg font-semibold text-primary">
                {claim.settled_amount ? formatCurrency(claim.settled_amount) : '-'}
              </p>
            </div>
          </div>

          {/* Notes */}
          {claim.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{claim.notes}</p>
            </div>
          )}

          {/* Documents */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents
              </h4>
              <div className="flex items-center gap-2">
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label htmlFor="doc-upload" className="cursor-pointer">
                  <Button asChild variant="outline" size="sm" disabled={uploading}>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload"}
                    </span>
                  </Button>
                </Label>
                <input
                  id="doc-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.document_type} • {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handlePrint(doc)}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEmailShare(doc)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleWhatsAppShare(doc)}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimDetails;
