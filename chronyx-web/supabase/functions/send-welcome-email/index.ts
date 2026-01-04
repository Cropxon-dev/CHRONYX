import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const displayName = name || email.split("@")[0];

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CHRONYX <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to CHRONYX - A Quiet Space for Your Life",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to CHRONYX</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #faf9f7;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e8e6e3;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: #1a1a1a; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 0.25em; color: #ffffff;">CHRONYX</h1>
                      <p style="margin: 8px 0 0; font-size: 10px; color: #94a3b8; letter-spacing: 0.15em;">A QUIET SPACE FOR YOUR LIFE</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 500; color: #1a1a1a;">Welcome, ${displayName}</h2>
                      
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #64748b;">
                        Thank you for joining CHRONYX. We're here to help you hold, record, and reflect on the moments that matter.
                      </p>
                      
                      <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #64748b;">
                        CHRONYX is your personal system of record — a quiet, private space where you can track your finances, studies, memories, and the continuity of your life.
                      </p>
                      
                      <!-- Features List -->
                      <div style="background-color: #faf9f7; border-radius: 8px; padding: 24px; margin: 0 0 30px; border: 1px solid #e8e6e3;">
                        <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">What you can hold in CHRONYX:</h3>
                        <ul style="margin: 0; padding: 0 0 0 20px; color: #1a1a1a; line-height: 1.8;">
                          <li>Track expenses, income, and savings</li>
                          <li>Manage loans and EMI schedules</li>
                          <li>Organize insurance policies</li>
                          <li>Plan and track your study progress</li>
                          <li>Store and organize memories</li>
                          <li>Manage daily todos and tasks</li>
                          <li>Visualize your lifespan journey</li>
                        </ul>
                      </div>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td align="center">
                            <a href="${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '') || 'https://chronyx.app'}/app" 
                               style="display: inline-block; padding: 14px 32px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em;">
                              ENTER CHRONYX
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #faf9f7; border-top: 1px solid #e8e6e3; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; text-align: center;">
                        CHRONYX by CropXon Innovations Pvt Ltd
                      </p>
                      <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center;">
                        This is an automated welcome email. Please do not reply directly to this message.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      }),
    });

    const result = await emailResponse.json();
    console.log("Welcome email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
