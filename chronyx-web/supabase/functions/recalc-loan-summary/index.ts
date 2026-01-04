import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecalcRequest {
  loan_id: string;
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: RecalcRequest = await req.json();
    const { loan_id } = body;

    console.log(`Recalculating summary for loan ${loan_id}`);

    // Fetch loan
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loan_id)
      .single();

    if (loanError || !loan) {
      throw new Error("Loan not found");
    }

    // Fetch all EMIs
    const { data: emis, error: emiError } = await supabase
      .from("emi_schedule")
      .select("*")
      .eq("loan_id", loan_id)
      .order("emi_month", { ascending: true });

    if (emiError) {
      throw emiError;
    }

    const allEmis = emis || [];
    const paidEmis = allEmis.filter((e) => e.payment_status === "Paid");
    const pendingEmis = allEmis.filter((e) => e.payment_status === "Pending");
    const cancelledEmis = allEmis.filter((e) => e.payment_status === "Cancelled");

    // Calculate metrics
    const totalPaid = paidEmis.reduce((sum, e) => sum + Number(e.emi_amount), 0);
    const totalPrincipalPaid = paidEmis.reduce((sum, e) => sum + Number(e.principal_component), 0);
    const totalInterestPaid = paidEmis.reduce((sum, e) => sum + Number(e.interest_component), 0);

    const remainingPrincipal = pendingEmis.length > 0 
      ? Number(pendingEmis[0].remaining_principal) + Number(pendingEmis[0].principal_component)
      : 0;

    const totalRemainingEmi = pendingEmis.reduce((sum, e) => sum + Number(e.emi_amount), 0);
    const remainingInterest = pendingEmis.reduce((sum, e) => sum + Number(e.interest_component), 0);

    const progressPercent = allEmis.length > 0 
      ? round2((paidEmis.length / (paidEmis.length + pendingEmis.length)) * 100)
      : 0;

    // Find next EMI due
    const nextEmi = pendingEmis[0] || null;

    // Fetch events for this loan
    const { data: events } = await supabase
      .from("emi_events")
      .select("*")
      .eq("loan_id", loan_id)
      .order("created_at", { ascending: false });

    const totalInterestSaved = (events || []).reduce((sum, e) => sum + (Number(e.interest_saved) || 0), 0);

    return new Response(
      JSON.stringify({
        loan_id,
        status: loan.status,
        original_principal: Number(loan.principal_amount),
        current_emi: Number(loan.emi_amount),
        remaining_principal: remainingPrincipal,
        total_paid: round2(totalPaid),
        total_principal_paid: round2(totalPrincipalPaid),
        total_interest_paid: round2(totalInterestPaid),
        total_remaining: round2(totalRemainingEmi),
        remaining_interest: round2(remainingInterest),
        paid_count: paidEmis.length,
        pending_count: pendingEmis.length,
        cancelled_count: cancelledEmis.length,
        progress_percent: progressPercent,
        next_emi_date: nextEmi?.emi_date || null,
        next_emi_amount: nextEmi?.emi_amount || null,
        total_interest_saved: round2(totalInterestSaved),
        events: events || [],
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
