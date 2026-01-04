import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  email: string;
  userId: string;
  type: "email" | "phone";
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userId, type }: SendOtpRequest = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: "Email and userId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    console.log(`Generated OTP for ${email}: ${otp}`);

    // Create OTP hash for verification
    const otpHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(otp + userId)
    );
    const hashArray = Array.from(new Uint8Array(otpHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Send email with OTP using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CHRONYX <onboarding@resend.dev>",
        to: [email],
        subject: `Your CHRONYX Verification Code: ${otp}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf9f7; margin: 0; padding: 40px 20px; }
                .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden; border: 1px solid #e8e6e3; }
                .header { background: #1a1a1a; padding: 32px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 24px; letter-spacing: 6px; font-weight: 300; }
                .header p { color: #94a3b8; font-size: 10px; letter-spacing: 2px; margin-top: 8px; }
                .content { padding: 40px 32px; text-align: center; }
                .otp-box { background: #faf9f7; border: 1px solid #e8e6e3; border-radius: 8px; padding: 24px; margin: 24px 0; }
                .otp-code { font-size: 36px; font-weight: 600; letter-spacing: 8px; color: #1a1a1a; font-family: monospace; }
                .message { color: #64748b; font-size: 14px; line-height: 1.6; }
                .footer { background: #faf9f7; padding: 20px; text-align: center; border-top: 1px solid #e8e6e3; }
                .footer p { color: #94a3b8; font-size: 11px; margin: 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>CHRONYX</h1>
                  <p>BY CROPXON</p>
                </div>
                <div class="content">
                  <p class="message">Your verification code is:</p>
                  <div class="otp-box">
                    <span class="otp-code">${otp}</span>
                  </div>
                  <p class="message">
                    Enter this code to verify your ${type === "email" ? "email address" : "phone number"}.
                    <br><br>
                    This code expires in <strong>10 minutes</strong>.
                    <br><br>
                    If you didn't request this code, please ignore this email.
                  </p>
                </div>
                <div class="footer">
                  <p>CHRONYX by CropXon Innovations Pvt Ltd</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send email");
    }

    console.log("Email sent successfully");

    // Return success with the OTP hash for client-side verification
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully",
        otpHash: hashHex,
        expiresAt: expiresAt.toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
