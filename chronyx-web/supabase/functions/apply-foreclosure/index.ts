import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ForeclosureRequest {
  loan_id: string;
  foreclosure_date: string;
  payment_method?: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      
    );

    const body: ForeclosureRequest = await req.json();
    const { loan_id, foreclosure_date, payment_method } = body;

    console.log(`Processing foreclosure for loan ${loan_id}`);

    // Fetch loan details
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loan_id)
      .single();

    if (loanError || !loan) {
      throw new Error("Loan not found");
    }

    // Get pending EMIs
    const { data: pendingEmis, error: emiError } = await supabase
      .from("emi_schedule")
      .select("*")
      .eq("loan_id", loan_id)
      .eq("payment_status", "Pending")
      .order("emi_month", { ascending: true });

    if (emiError || !pendingEmis || pendingEmis.length === 0) {
      throw new Error("No pending EMIs found - loan may already be closed");
    }

    // Calculate outstanding principal
    const outstandingPrincipal = pendingEmis[0].remaining_principal + pendingEmis[0].principal_component;

    // Calculate accrued interest till foreclosure date
    const monthlyRate = Number(loan.interest_rate) / 12 / 100;
    const lastPaidDate = new Date(pendingEmis[0].emi_date);
    const foreDate = new Date(foreclosure_date);
    const daysDiff = Math.max(0, (foreDate.getTime() - lastPaidDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = monthlyRate / 30;
    const accruedInterest = round2(outstandingPrincipal * dailyRate * daysDiff);

    // Total foreclosure amount
    const foreclosureAmount = round2(outstandingPrincipal + accruedInterest);

    // Calculate interest saved (all future interest that won't be paid)
    const futureInterest = pendingEmis.reduce((sum, e) => sum + Number(e.interest_component), 0);
    const interestSaved = round2(futureInterest - accruedInterest);

    console.log(`Foreclosure amount: ${foreclosureAmount}, Interest saved: ${interestSaved}`);

    // Create foreclosure event
    await supabase.from("emi_events").insert({
      loan_id,
      event_type: "foreclosure",
      event_date: foreclosure_date,
      amount: foreclosureAmount,
      mode: payment_method,
      interest_saved: interestSaved,
      notes: `Loan foreclosed. Principal: ₹${outstandingPrincipal.toLocaleString()}, Accrued Interest: ₹${accruedInterest.toLocaleString()}`,
    });

    // Mark all pending EMIs as cancelled
    await supabase
      .from("emi_schedule")
      .update({ payment_status: "Cancelled" })
      .eq("loan_id", loan_id)
      .eq("payment_status", "Pending");

    // Update loan status to closed
    await supabase.from("loans").update({ status: "closed" }).eq("id", loan_id);

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: loan.user_id,
      module: "loans",
      action: `Loan foreclosed. Amount paid: ₹${foreclosureAmount.toLocaleString()}. Interest saved: ₹${interestSaved.toLocaleString()}`,
    });

    return new Response(
      JSON.stringify({
        status: "loan_foreclosed",
        amount_paid: foreclosureAmount,
        principal_component: outstandingPrincipal,
        interest_component: accruedInterest,
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
