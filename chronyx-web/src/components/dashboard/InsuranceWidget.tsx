import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface InsuranceSummary {
  totalPolicies: number;
  selfPolicies: number;
  familyPolicies: number;
  claimsFiled: number;
  claimsSettled: number;
  totalClaimedAmount: number;
  totalSettledAmount: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const InsuranceWidget = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<InsuranceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInsuranceSummary();
    }
  }, [user]);

  const fetchInsuranceSummary = async () => {
    try {
      // Fetch insurances
      const { data: insurances } = await supabase
        .from("insurances")
        .select("id, insured_type, status")
        .eq("status", "active");

      // Fetch claims
      const { data: claims } = await supabase
        .from("insurance_claims")
        .select("status, claimed_amount, settled_amount");

      const totalPolicies = insurances?.length || 0;
      const selfPolicies = insurances?.filter(i => i.insured_type === 'self').length || 0;
      const familyPolicies = totalPolicies - selfPolicies;

      const claimsFiled = claims?.length || 0;
      const claimsSettled = claims?.filter(c => c.status === 'Settled').length || 0;
      const totalClaimedAmount = claims?.reduce((sum, c) => sum + Number(c.claimed_amount || 0), 0) || 0;
      const totalSettledAmount = claims?.reduce((sum, c) => sum + Number(c.settled_amount || 0), 0) || 0;

      setSummary({
        totalPolicies,
        selfPolicies,
        familyPolicies,
        claimsFiled,
        claimsSettled,
        totalClaimedAmount,
        totalSettledAmount,
      });
    } catch (error) {
      console.error("Error fetching insurance summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!summary || summary.totalPolicies === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-vyom-accent-soft flex items-center justify-center">
            <Shield className="w-5 h-5 text-vyom-accent" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Insurance</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">No active policies</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-vyom-accent-soft flex items-center justify-center">
          <Shield className="w-5 h-5 text-vyom-accent" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Insurance Summary</h3>
        </div>
      </div>

      {/* Policy Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-2xl font-semibold text-foreground">{summary.totalPolicies}</p>
          <p className="text-xs text-muted-foreground">Total Policies</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Self: <span className="font-medium text-foreground">{summary.selfPolicies}</span></p>
          <p className="text-sm text-muted-foreground">Family: <span className="font-medium text-foreground">{summary.familyPolicies}</span></p>
        </div>
      </div>

      {/* Claim Stats */}
      {(summary.claimsFiled > 0 || summary.claimsSettled > 0) && (
        <div className="pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Claims Filed</p>
              <p className="text-lg font-semibold">{summary.claimsFiled}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Claims Settled</p>
              <p className="text-lg font-semibold text-green-600">{summary.claimsSettled}</p>
            </div>
          </div>
          
          {summary.totalClaimedAmount > 0 && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Claimed</p>
                <p className="font-medium">{formatCurrency(summary.totalClaimedAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Settled</p>
                <p className="font-medium text-green-600">{formatCurrency(summary.totalSettledAmount)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InsuranceWidget;
