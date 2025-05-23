import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts'; // Updated import path

interface GameStat {
  stat_type: string;
  stat_value: any; // JSONB can be any valid JSON
}

interface RequestPayload {
  scrim_game_id: string;
  stats: GameStat[];
  timestamp?: string; // Optional: client can specify, otherwise server uses now()
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables');
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // 1. Authenticate request using player API token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.split(' ')[1];

    const { data: tokenData, error: tokenError } = await supabase
      .from('player_api_tokens')
      .select('user_id, is_active, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token validation error:', tokenError?.message);
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tokenData.is_active) {
      return new Response(JSON.stringify({ error: 'Token is inactive.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token has expired.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id: tokenUserId } = tokenData;

    // 2. Validate incoming data
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Only POST is accepted.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload: RequestPayload;
    try {
      payload = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { scrim_game_id, stats, timestamp: clientTimestamp } = payload;

    if (!scrim_game_id || typeof scrim_game_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid scrim_game_id.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional: Validate scrim_game_id exists in scrim_games table
    const { data: gameExists, error: gameExistsError } = await supabase
      .from('scrim_games')
      .select('id')
      .eq('id', scrim_game_id)
      .maybeSingle();

    if (gameExistsError || !gameExists) {
      console.error('Scrim game ID validation error or not found:', gameExistsError?.message);
      return new Response(JSON.stringify({ error: `Scrim game with id ${scrim_game_id} not found.` }), {
        status: 404, // Not Found, as the referenced game doesn't exist
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    if (!Array.isArray(stats) || stats.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or empty stats array.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const stat of stats) {
      if (!stat.stat_type || typeof stat.stat_type !== 'string' || typeof stat.stat_value === 'undefined') {
        return new Response(JSON.stringify({ error: 'Each stat must have a valid stat_type and stat_value.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Store game statistics
    const statsToInsert = stats.map(stat => ({
      scrim_game_id,
      user_id: tokenUserId, // User ID from the token
      stat_type: stat.stat_type,
      stat_value: stat.stat_value,
      timestamp: clientTimestamp ? new Date(clientTimestamp).toISOString() : new Date().toISOString(),
    }));

    const { error: insertError } = await supabase.from('game_stats').insert(statsToInsert);

    if (insertError) {
      console.error('Error inserting game stats:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to store game stats.', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully inserted ${statsToInsert.length} stats for scrim_game_id: ${scrim_game_id}`);
    return new Response(JSON.stringify({ message: 'Game stats received and stored successfully.' }), {
      status: 201, // Created
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in receive-game-stats function:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
