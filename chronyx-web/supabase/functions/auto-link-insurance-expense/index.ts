import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutoLinkRequest {
  insurance_id: string;
  payment_date: string;
  payment_method?: string;
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

    const body: AutoLinkRequest = await req.json();
    const { insurance_id, payment_date, payment_method = "Bank Transfer" } = body;

    console.log(`Creating expense entry for insurance ${insurance_id}`);

    // Fetch insurance details
    const { data: insurance, error: fetchError } = await supabase
      .from("insurances")
      .select("*")
      .eq("id", insurance_id)
      .single();

    if (fetchError || !insurance) {
      throw new Error("Insurance not found");
    }

    // Check if expense already exists for this insurance and date
    const { data: existingExpense } = await supabase
      .from("expenses")
      .select("id")
      .eq("source_type", "insurance")
      .eq("source_id", insurance_id)
      .eq("expense_date", payment_date)
      .maybeSingle();

    if (existingExpense) {
      console.log(`Expense already exists for insurance ${insurance_id} on ${payment_date}`);
      return new Response(
        JSON.stringify({ 
          status: "exists", 
          message: "Expense entry already exists",
          expense_id: existingExpense.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create expense entry
    const expenseNote = `Premium - ${insurance.policy_name} (${insurance.provider})`;
    
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        user_id: insurance.user_id,
        expense_date: payment_date,
        amount: insurance.premium_amount,
        category: "Insurance Premium",
        sub_category: insurance.policy_type,
        payment_mode: payment_method,
        notes: expenseNote,
        is_auto_generated: true,
        source_type: "insurance",
        source_id: insurance_id,
      })
      .select()
      .single();

    if (expenseError) {
      throw expenseError;
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: insurance.user_id,
      module: "insurance",
      action: `Insurance premium recorded: ${insurance.policy_name} - ₹${insurance.premium_amount.toLocaleString()}`,
    });

    console.log(`Created expense entry for insurance ${insurance_id}`);

    return new Response(
      JSON.stringify({
        status: "created",
        expense_id: expense.id,
        amount: insurance.premium_amount,
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
