import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderRequest {
  amount: number;
  currency?: string;
  plan: "pro" | "premium";
  receipt?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency = "INR", plan, receipt } = (await req.json()) as OrderRequest;

    if (!amount || !plan) {
      return new Response(
        JSON.stringify({ error: "Amount and plan are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      console.error("Razorpay credentials not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order via Razorpay API
    const auth = btoa(`${keyId}:${keySecret}`);
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt: receipt || `order_${Date.now()}`,
        notes: {
          plan,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error("Razorpay order creation failed:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = await orderResponse.json();

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
