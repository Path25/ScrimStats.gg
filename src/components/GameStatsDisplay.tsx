
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, Json } from '@/integrations/supabase/types';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DetailedGameSummaryView from './DetailedGameSummaryView';
import ManualGameDataDialog from './ManualGameDataDialog';
import { LolGameSummaryData } from '@/types/leagueGameStats';
import { useAuth } from '@/contexts/AuthContext';

type GameStat = Tables<'game_stats'>;
type Player = Tables<'players'>;
type Profile = Tables<'profiles'>;

interface GameStatsDisplayProps {
  scrimGameId: string;
  playersList: Player[];
  profilesList: Profile[];
}

const fetchGameStats = async (scrimGameId: string): Promise<GameStat[]> => {
  if (!scrimGameId) return [];
  const { data, error } = await supabase
    .from('game_stats')
    .select('*')
    .eq('scrim_game_id', scrimGameId)
    .order('user_id', { ascending: true }) 
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching game stats:', error);
    throw new Error(error.message);
  }
  return data || [];
};

const renderSimpleStatValue = (value: Json) => {
  if (typeof value === 'object' && value !== null) {
    return (
      <ul className="list-disc pl-5 text-sm space-y-1">
        {Object.entries(value).map(([key, val]) => (
          <li key={key}>
            <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span> {String(val)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return 'N/A';
};

const GameStatsDisplay: React.FC<GameStatsDisplayProps> = ({ scrimGameId, playersList, profilesList }) => {
  const { user, isAdmin: authIsAdmin, isCoach: authIsCoach } = useAuth();
  
  const { data: gameStats, isLoading, error } = useQuery<GameStat[], Error>({
    queryKey: ['gameStats', scrimGameId],
    queryFn: () => fetchGameStats(scrimGameId),
    enabled: !!scrimGameId,
  });

  const canManageData = user && (authIsAdmin || authIsCoach);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2">Loading game stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center text-destructive py-4">
        <AlertCircle className="h-5 w-5 mr-2" />
        <p>Error loading game stats: {error.message}</p>
      </div>
    );
  }

  if (!gameStats || gameStats.length === 0) {
    return (
      <div className="py-4 space-y-3">
        <p className="text-muted-foreground">No stats available for this game.</p>
        {canManageData && (
          <ManualGameDataDialog scrimGameId={scrimGameId}>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Data Manually
            </Button>
          </ManualGameDataDialog>
        )}
      </div>
    );
  }

  console.log(`[GameStatsDisplay] Raw gameStats for scrimGameId ${scrimGameId}:`, gameStats);

  // Find the detailed game summary if it exists
  const summaryStat = gameStats.find(stat => {
    const isSummaryType = stat.stat_type === 'lol_game_summary' || stat.stat_type === 'Raw EOG Data';
    console.log(`[GameStatsDisplay] Checking stat type: '${stat.stat_type}' against 'lol_game_summary' or 'Raw EOG Data'. Is summary: ${isSummaryType} for stat ID: ${stat.id}`);
    return isSummaryType;
  });
  console.log('[GameStatsDisplay] Identified summaryStat:', summaryStat);

  // Filter out the summary stat from the list of stats to be grouped by player
  const otherStats = gameStats.filter(stat => stat.stat_type !== 'lol_game_summary' && stat.stat_type !== 'Raw EOG Data');
  console.log('[GameStatsDisplay] Filtered otherStats:', otherStats);
  
  otherStats.forEach(stat => {
    console.log(`[GameStatsDisplay] An 'otherStat' has type: '${stat.stat_type}', ID: ${stat.id}, and value:`, stat.stat_value);
  });

  // Group remaining stats by user_id (player)
  const statsByPlayer: Record<string, { summonerName: string; stats: GameStat[] }> = {};

  otherStats.forEach(stat => {
    let summonerName: string | undefined | null;

    const playerEntry = playersList.find(p => p.linked_profile_id === stat.user_id);
    summonerName = playerEntry?.summoner_name;

    if (!summonerName && stat.user_id && profilesList) {
      const profileEntry = profilesList.find(prof => prof.id === stat.user_id);
      summonerName = profileEntry?.ign || profileEntry?.full_name;
    }
    
    const finalSummonerName = summonerName || `Unknown User (ID: ${stat.user_id ? stat.user_id.substring(0,8) : 'N/A'})`;
    
    const key = stat.user_id || `unknown-user-${Math.random()}`;
    if (!statsByPlayer[key]) {
      statsByPlayer[key] = { summonerName: finalSummonerName, stats: [] };
    }
    statsByPlayer[key].stats.push(stat);
  });

  return (
    <div className="space-y-4 mt-4">
      {summaryStat && summaryStat.stat_value && (
        <DetailedGameSummaryView summaryData={summaryStat.stat_value as LolGameSummaryData} />
      )}

      {Object.keys(statsByPlayer).length > 0 && (
        <>
          <h4 className="text-lg font-semibold text-foreground mt-6">Other Player-Specific Stats:</h4>
          {Object.entries(statsByPlayer).map(([userId, playerData]) => (
            playerData.stats.length > 0 && ( // Only render card if there are other stats
              <Card key={userId} className="scrim-card-alt">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-md">{playerData.summonerName}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {playerData.stats.map(stat => (
                    <div key={stat.id} className="p-2 border rounded bg-background/30">
                      <p className="font-medium text-foreground capitalize">{stat.stat_type.replace(/_/g, ' ')}:</p>
                      {renderSimpleStatValue(stat.stat_value)}
                      <p className="text-xs text-muted-foreground mt-1">
                        Recorded: {new Date(stat.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          ))}
        </>
      )}
      
      {!summaryStat && Object.keys(statsByPlayer).length === 0 && (
        <div className="py-4 space-y-3">
          <p className="text-muted-foreground">No specific stats found for display.</p>
          {canManageData && (
            <ManualGameDataDialog scrimGameId={scrimGameId}>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Data Manually
              </Button>
            </ManualGameDataDialog>
          )}
        </div>
      )}
    </div>
  );
};

export default GameStatsDisplay;
