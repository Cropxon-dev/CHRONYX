import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PartPaymentRequest {
  loan_id: string;
  amount: number;
  payment_date: string;
  reduction_type: "tenure" | "emi";
  payment_method?: string;
}

// Calculate EMI using standard formula
function calculateEMI(principal: number, monthlyRate: number, tenure: number): number {
  if (monthlyRate === 0) return principal / tenure;
  const factor = Math.pow(1 + monthlyRate, tenure);
  return (principal * monthlyRate * factor) / (factor - 1);
}

// Solve for tenure given EMI, principal, and rate
function calculateTenure(principal: number, monthlyRate: number, emi: number): number {
  if (monthlyRate === 0) return Math.ceil(principal / emi);
  // n = ln(EMI / (EMI - P*r)) / ln(1 + r)
  const numerator = Math.log(emi / (emi - principal * monthlyRate));
  const denominator = Math.log(1 + monthlyRate);
  return Math.ceil(numerator / denominator);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
     {
        db: {
          schema: 'api' //-> for API Schema
        }
      }
    );

    const body: PartPaymentRequest = await req.json();
    const { loan_id, amount, payment_date, reduction_type, payment_method } = body;

    console.log(`Applying part-payment of ${amount} to loan ${loan_id}`);

    // Fetch loan details
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loan_id)
      .single();

    if (loanError || !loan) {
      throw new Error("Loan not found");
    }

    // Get current outstanding principal from next unpaid EMI
    const { data: pendingEmis, error: emiError } = await supabase
      .from("emi_schedule")
      .select("*")
      .eq("loan_id", loan_id)
      .eq("payment_status", "Pending")
      .order("emi_month", { ascending: true });

    if (emiError || !pendingEmis || pendingEmis.length === 0) {
      throw new Error("No pending EMIs found");
    }

    const currentOutstanding = pendingEmis[0].remaining_principal + pendingEmis[0].principal_component;
    
    if (amount > currentOutstanding) {
      throw new Error("Part-payment amount exceeds outstanding principal");
    }

    // Calculate interest saved from original remaining schedule
    const originalInterest = pendingEmis.reduce((sum, e) => sum + Number(e.interest_component), 0);

    const newPrincipal = round2(currentOutstanding - amount);
    const monthlyRate = Number(loan.interest_rate) / 12 / 100;
    const currentEmi = Number(loan.emi_amount);
    const remainingMonths = pendingEmis.length;

    let newTenure: number;
    let newEmi: number;

    if (reduction_type === "tenure") {
      // Keep EMI same, reduce tenure
      newEmi = currentEmi;
      newTenure = calculateTenure(newPrincipal, monthlyRate, currentEmi);
    } else {
      // Keep tenure same, reduce EMI
      newTenure = remainingMonths;
      newEmi = round2(calculateEMI(newPrincipal, monthlyRate, newTenure));
    }

    console.log(`New principal: ${newPrincipal}, New tenure: ${newTenure}, New EMI: ${newEmi}`);

    // Generate new schedule from next month
    const nextEmiDate = pendingEmis[0].emi_date;
    const newSchedule = [];
    let outstanding = newPrincipal;

    for (let month = 1; month <= newTenure; month++) {
      const interestComponent = round2(outstanding * monthlyRate);
      const principalComponent = round2(newEmi - interestComponent);
      outstanding = round2(outstanding - principalComponent);

      newSchedule.push({
        loan_id,
        emi_month: pendingEmis[0].emi_month + month - 1,
        emi_date: addMonths(nextEmiDate, month - 1),
        emi_amount: newEmi,
        principal_component: principalComponent,
        interest_component: interestComponent,
        remaining_principal: Math.max(outstanding, 0),
        payment_status: "Pending",
        is_adjusted: true,
      });
    }

    const newInterest = newSchedule.reduce((sum, e) => sum + e.interest_component, 0);
    const interestSaved = round2(originalInterest - newInterest);

    // Create part-payment event
    const { data: event } = await supabase
      .from("emi_events")
      .insert({
        loan_id,
        event_type: "part_payment",
        event_date: payment_date,
        amount,
        mode: payment_method,
        reduction_type,
        interest_saved: interestSaved,
        new_tenure_months: newTenure,
        new_emi_amount: newEmi,
      })
      .select()
      .single();

    // Mark old pending EMIs as adjusted
    await supabase
      .from("emi_schedule")
      .update({ is_adjusted: true, adjustment_event_id: event?.id })
      .eq("loan_id", loan_id)
      .eq("payment_status", "Pending");

    // Delete old pending EMIs and insert new schedule
    await supabase.from("emi_schedule").delete().eq("loan_id", loan_id).eq("payment_status", "Pending");
    await supabase.from("emi_schedule").insert(newSchedule);

    // Update loan with new EMI if changed
    if (reduction_type === "emi") {
      await supabase.from("loans").update({ emi_amount: newEmi }).eq("id", loan_id);
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: loan.user_id,
      module: "loans",
      action: `Part-payment of ₹${amount.toLocaleString()} applied. ${reduction_type === "tenure" ? `Tenure reduced by ${remainingMonths - newTenure} months` : `EMI reduced to ₹${newEmi.toLocaleString()}`}. Interest saved: ₹${interestSaved.toLocaleString()}`,
    });

    return new Response(
      JSON.stringify({
        status: "part_payment_applied",
        new_remaining_principal: newPrincipal,
        new_tenure_months: newTenure,
        new_emi_amount: newEmi,
        interest_saved: interestSaved,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
