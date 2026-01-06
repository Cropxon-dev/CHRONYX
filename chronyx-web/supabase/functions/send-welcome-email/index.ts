import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  db: { schema: "api" }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "email_required" }), {
        status: 400, headers: corsHeaders
      });
    }

    // 1) lookup profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "profile_not_found" }), {
        status: 404, headers: corsHeaders
      });
    }

    // 2) Already sent? stop here
    if (profile.welcome_sent) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200, headers: corsHeaders
      });
    }

    // 3) Send via resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CHRONYX <welcome@getchronyx.com>",
        to: [email],
        subject: "Welcome to CHRONYX — your quiet personal space",
        html: `<p>Welcome 🙂</p>`
      }),
    });

    await response.json();

    // 4) Mark welcome_sent true
    await supabase
      .from("profiles")
      .update({ welcome_sent: true })
      .eq("id", profile.id);

    return new Response(JSON.stringify({ sent: true }), {
      status: 200, headers: corsHeaders
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: `${e}` }), {
      status: 500, headers: corsHeaders
    });
  }
});
