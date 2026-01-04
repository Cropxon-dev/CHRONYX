import { useState, useEffect } from "react";
import { Users, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface FamilyMember {
  id: string;
  full_name: string;
  relation: string;
  date_of_birth: string | null;
  notes: string | null;
  policy_count?: number;
  claim_count?: number;
}

const RELATIONS = ["Self", "Spouse", "Child", "Parent", "Sibling", "Other"];

const FamilyMembers = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    relation: "",
    date_of_birth: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchMembers();
    }
  }, [user]);

  const fetchMembers = async () => {
    try {
      const { data: membersData, error } = await supabase
        .from("family_members")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch policy and claim counts
      const membersWithCounts = await Promise.all(
        (membersData || []).map(async (member) => {
          const { count: policyCount } = await supabase
            .from("insurances")
            .select("*", { count: "exact", head: true })
            .eq("insured_member_id", member.id);

          const { count: claimCount } = await supabase
            .from("insurance_claims")
            .select("*", { count: "exact", head: true })
            .eq("insured_member_id", member.id);

          return {
            ...member,
            policy_count: policyCount || 0,
            claim_count: claimCount || 0,
          };
        })
      );

      setMembers(membersWithCounts);
    } catch (error) {
      console.error("Error fetching family members:", error);
      toast.error("Failed to fetch family members");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.relation) {
      toast.error("Name and relation are required");
      return;
    }

    try {
      if (selectedMember) {
        const { error } = await supabase
          .from("family_members")
          .update({
            full_name: formData.full_name,
            relation: formData.relation,
            date_of_birth: formData.date_of_birth || null,
            notes: formData.notes || null,
          })
          .eq("id", selectedMember.id);

        if (error) throw error;
        await logActivity("Updated family member", "insurance");
        toast.success("Family member updated");
      } else {
        const { error } = await supabase
          .from("family_members")
          .insert({
            user_id: user!.id,
            full_name: formData.full_name,
            relation: formData.relation,
            date_of_birth: formData.date_of_birth || null,
            notes: formData.notes || null,
          });

        if (error) throw error;
        await logActivity("Added family member", "insurance");
        toast.success("Family member added");
      }

      setDialogOpen(false);
      resetForm();
      fetchMembers();
    } catch (error) {
      console.error("Error saving family member:", error);
      toast.error("Failed to save family member");
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", selectedMember.id);

      if (error) throw error;
      await logActivity("Deleted family member", "insurance");
      toast.success("Family member deleted");
      setDeleteDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      console.error("Error deleting family member:", error);
      toast.error("Failed to delete family member");
    }
  };

  const openEditDialog = (member: FamilyMember) => {
    setSelectedMember(member);
    setFormData({
      full_name: member.full_name,
      relation: member.relation,
      date_of_birth: member.date_of_birth || "",
      notes: member.notes || "",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (member: FamilyMember) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedMember(null);
    setFormData({
      full_name: "",
      relation: "",
      date_of_birth: "",
      notes: "",
    });
  };

  const canDelete = (member: FamilyMember) => {
    return (member.policy_count || 0) === 0 && (member.claim_count || 0) === 0;
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
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-foreground">Family Members</h2>
            <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedMember ? "Edit" : "Add"} Family Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Relation *</Label>
                <Select
                  value={formData.relation}
                  onValueChange={(value) => setFormData({ ...formData, relation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONS.map((rel) => (
                      <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="flex-1">
                  {selectedMember ? "Update" : "Add"} Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No family members</h3>
          <p className="text-sm text-muted-foreground mb-4">Add family members to track their insurance policies</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-foreground">{member.full_name}</h3>
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                    {member.relation}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {member.date_of_birth && (
                    <span>DOB: {format(new Date(member.date_of_birth), 'MMM d, yyyy')}</span>
                  )}
                  <span>{member.policy_count} polic{member.policy_count === 1 ? 'y' : 'ies'}</span>
                  <span>{member.claim_count} claim{member.claim_count === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(member)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                {canDelete(member) ? (
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(member)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" disabled title="Cannot delete - has linked policies or claims">
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Family Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedMember?.full_name}? This action cannot be undone.
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

export default FamilyMembers;
