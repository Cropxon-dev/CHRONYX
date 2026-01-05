import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateEmiRequest {
  loan_id: string;
  principal: number;
  annual_interest_rate: number;
  tenure_months: number;
  emi_start_date: string;
  emi_amount_override?: number;
}

interface EmiScheduleRow {
  loan_id: string;
  emi_month: number;
  emi_date: string;
  emi_amount: number;
  principal_component: number;
  interest_component: number;
  remaining_principal: number;
  payment_status: string;
}

// Calculate EMI using standard formula: P × r × (1 + r)^n / ((1 + r)^n − 1)
function calculateEMI(principal: number, monthlyRate: number, tenure: number): number {
  if (monthlyRate === 0) return principal / tenure;
  const factor = Math.pow(1 + monthlyRate, tenure);
  return (principal * monthlyRate * factor) / (factor - 1);
}

// Round to 2 decimal places for currency precision
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Add months to a date
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

    const body: GenerateEmiRequest = await req.json();
    const { loan_id, principal, annual_interest_rate, tenure_months, emi_start_date, emi_amount_override } = body;

    console.log(`Generating EMI schedule for loan ${loan_id}`);
    console.log(`Principal: ${principal}, Rate: ${annual_interest_rate}%, Tenure: ${tenure_months} months`);

    // Calculate monthly rate
    const monthlyRate = annual_interest_rate / 12 / 100;

    // Calculate EMI (use override if provided)
    const emi = emi_amount_override ?? calculateEMI(principal, monthlyRate, tenure_months);
    const roundedEmi = round2(emi);

    console.log(`Calculated EMI: ${roundedEmi}`);

    // Generate schedule
    let outstanding = principal;
    const schedule: EmiScheduleRow[] = [];

    for (let month = 1; month <= tenure_months; month++) {
      const interestComponent = round2(outstanding * monthlyRate);
      const principalComponent = round2(roundedEmi - interestComponent);
      outstanding = round2(outstanding - principalComponent);

      // Ensure outstanding doesn't go negative in last EMI
      const remainingPrincipal = Math.max(outstanding, 0);

      schedule.push({
        loan_id,
        emi_month: month,
        emi_date: addMonths(emi_start_date, month - 1),
        emi_amount: roundedEmi,
        principal_component: principalComponent,
        interest_component: interestComponent,
        remaining_principal: remainingPrincipal,
        payment_status: "Pending",
      });
    }

    // Delete existing schedule for this loan (if regenerating)
    await supabase.from("emi_schedule").delete().eq("loan_id", loan_id);

    // Insert new schedule
    const { error: insertError } = await supabase.from("emi_schedule").insert(schedule);

    if (insertError) {
      console.error("Error inserting schedule:", insertError);
      throw insertError;
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: (await supabase.from("loans").select("user_id").eq("id", loan_id).single()).data?.user_id,
      module: "loans",
      action: `EMI schedule generated for loan. EMI: ₹${roundedEmi.toLocaleString()}, Tenure: ${tenure_months} months`,
    });

    console.log(`Successfully generated ${schedule.length} EMI entries`);

    return new Response(
      JSON.stringify({
        status: "success",
        emi_amount: roundedEmi,
        schedule_created: true,
        total_entries: schedule.length,
        total_interest: round2(schedule.reduce((sum, e) => sum + e.interest_component, 0)),
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
