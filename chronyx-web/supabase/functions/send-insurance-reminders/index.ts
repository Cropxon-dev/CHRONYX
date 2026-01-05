import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log("Fetching upcoming insurance renewals for reminders...");

    const today = new Date();
    const emailsSent: string[] = [];

    // Get all active insurances with their reminder settings
    const { data: insurances, error: insuranceError } = await supabase
      .from("insurances")
      .select("id, policy_name, provider, renewal_date, premium_amount, user_id, reminder_days")
      .eq("status", "active");

    if (insuranceError) {
      throw insuranceError;
    }

    if (!insurances || insurances.length === 0) {
      console.log("No active insurances found");
      return new Response(
        JSON.stringify({ success: true, reminders_sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${insurances.length} active insurances`);

    for (const insurance of insurances) {
      const renewalDate = new Date(insurance.renewal_date);
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Default reminder days if not set
      const reminderDays = insurance.reminder_days || [30, 7, 1];

      // Check if today matches any reminder day
      if (!reminderDays.includes(daysUntilRenewal)) {
        continue;
      }

      console.log(`Insurance ${insurance.id} renewal in ${daysUntilRenewal} days`);

      // Check if reminder already sent for this day
      const { data: existingReminder } = await supabase
        .from("insurance_reminders")
        .select("id")
        .eq("insurance_id", insurance.id)
        .eq("reminder_days_before", daysUntilRenewal)
        .single();

      if (existingReminder) {
        console.log(`Reminder already sent for insurance ${insurance.id} at ${daysUntilRenewal} days`);
        continue;
      }

      // Get user email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", insurance.user_id)
        .single();

      if (!profile?.email) {
        console.log(`No email found for user ${insurance.user_id}`);
        continue;
      }

      // Format amounts
      const formattedPremium = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(insurance.premium_amount);

      const formattedDate = renewalDate.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      try {
        const { error: emailError } = await resend.emails.send({
          from: "CHRONYX <notifications@resend.dev>",
          to: [profile.email],
          subject: `Insurance Renewal: ${insurance.policy_name} due in ${daysUntilRenewal} day${daysUntilRenewal > 1 ? "s" : ""}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #faf9f7;">
              <div style="background: #1a1a1a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px; letter-spacing: 4px; font-weight: 300;">CHRONYX</h1>
                <p style="color: #94a3b8; font-size: 10px; letter-spacing: 2px; margin-top: 4px;">BY CROPXON</p>
              </div>
              <div style="background: white; padding: 32px; border: 1px solid #e8e6e3; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1a1a1a; margin-bottom: 20px; font-weight: 500;">Insurance Renewal Reminder</h2>
                <p style="color: #64748b; font-size: 16px; line-height: 1.5;">
                  Your insurance policy is up for renewal in <strong>${daysUntilRenewal} day${daysUntilRenewal > 1 ? "s" : ""}</strong>.
                </p>
                <div style="background: #faf9f7; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e8e6e3;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">Policy Name</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #1a1a1a;">${insurance.policy_name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">Provider</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #1a1a1a;">${insurance.provider}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">Renewal Date</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #1a1a1a;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">Premium Amount</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #dc2626;">${formattedPremium}</td>
                    </tr>
                  </table>
                </div>
                <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                  <strong>Important:</strong> Renew your policy before the due date to avoid coverage gaps.
                </p>
                <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
                  This is an automated reminder from CHRONYX.
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
        await supabase.from("insurance_reminders").insert({
          insurance_id: insurance.id,
          reminder_days_before: daysUntilRenewal,
          email_sent_to: profile.email,
        });

        emailsSent.push(`${insurance.policy_name} - ${daysUntilRenewal} days`);
        console.log(`Reminder sent for insurance ${insurance.id} to ${profile.email}`);
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
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
    console.error("Error in send-insurance-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
