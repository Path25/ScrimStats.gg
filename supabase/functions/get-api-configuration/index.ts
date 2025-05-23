import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

console.log("get-api-configuration function initializing");

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // For GET requests, attempt to read api_type from query parameters
    // For POST requests, attempt to read from JSON body
    let api_type: string | null = null;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      api_type = url.searchParams.get('api_type');
    } else if (req.method === 'POST') {
       try {
        const body = await req.json();
        api_type = body.api_type;
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload for POST request.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
         return new Response(JSON.stringify({ error: 'Method not allowed. Only GET and POST are accepted.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!api_type) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: api_type (in query for GET, in body for POST)." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // RLS policy should allow admin/coach to select.
    // If no RLS SELECT policy exists for 'api_configurations' or if the user doesn't have the role, this will error.
    // It's crucial to add a SELECT RLS policy for admin/coach as discussed.
    // For now, assuming such a policy exists or the function has necessary privileges.
    // If you find users can't fetch, ensure 'api_configurations' has a SELECT policy for admin/coach.
    const { data, error } = await supabaseClient
      .from('api_configurations')
      .select('api_type, config_data')
      .eq('api_type', api_type)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // "Could not find a row"
        return new Response(
          JSON.stringify({ message: `No configuration found for ${api_type}.`, isApiKeySet: false, platformId: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 } // Or 404 if preferred
        );
      }
      console.error("Error fetching API configuration:", error);
       if (error.message.includes("permission denied") || error.message.includes("policy")) {
        return new Response(
          JSON.stringify({ error: "Permission denied. You might not have the required role (admin/coach) to view this configuration." , details: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to fetch API configuration.", details: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let responsePayload: Record<string, unknown> = { api_type: data.api_type };

    if (api_type === 'RIOT' && data.config_data) {
      responsePayload.platformId = (data.config_data as any).platformId || null;
      responsePayload.isApiKeySet = !!((data.config_data as any).apiKey);
    } else if (api_type === 'GRID' && data.config_data) {
      responsePayload.isApiKeySet = !!((data.config_data as any).apiKey);
    } else {
       responsePayload.isApiKeySet = false;
    }
    
    console.log(`API configuration for ${api_type} fetched successfully.`);
    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (e) {
    console.error("Error in get-api-configuration function:", e);
     if (e instanceof SyntaxError && e.message.includes("JSON")) { // This check might be redundant if POST body parsing is handled above
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
