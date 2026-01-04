import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { toast } from "sonner";

interface Insurance {
  id: string;
  policy_name: string;
  provider: string;
  policy_number: string;
  insured_member_id: string | null;
}

interface FamilyMember {
  id: string;
  full_name: string;
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
}

interface AddClaimFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: Claim | null;
  onSuccess: () => void;
}

const CLAIM_TYPES = ["Medical", "Accident", "Theft", "Damage", "Other"];
const CLAIM_STATUSES = ["Filed", "Under Review", "Approved", "Rejected", "Settled"];

const AddClaimForm = ({ open, onOpenChange, claim, onSuccess }: AddClaimFormProps) => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [loading, setLoading] = useState(false);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [formData, setFormData] = useState({
    insurance_id: "",
    insured_member_id: "",
    claim_reference_no: "",
    claim_type: "",
    claim_date: new Date().toISOString().split('T')[0],
    claimed_amount: "",
    approved_amount: "",
    settled_amount: "",
    status: "Filed",
    notes: "",
  });

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  useEffect(() => {
    if (claim) {
      setFormData({
        insurance_id: claim.insurance_id,
        insured_member_id: claim.insured_member_id || "",
        claim_reference_no: claim.claim_reference_no || "",
        claim_type: claim.claim_type,
        claim_date: claim.claim_date,
        claimed_amount: claim.claimed_amount.toString(),
        approved_amount: claim.approved_amount?.toString() || "",
        settled_amount: claim.settled_amount?.toString() || "",
        status: claim.status,
        notes: claim.notes || "",
      });
    } else {
      resetForm();
    }
  }, [claim]);

  const fetchData = async () => {
    try {
      const [{ data: ins }, { data: members }] = await Promise.all([
        supabase.from("insurances").select("id, policy_name, provider, policy_number, insured_member_id").eq("status", "active"),
        supabase.from("family_members").select("id, full_name"),
      ]);
      setInsurances(ins || []);
      setFamilyMembers(members || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      insurance_id: "",
      insured_member_id: "",
      claim_reference_no: "",
      claim_type: "",
      claim_date: new Date().toISOString().split('T')[0],
      claimed_amount: "",
      approved_amount: "",
      settled_amount: "",
      status: "Filed",
      notes: "",
    });
  };

  const handleInsuranceChange = (insuranceId: string) => {
    setFormData({ ...formData, insurance_id: insuranceId });
    const selectedInsurance = insurances.find(i => i.id === insuranceId);
    if (selectedInsurance?.insured_member_id) {
      setFormData(prev => ({ ...prev, insurance_id: insuranceId, insured_member_id: selectedInsurance.insured_member_id || "" }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.insurance_id || !formData.claim_type || !formData.claimed_amount) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        insurance_id: formData.insurance_id,
        insured_member_id: formData.insured_member_id || null,
        claim_reference_no: formData.claim_reference_no || null,
        claim_type: formData.claim_type,
        claim_date: formData.claim_date,
        claimed_amount: parseFloat(formData.claimed_amount),
        approved_amount: formData.approved_amount ? parseFloat(formData.approved_amount) : null,
        settled_amount: formData.settled_amount ? parseFloat(formData.settled_amount) : null,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (claim) {
        const { error } = await supabase
          .from("insurance_claims")
          .update(payload)
          .eq("id", claim.id);

        if (error) throw error;
        await logActivity(`Updated claim status to ${formData.status}`, "insurance");
        toast.success("Claim updated");
      } else {
        const { error } = await supabase
          .from("insurance_claims")
          .insert(payload);

        if (error) throw error;
        await logActivity("Created insurance claim", "insurance");
        toast.success("Claim created");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving claim:", error);
      toast.error("Failed to save claim");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{claim ? "Edit" : "Add"} Insurance Claim</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Insurance Policy *</Label>
            <Select value={formData.insurance_id} onValueChange={handleInsuranceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select policy" />
              </SelectTrigger>
              <SelectContent>
                {insurances.map((ins) => (
                  <SelectItem key={ins.id} value={ins.id}>
                    {ins.provider} - {ins.policy_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Family Member</Label>
            <Select value={formData.insured_member_id} onValueChange={(v) => setFormData({ ...formData, insured_member_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Self or select member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Self</SelectItem>
                {familyMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Claim Type *</Label>
            <Select value={formData.claim_type} onValueChange={(v) => setFormData({ ...formData, claim_type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Claim Reference Number</Label>
            <Input
              value={formData.claim_reference_no}
              onChange={(e) => setFormData({ ...formData, claim_reference_no: e.target.value })}
              placeholder="Optional reference"
            />
          </div>

          <div className="space-y-2">
            <Label>Claim Date *</Label>
            <Input
              type="date"
              value={formData.claim_date}
              onChange={(e) => setFormData({ ...formData, claim_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Claimed Amount *</Label>
              <Input
                type="number"
                value={formData.claimed_amount}
                onChange={(e) => setFormData({ ...formData, claimed_amount: e.target.value })}
                placeholder="₹"
              />
            </div>
            <div className="space-y-2">
              <Label>Approved Amount</Label>
              <Input
                type="number"
                value={formData.approved_amount}
                onChange={(e) => setFormData({ ...formData, approved_amount: e.target.value })}
                placeholder="₹"
              />
            </div>
            <div className="space-y-2">
              <Label>Settled Amount</Label>
              <Input
                type="number"
                value={formData.settled_amount}
                onChange={(e) => setFormData({ ...formData, settled_amount: e.target.value })}
                placeholder="₹"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
              {loading ? "Saving..." : claim ? "Update" : "Create"} Claim
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClaimForm;
