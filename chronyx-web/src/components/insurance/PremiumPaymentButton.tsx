import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface PremiumPaymentButtonProps {
  insuranceId: string;
  policyName: string;
  premiumAmount: number;
  onSuccess?: () => void;
}

const PremiumPaymentButton = ({
  insuranceId,
  policyName,
  premiumAmount,
  onSuccess,
}: PremiumPaymentButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("auto-link-insurance-expense", {
        body: {
          insurance_id: insuranceId,
          user_id: user.id,
        },
      });

      if (error) throw error;

      toast.success("Premium payment recorded", {
        description: `Expense entry created for ${policyName}`,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="gap-2"
      >
        <CreditCard className="w-4 h-4" />
        Pay Premium
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Record Premium Payment</DialogTitle>
            <DialogDescription>
              This will create an expense entry for the insurance premium payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Policy</p>
                <p className="font-medium text-foreground">{policyName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium text-foreground">{formatCurrency(premiumAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Date</p>
                <p className="font-medium text-foreground">{format(new Date(), "MMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium text-foreground">Insurance Premium</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PremiumPaymentButton;
