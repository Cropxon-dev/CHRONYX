import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EMIReminder {
  emi_id: string;
  emi_date: string;
  emi_amount: number;
  loan_id: string;
  bank_name: string;
  loan_type: string;
  user_email: string;
  user_id: string;
  days_until: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        db: {
          schema: 'api' //-> for API Schema
        }
      }
    );

    console.log("Fetching upcoming EMIs for reminders...");

    // Get EMIs due in 7, 3, or 1 days that haven't been reminded yet
    const today = new Date();
    const reminderDays = [7, 3, 1];
    const emailsSent: string[] = [];

    for (const days of reminderDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      console.log(`Checking EMIs due on ${targetDateStr} (${days} days away)...`);

      // Get pending EMIs for this date
      const { data: emis, error: emiError } = await supabase
        .from("emi_schedule")
        .select(`
          id,
          emi_date,
          emi_amount,
          loan_id,
          loans!inner (
            id,
            bank_name,
            loan_type,
            user_id
          )
        `)
        .eq("payment_status", "Pending")
        .eq("emi_date", targetDateStr);

      if (emiError) {
        console.error("Error fetching EMIs:", emiError);
        continue;
      }

      if (!emis || emis.length === 0) {
        console.log(`No EMIs due on ${targetDateStr}`);
        continue;
      }

      console.log(`Found ${emis.length} EMIs due on ${targetDateStr}`);

      for (const emi of emis) {
        const loan = emi.loans as any;
        const reminderType = `upcoming_${days}`;

        // Check if reminder already sent
        const { data: existingReminder } = await supabase
          .from("emi_reminders")
          .select("id")
          .eq("emi_id", emi.id)
          .eq("reminder_type", reminderType)
          .single();

        if (existingReminder) {
          console.log(`Reminder already sent for EMI ${emi.id}`);
          continue;
        }

        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", loan.user_id)
          .single();

        if (!profile?.email) {
          console.log(`No email found for user ${loan.user_id}`);
          continue;
        }

        // Send email
        const formattedAmount = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(emi.emi_amount);

        const formattedDate = new Date(emi.emi_date).toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        try {
          const { error: emailError } = await resend.emails.send({
            from: "CHRONYX <notifications@resend.dev>",
            to: [profile.email],
            subject: `EMI Reminder: ${loan.bank_name} payment due in ${days} day${days > 1 ? "s" : ""}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #faf9f7;">
                <div style="background: #1a1a1a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 20px; letter-spacing: 4px; font-weight: 300;">CHRONYX</h1>
                  <p style="color: #94a3b8; font-size: 10px; letter-spacing: 2px; margin-top: 4px;">BY CROPXON</p>
                </div>
                <div style="background: white; padding: 32px; border: 1px solid #e8e6e3; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #1a1a1a; margin-bottom: 20px; font-weight: 500;">EMI Payment Reminder</h2>
                  <p style="color: #64748b; font-size: 16px; line-height: 1.5;">
                    Your EMI payment is due in <strong>${days} day${days > 1 ? "s" : ""}</strong>.
                  </p>
                  <div style="background: #faf9f7; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e8e6e3;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b;">Bank</td>
                        <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #1a1a1a;">${loan.bank_name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b;">Loan Type</td>
                        <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #1a1a1a;">${loan.loan_type}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b;">Due Date</td>
                        <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #1a1a1a;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b;">Amount</td>
                        <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #dc2626;">${formattedAmount}</td>
                      </tr>
                    </table>
                  </div>
                  <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
                    This is an automated reminder from CHRONYX. Please ensure sufficient balance in your account.
                  </p>
                </div>
              </div>
            `,
          });

          if (emailError) {
            console.error("Error sending email:", emailError);
            continue;
          }

          // Record the reminder
          await supabase.from("emi_reminders").insert({
            emi_id: emi.id,
            reminder_type: reminderType,
            email_sent_to: profile.email,
          });

          emailsSent.push(`${loan.bank_name} - ${formattedAmount} (${days} days)`);
          console.log(`Reminder sent for EMI ${emi.id} to ${profile.email}`);
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: emailsSent.length,
        details: emailsSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-emi-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
