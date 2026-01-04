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
  DialogDescription,
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
import PolicyDocumentScanner from "./PolicyDocumentScanner";

interface FamilyMember {
  id: string;
  full_name: string;
}

interface Insurance {
  id: string;
  policy_name: string;
  provider: string;
  policy_number: string;
  policy_type: string;
  premium_amount: number;
  sum_assured: number;
  start_date: string;
  renewal_date: string;
  insured_type: string;
  insured_member_id: string | null;
  vehicle_registration: string | null;
  notes: string | null;
  status: string;
}

interface AddInsuranceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insurance: Insurance | null;
  onSuccess: () => void;
}

const POLICY_TYPES = ["Term Life", "Health", "Vehicle", "Home", "Travel", "Other"];
const INSURED_TYPES = ["self", "family", "vehicle"];

const AddInsuranceForm = ({ open, onOpenChange, insurance, onSuccess }: AddInsuranceFormProps) => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [loading, setLoading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [formData, setFormData] = useState({
    policy_name: "",
    provider: "",
    policy_number: "",
    policy_type: "",
    premium_amount: "",
    sum_assured: "",
    start_date: new Date().toISOString().split('T')[0],
    renewal_date: "",
    insured_type: "self",
    insured_member_id: "",
    vehicle_registration: "",
    notes: "",
  });

  useEffect(() => {
    if (open && user) {
      fetchFamilyMembers();
    }
  }, [open, user]);

  useEffect(() => {
    if (insurance) {
      setFormData({
        policy_name: insurance.policy_name,
        provider: insurance.provider,
        policy_number: insurance.policy_number,
        policy_type: insurance.policy_type,
        premium_amount: insurance.premium_amount.toString(),
        sum_assured: insurance.sum_assured.toString(),
        start_date: insurance.start_date,
        renewal_date: insurance.renewal_date,
        insured_type: insurance.insured_type,
        insured_member_id: insurance.insured_member_id || "",
        vehicle_registration: insurance.vehicle_registration || "",
        notes: insurance.notes || "",
      });
    } else {
      resetForm();
    }
  }, [insurance]);

  const fetchFamilyMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select("id, full_name");

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (error) {
      console.error("Error fetching family members:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      policy_name: "",
      provider: "",
      policy_number: "",
      policy_type: "",
      premium_amount: "",
      sum_assured: "",
      start_date: new Date().toISOString().split('T')[0],
      renewal_date: "",
      insured_type: "self",
      insured_member_id: "",
      vehicle_registration: "",
      notes: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.policy_name || !formData.provider || !formData.policy_number || !formData.policy_type) {
      toast.error("Please fill in required fields");
      return;
    }

    if (!formData.start_date || !formData.renewal_date) {
      toast.error("Please fill in start and renewal dates");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        user_id: user!.id,
        policy_name: formData.policy_name,
        provider: formData.provider,
        policy_number: formData.policy_number,
        policy_type: formData.policy_type,
        premium_amount: parseFloat(formData.premium_amount) || 0,
        sum_assured: parseFloat(formData.sum_assured) || 0,
        start_date: formData.start_date,
        renewal_date: formData.renewal_date,
        insured_type: formData.insured_type,
        insured_member_id: formData.insured_type === 'family' ? formData.insured_member_id || null : null,
        vehicle_registration: formData.insured_type === 'vehicle' ? formData.vehicle_registration || null : null,
        notes: formData.notes || null,
      };

      if (insurance) {
        const { error } = await supabase
          .from("insurances")
          .update(payload)
          .eq("id", insurance.id);

        if (error) throw error;
        await logActivity("Updated insurance policy", "insurance");
        toast.success("Policy updated");
      } else {
        const { error } = await supabase
          .from("insurances")
          .insert(payload);

        if (error) throw error;
        await logActivity("Added insurance policy", "insurance");
        toast.success("Policy added");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving insurance:", error);
      toast.error("Failed to save policy");
    } finally {
      setLoading(false);
    }
  };

  const handleOcrData = (data: any) => {
    setFormData(prev => ({
      ...prev,
      policy_name: data.policy_name || prev.policy_name,
      provider: data.provider || prev.provider,
      policy_number: data.policy_number || prev.policy_number,
      policy_type: data.policy_type || prev.policy_type,
      premium_amount: data.premium_amount || prev.premium_amount,
      sum_assured: data.sum_assured || prev.sum_assured,
      start_date: data.start_date || prev.start_date,
      renewal_date: data.renewal_date || prev.renewal_date,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{insurance ? "Edit" : "Add"} Insurance Policy</DialogTitle>
          <DialogDescription>
            {!insurance && "Upload a document to auto-fill or enter details manually"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!insurance && (
            <div className="flex justify-end">
              <PolicyDocumentScanner onDataExtracted={handleOcrData} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Policy Name *</Label>
            <Input
              value={formData.policy_name}
              onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
              placeholder="e.g., Family Health Plan"
            />
          </div>

          <div className="space-y-2">
            <Label>Provider *</Label>
            <Input
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g., ICICI Lombard"
            />
          </div>

          <div className="space-y-2">
            <Label>Policy Number *</Label>
            <Input
              value={formData.policy_number}
              onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
              placeholder="Policy number"
            />
          </div>

          <div className="space-y-2">
            <Label>Policy Type *</Label>
            <Select value={formData.policy_type} onValueChange={(v) => setFormData({ ...formData, policy_type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {POLICY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Premium Amount</Label>
              <Input
                type="number"
                value={formData.premium_amount}
                onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                placeholder="₹"
              />
            </div>
            <div className="space-y-2">
              <Label>Sum Assured</Label>
              <Input
                type="number"
                value={formData.sum_assured}
                onChange={(e) => setFormData({ ...formData, sum_assured: e.target.value })}
                placeholder="₹"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Renewal Date *</Label>
              <Input
                type="date"
                value={formData.renewal_date}
                onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Insured For</Label>
            <Select value={formData.insured_type} onValueChange={(v) => setFormData({ ...formData, insured_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Self</SelectItem>
                <SelectItem value="family">Family Member</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.insured_type === 'family' && (
            <div className="space-y-2">
              <Label>Select Family Member</Label>
              <Select value={formData.insured_member_id} onValueChange={(v) => setFormData({ ...formData, insured_member_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.insured_type === 'vehicle' && (
            <div className="space-y-2">
              <Label>Vehicle Registration</Label>
              <Input
                value={formData.vehicle_registration}
                onChange={(e) => setFormData({ ...formData, vehicle_registration: e.target.value })}
                placeholder="e.g., MH-01-AB-1234"
              />
            </div>
          )}

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
              {loading ? "Saving..." : insurance ? "Update" : "Add"} Policy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddInsuranceForm;
