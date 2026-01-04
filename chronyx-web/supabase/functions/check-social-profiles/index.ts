import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SocialProfile {
  id: string;
  platform: string;
  profile_url: string | null;
  user_id: string;
}

// Platform URL patterns for validation
const platformPatterns: Record<string, RegExp> = {
  linkedin: /linkedin\.com/i,
  github: /github\.com/i,
  instagram: /instagram\.com/i,
  facebook: /facebook\.com/i,
  youtube: /youtube\.com|youtu\.be/i,
  twitter: /twitter\.com|x\.com/i,
  whatsapp: /wa\.me|whatsapp\.com/i,
  telegram: /t\.me|telegram\.me/i,
};

async function checkUrlStatus(url: string, platform: string): Promise<{ status: string; reachable: boolean }> {
  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    
    // Check if URL matches expected platform pattern
    const pattern = platformPatterns[platform];
    if (pattern && !pattern.test(parsedUrl.hostname)) {
      return { status: "broken", reachable: false };
    }

    // Try to fetch the URL with a HEAD request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "VYOM-Link-Checker/1.0",
        },
      });
      clearTimeout(timeoutId);

      if (response.ok || response.status === 302 || response.status === 301) {
        return { status: "active", reachable: true };
      } else if (response.status === 404) {
        return { status: "broken", reachable: false };
      } else {
        // Some sites block HEAD requests, treat as potentially active
        return { status: "active", reachable: true };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // Many social platforms block automated requests, assume active if URL format is valid
      return { status: "active", reachable: true };
    }
  } catch (error) {
    // Invalid URL format
    return { status: "broken", reachable: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional user_id filter
    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body.user_id || null;
    } catch {
      // No body, check all profiles
    }

    console.log(`Starting social profile check${userId ? ` for user: ${userId}` : " for all users"}`);

    // Fetch profiles to check
    let query = supabase
      .from("social_profiles")
      .select("id, platform, profile_url, user_id")
      .not("profile_url", "is", null);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: profiles, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching profiles:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${profiles?.length || 0} profiles to check`);

    const results: { id: string; status: string; checked_at: string }[] = [];

    // Check each profile
    for (const profile of (profiles || []) as SocialProfile[]) {
      if (!profile.profile_url) continue;

      const { status } = await checkUrlStatus(profile.profile_url, profile.platform);
      const checkedAt = new Date().toISOString();

      // Update profile status in database
      const { error: updateError } = await supabase
        .from("social_profiles")
        .update({
          status: status,
          last_sync_at: checkedAt,
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error(`Error updating profile ${profile.id}:`, updateError);
      } else {
        results.push({ id: profile.id, status, checked_at: checkedAt });
        console.log(`Profile ${profile.id}: ${status}`);
      }

      // Small delay between checks to be respectful
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Completed checking ${results.length} profiles`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: results.length,
        results,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in check-social-profiles:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
