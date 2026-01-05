import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarkEmiPaidRequest {
  emi_id: string;
  paid_date: string;
  payment_method: string;
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

    const body: MarkEmiPaidRequest = await req.json();
    const { emi_id, paid_date, payment_method } = body;

    console.log(`Marking EMI ${emi_id} as paid`);

    // Fetch EMI to validate
    const { data: emi, error: fetchError } = await supabase
      .from("emi_schedule")
      .select("*, loans(user_id, bank_name, loan_type)")
      .eq("id", emi_id)
      .single();

    if (fetchError || !emi) {
      throw new Error("EMI not found");
    }

    if (emi.payment_status === "Paid") {
      throw new Error("EMI is already marked as paid");
    }

    // Update EMI status
    const { error: updateError } = await supabase
      .from("emi_schedule")
      .update({
        payment_status: "Paid",
        paid_date,
        payment_method,
      })
      .eq("id", emi_id);

    if (updateError) {
      throw updateError;
    }

    // Auto-create expense entry for EMI payment
    const userId = emi.loans?.user_id;
    if (userId) {
      const expenseNote = `EMI #${emi.emi_month} - ${emi.loans?.bank_name || "Loan"} (${emi.loans?.loan_type || "EMI"})`;
      
      const { error: expenseError } = await supabase
        .from("expenses")
        .insert({
          user_id: userId,
          expense_date: paid_date,
          amount: emi.emi_amount,
          category: "Loan EMI",
          sub_category: emi.loans?.loan_type || "EMI",
          payment_mode: payment_method || "Bank Transfer",
          notes: expenseNote,
          is_auto_generated: true,
          source_type: "emi",
          source_id: emi_id,
        });

      if (expenseError) {
        console.error("Error creating expense entry:", expenseError);
      } else {
        console.log(`Auto-created expense entry for EMI ${emi_id}`);
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: userId,
        module: "loans",
        action: `EMI #${emi.emi_month} marked as paid. Amount: ₹${emi.emi_amount.toLocaleString()}, Method: ${payment_method}`,
      });
    }

    console.log(`EMI ${emi_id} marked as paid successfully`);

    return new Response(
      JSON.stringify({
        status: "paid",
        emi_month: emi.emi_month,
        amount: emi.emi_amount,
        expense_created: true,
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
