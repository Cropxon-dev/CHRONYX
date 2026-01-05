import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentReceiptRequest {
  email: string;
  display_name?: string;
  plan_type: string;
  amount: number;
  currency: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  payment_history_id: string;
}

const formatAmount = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
  }).format(amount);
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Payment receipt function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, display_name, plan_type, amount, currency, razorpay_payment_id, razorpay_order_id, payment_history_id }: PaymentReceiptRequest = await req.json();

    const planNames: Record<string, string> = { pro: "Pro Plan", premium: "Premium Lifetime Plan" };
    const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; color: white;">
          <h1>Chronyx</h1>
        </div>
        <div style="padding: 24px;">
          <h2>Thank you${display_name ? `, ${display_name}` : ''}!</h2>
          <p>Your payment of <strong>${formatAmount(amount, currency)}</strong> for <strong>${planNames[plan_type] || plan_type}</strong> was successful.</p>
          <p><strong>Date:</strong> ${currentDate}</p>
          <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
          <p><strong>Order ID:</strong> ${razorpay_order_id}</p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Chronyx <onboarding@resend.dev>",
        to: [email],
        subject: `Payment Confirmation - ${planNames[plan_type] || plan_type}`,
        html: emailHtml,
      }),
    });

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        {
        db: {
          schema: 'api' //-> for API Schema
        }
      }
    
      );
    await supabase.from('payment_history').update({ receipt_sent: true, receipt_sent_at: new Date().toISOString() }).eq('id', payment_history_id);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
