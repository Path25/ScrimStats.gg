import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";

console.log("Test Riot API Edge Function initializing (v3 - key and platformId from request)");

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const userProvidedApiKey = body.apiKey;
    const platformId = body.platformId;

    if (!userProvidedApiKey) {
      console.error("API key not provided in the request body");
      return new Response(
        JSON.stringify({ error: "Riot API Key must be provided." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!platformId) {
      console.error("Platform ID not provided in the request body");
      return new Response(
        JSON.stringify({ error: "Riot API Platform ID must be provided." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const riotApiUrl = `https://${platformId}.api.riotgames.com/lol/status/v4/platform-data`;

    console.log(`Attempting to fetch Riot API status from: ${riotApiUrl} using user-provided key.`);
    const response = await fetch(riotApiUrl, {
      headers: {
        "X-Riot-Token": userProvidedApiKey,
      },
    });

    console.log(`Riot API response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Riot API error: ${response.status} - ${errorData}`);
      let parsedError = errorData;
      try {
        parsedError = JSON.parse(errorData);
      } catch (e) { /* not a JSON error, use raw text */ }
      
      return new Response(
        JSON.stringify({ error: `Riot API request failed: ${response.status}`, details: parsedError }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        }
      );
    }

    const data = await response.json();
    console.log("Riot API connection successful, data received for region:", data.id);

    return new Response(
      JSON.stringify({ success: true, message: `Successfully connected to Riot API for region: ${data.id}.`, data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in Test Riot API Edge Function:", error);
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        return new Response(
        JSON.stringify({ error: "Invalid request body. Ensure you are sending JSON with 'apiKey' and 'platformId' fields." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
