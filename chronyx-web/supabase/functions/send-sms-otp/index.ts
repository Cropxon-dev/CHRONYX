import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for OTP verification
async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      console.log("Missing phone number");
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await hashOtp(otp);

    console.log(`Sending OTP to phone: ${phone}`);

    // Format phone number - ensure it has country code
    let formattedPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    if (!formattedPhone.startsWith('+')) {
      // Default to India country code if no country code provided
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+91' + formattedPhone.slice(1);
      } else {
        formattedPhone = '+91' + formattedPhone;
      }
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhone,
        Body: `Your CHRONYX verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`,
      }),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text();
      console.error("Twilio API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send SMS. Please check your phone number." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await twilioResponse.json();
    console.log("SMS sent successfully:", result.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully",
        otpHash, // Return hash for verification
        expiresIn: 600 // 10 minutes
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending SMS OTP:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send OTP" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
