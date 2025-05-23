import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

console.log("set-api-configuration function initializing");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { api_type, apiKey, platformId } = await req.json();

    if (!api_type || (api_type === 'RIOT' && (!apiKey || !platformId))) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: api_type, and apiKey/platformId for RIOT." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let configData;
    if (api_type === 'RIOT') {
      configData = { apiKey, platformId };
    } else if (api_type === 'GRID') {
      // For GRID, apiKey would be the primary data.
      // This can be expanded later.
      configData = { apiKey };
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid api_type." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Upsert the configuration. RLS policies will ensure only admin/coach can do this.
    const { data, error } = await supabaseClient
      .from('api_configurations')
      .upsert({ api_type, config_data: configData }, { onConflict: 'api_type' })
      .select()
      .single();

    if (error) {
      console.error("Error saving API configuration:", error);
      // Check if the error is due to RLS policy violation
      if (error.message.includes("permission denied") || error.message.includes("policy")) {
        return new Response(
          JSON.stringify({ error: "Permission denied. You might not have the required role (admin/coach) to perform this action." , details: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to save API configuration.", details: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`API configuration for ${api_type} saved/updated successfully.`);
    return new Response(
      JSON.stringify({ success: true, message: `API configuration for ${api_type} saved successfully.`, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (e) {
    console.error("Error in set-api-configuration function:", e);
    if (e instanceof SyntaxError && e.message.includes("JSON")) {
        return new Response(
        JSON.stringify({ error: "Invalid request body. Ensure you are sending valid JSON." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    return new Response(
      JSON.stringify({ error: e.message || "An unexpected error occurred." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
