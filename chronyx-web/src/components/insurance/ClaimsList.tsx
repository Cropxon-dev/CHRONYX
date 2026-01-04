import { useState, useEffect } from "react";
import { FileWarning, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { toast } from "sonner";
import { format } from "date-fns";
import AddClaimForm from "./AddClaimForm";
import ClaimDetails from "./ClaimDetails";

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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Filed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'Under Review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'Settled': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    default: return 'bg-muted text-muted-foreground';
  }
};

const ClaimsList = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  useEffect(() => {
    if (user) {
      fetchClaims();
    }
  }, [user]);

  const fetchClaims = async () => {
    try {
      const { data, error } = await supabase
        .from("insurance_claims")
        .select(`
          *,
          insurance:insurances(policy_name, provider, policy_number),
          family_member:family_members(full_name)
        `)
        .order("claim_date", { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error("Error fetching claims:", error);
      toast.error("Failed to fetch claims");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClaim) return;

    try {
      const { error } = await supabase
        .from("insurance_claims")
        .delete()
        .eq("id", selectedClaim.id);

      if (error) throw error;
      await logActivity("Deleted insurance claim", "insurance");
      toast.success("Claim deleted");
      setDeleteDialogOpen(false);
      setSelectedClaim(null);
      fetchClaims();
    } catch (error) {
      console.error("Error deleting claim:", error);
      toast.error("Failed to delete claim");
    }
  };

  const openEditForm = (claim: Claim) => {
    setSelectedClaim(claim);
    setFormOpen(true);
  };

  const openDetails = (claim: Claim) => {
    setSelectedClaim(claim);
    setDetailsOpen(true);
  };

  const openDeleteDialog = (claim: Claim) => {
    setSelectedClaim(claim);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <FileWarning className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-foreground">Insurance Claims</h2>
            <p className="text-sm text-muted-foreground">{claims.length} claim{claims.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button onClick={() => { setSelectedClaim(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Claim
        </Button>
      </div>

      {/* Claims Table */}
      {claims.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <FileWarning className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No claims</h3>
          <p className="text-sm text-muted-foreground mb-4">Add claims to track your insurance claim history</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium">
                    {claim.claim_reference_no || '-'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{claim.insurance?.provider}</p>
                      <p className="text-xs text-muted-foreground">{claim.insurance?.policy_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>{claim.family_member?.full_name || 'Self'}</TableCell>
                  <TableCell>{claim.claim_type}</TableCell>
                  <TableCell>{formatCurrency(claim.claimed_amount)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(claim.status)} variant="secondary">
                      {claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(claim.claim_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openDetails(claim)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(claim)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(claim)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Form */}
      <AddClaimForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setSelectedClaim(null); }}
        claim={selectedClaim}
        onSuccess={fetchClaims}
      />

      {/* Claim Details */}
      <ClaimDetails
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        claim={selectedClaim}
        onUpdate={fetchClaims}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Claim</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this claim? This will also delete all associated documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClaimsList;
