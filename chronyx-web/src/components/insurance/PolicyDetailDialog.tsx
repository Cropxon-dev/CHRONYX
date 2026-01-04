import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Bell, Info } from "lucide-react";
import { InsuranceDocuments } from "./InsuranceDocuments";
import { RenewalReminders } from "./RenewalReminders";
import { format } from "date-fns";

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
  reminder_days?: number[] | null;
  family_member?: { full_name: string } | null;
}

interface PolicyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Insurance | null;
  onUpdate: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const PolicyDetailDialog = ({ open, onOpenChange, policy, onUpdate }: PolicyDetailDialogProps) => {
  const [activeTab, setActiveTab] = useState("details");

  if (!policy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy.policy_name}</DialogTitle>
          <DialogDescription>
            {policy.provider} • {policy.policy_type}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Policy Number</p>
                <p className="text-sm font-medium mt-1">{policy.policy_number}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                <p className="text-sm font-medium mt-1 capitalize">{policy.status}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sum Assured</p>
                <p className="text-sm font-medium mt-1">{formatCurrency(policy.sum_assured)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Premium</p>
                <p className="text-sm font-medium mt-1">{formatCurrency(policy.premium_amount)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Start Date</p>
                <p className="text-sm font-medium mt-1">{format(new Date(policy.start_date), 'MMM d, yyyy')}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Renewal Date</p>
                <p className="text-sm font-medium mt-1">{format(new Date(policy.renewal_date), 'MMM d, yyyy')}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Insured For</p>
                <p className="text-sm font-medium mt-1">
                  {policy.insured_type === 'family' ? policy.family_member?.full_name : 
                   policy.insured_type === 'vehicle' ? policy.vehicle_registration : 'Self'}
                </p>
              </div>
              {policy.notes && (
                <div className="bg-muted/50 rounded-lg p-4 col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Notes</p>
                  <p className="text-sm mt-1">{policy.notes}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <InsuranceDocuments insuranceId={policy.id} />
          </TabsContent>

          <TabsContent value="reminders" className="mt-4">
            <RenewalReminders 
              insuranceId={policy.id} 
              currentReminderDays={policy.reminder_days || [30, 7, 1]} 
              onUpdate={onUpdate}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyDetailDialog;