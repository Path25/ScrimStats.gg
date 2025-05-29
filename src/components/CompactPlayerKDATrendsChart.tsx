
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LolGameSummaryData, PlayerGameStats, GamePlayer } from '@/types/leagueGameStats';
import { Tables } from '@/integrations/supabase/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Loader2, AlertCircle, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

type GameStatWithScrimDate = Pick<Tables<'game_stats'>, 'id' | 'timestamp' | 'stat_value'> & {
  scrim_games: {
    game_number: number | null;
    scrims: {
      scrim_date: string;
    } | null;
  } | null;
};

interface KDADataPoint {
  date: string;
  originalDate: Date;
  kills: number;
  deaths: number;
  assists: number;
  gameId: string;
}

interface CompactPlayerKDATrendsChartProps {
  profileId: string;
  playerName: string;
  size: 'small' | 'medium' | 'large';
}

const fetchPlayerSummonerName = async (profileId: string): Promise<string | null> => {
  if (!profileId) return null;
  const { data, error } = await supabase
    .from('players')
    .select('summoner_name')
    .eq('linked_profile_id', profileId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching player summoner name:', error);
    throw new Error(error.message);
  }
  return data?.summoner_name || null;
};

const fetchPlayerGameStatsHistory = async (): Promise<GameStatWithScrimDate[]> => {
  const { data, error } = await supabase
    .from('game_stats')
    .select(`
      id,
      timestamp,
      stat_value,
      scrim_games (
        game_number,
        scrims (
          scrim_date
        )
      )
    `)
    .or('stat_type.eq.lol_game_summary,stat_type.eq.Raw EOG Data')
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching game stats history:', error);
    throw new Error(error.message);
  }
  return (data as GameStatWithScrimDate[]) || [];
};

const CompactPlayerKDATrendsChart: React.FC<CompactPlayerKDATrendsChartProps> = ({ 
  profileId, 
  playerName, 
  size 
}) => {
  const { data: summonerName, isLoading: isLoadingSummonerName } = useQuery({
    queryKey: ['playerSummonerName', profileId],
    queryFn: () => fetchPlayerSummonerName(profileId),
    enabled: !!profileId,
  });

  const { data: gameStatsHistory, isLoading: isLoadingGameStats } = useQuery({
    queryKey: ['playerGameStatsHistory'],
    queryFn: fetchPlayerGameStatsHistory,
    enabled: !!profileId, 
  });

  const processedKDAData = React.useMemo(() => {
    if (!summonerName || typeof summonerName !== 'string' || !gameStatsHistory || !Array.isArray(gameStatsHistory)) {
      return [];
    }

    let parsedGameName = summonerName;
    let parsedTagLine: string | undefined = undefined;

    if (summonerName.includes('#')) {
        const parts = summonerName.split('#');
        parsedGameName = parts[0];
        parsedTagLine = parts[1];
    }
    
    const kdaPoints: KDADataPoint[] = [];

    gameStatsHistory.forEach(stat => {
      if (!stat.stat_value) return;
      const summary = stat.stat_value as LolGameSummaryData;
      if (!summary.teams) return;

      let gameDate: Date | null = null;
      if (stat.scrim_games?.scrims?.scrim_date) {
        gameDate = new Date(stat.scrim_games.scrims.scrim_date);
      } else if (stat.timestamp) {
        gameDate = new Date(stat.timestamp);
      }
      if (!gameDate) return;

      for (const team of summary.teams) {
        if (!team.players) continue;
        
        const targetPlayerInGame = team.players.find((p: GamePlayer) => {
            const gamePlayerRiotId = p.riotIdGameName;
            const gamePlayerTagLine = p.riotIdTagLine;
            const gamePlayerFullSummonerName = p.summonerName;

            if (parsedTagLine && gamePlayerRiotId === parsedGameName && gamePlayerTagLine === parsedTagLine) {
                return true;
            }
            if (!parsedTagLine && gamePlayerRiotId === parsedGameName && (!gamePlayerTagLine || gamePlayerTagLine.trim() === '')) {
                return true;
            }
            if (gamePlayerFullSummonerName === summonerName) {
                return true;
            }
            return false;
        });

        if (targetPlayerInGame && targetPlayerInGame.stats) {
          const playerStats: PlayerGameStats = targetPlayerInGame.stats;
          kdaPoints.push({
            date: format(gameDate, 'MMM dd'),
            originalDate: gameDate,
            kills: playerStats.CHAMPIONS_KILLED ?? 0,
            deaths: playerStats.NUM_DEATHS ?? 0,
            assists: playerStats.ASSISTS ?? 0,
            gameId: stat.id,
          });
          break; 
        }
      }
    });
    
    kdaPoints.sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
    return kdaPoints;
  }, [summonerName, gameStatsHistory]);

  const getHeightClass = () => {
    switch (size) {
      case 'small': return 'h-[200px]';
      case 'large': return 'h-[400px]';
      default: return 'h-[300px]';
    }
  };

  if (isLoadingSummonerName || isLoadingGameStats) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-gaming">KDA Trends</CardTitle>
        </CardHeader>
        <CardContent className={`${getHeightClass()} flex items-center justify-center`}>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!summonerName) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-gaming">KDA Trends</CardTitle>
        </CardHeader>
        <CardContent className={`${getHeightClass()} flex items-center justify-center text-destructive`}>
          <AlertCircle className="h-4 w-4 mr-2" />
          <p className="text-sm">No summoner name found</p>
        </CardContent>
      </Card>
    );
  }

  if (processedKDAData.length === 0) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-gaming">KDA Trends</CardTitle>
        </CardHeader>
        <CardContent className={`${getHeightClass()} flex flex-col items-center justify-center text-muted-foreground`}>
          <BarChart2 className="h-8 w-8 mb-2" />
          <p className="text-sm text-center">No KDA data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-gaming">KDA Trends</CardTitle>
      </CardHeader>
      <CardContent className={getHeightClass()}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedKDAData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10 }} 
              allowDecimals={false} 
            />
            <Line 
              dataKey="kills" 
              type="monotone" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2} 
              dot={{ r: 2 }} 
            />
            <Line 
              dataKey="deaths" 
              type="monotone" 
              stroke="hsl(var(--destructive))" 
              strokeWidth={2} 
              dot={{ r: 2 }} 
            />
            <Line 
              dataKey="assists" 
              type="monotone" 
              stroke="hsl(var(--gaming-green))" 
              strokeWidth={2} 
              dot={{ r: 2 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CompactPlayerKDATrendsChart;
