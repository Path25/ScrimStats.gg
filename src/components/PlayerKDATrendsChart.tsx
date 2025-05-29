import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LolGameSummaryData, PlayerGameStats, GamePlayer } from '@/types/leagueGameStats';
import { Tables } from '@/integrations/supabase/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, AlertCircle, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

type GameStatWithScrimDate = Pick<Tables<'game_stats'>, 'id' | 'timestamp' | 'stat_value'> & {
  scrim_games: {
    game_number: number | null;
    scrims: {
      scrim_date: string;
    } | null;
  } | null;
};

interface KDADataPoint {
  date: string; // Formatted date string for XAxis
  originalDate: Date; // For sorting
  kills: number;
  deaths: number;
  assists: number;
  gameId: string;
}

interface PlayerKDATrendsChartProps {
  profileId: string;
  playerName: string;
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
  // Fetch all lol_game_summary or Raw EOG Data
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
    .order('timestamp', { ascending: true }); // Order by stat's timestamp initially

  if (error) {
    console.error('Error fetching game stats history:', error);
    throw new Error(error.message);
  }
  return (data as GameStatWithScrimDate[]) || [];
};

const chartConfig = {
  kills: {
    label: "Kills",
    color: "hsl(var(--primary))",
  },
  deaths: {
    label: "Deaths",
    color: "hsl(var(--destructive))",
  },
  assists: {
    label: "Assists",
    color: "hsl(var(--gaming-green))",
  },
} satisfies ChartConfig;

const PlayerKDATrendsChart: React.FC<PlayerKDATrendsChartProps> = ({ profileId, playerName }) => {
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
    
    console.log(`Processing KDA data for profile summoner: ${summonerName} (Parsed GameName: ${parsedGameName}, Parsed TagLine: ${parsedTagLine || 'N/A'})`);
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

            // Match 1: Profile has tagline, game data has matching gameName and tagLine
            if (parsedTagLine && gamePlayerRiotId === parsedGameName && gamePlayerTagLine === parsedTagLine) {
                return true;
            }
            // Match 2: Profile has NO tagline, game data has matching gameName and NO (or empty) tagLine
            if (!parsedTagLine && gamePlayerRiotId === parsedGameName && (!gamePlayerTagLine || gamePlayerTagLine.trim() === '')) {
                return true;
            }
            // Match 3: Full summoner name from profile matches p.summonerName from game data (e.g., if game data stores "GameName#TagLine" in p.summonerName)
            if (gamePlayerFullSummonerName === summonerName) {
                return true;
            }
            return false;
        });

        if (targetPlayerInGame && targetPlayerInGame.stats) {
          const playerStats: PlayerGameStats = targetPlayerInGame.stats;
          kdaPoints.push({
            date: format(gameDate, 'MMM dd, yyyy'),
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
    console.log(`Processed ${kdaPoints.length} KDA points for ${summonerName}.`);
    return kdaPoints;
  }, [summonerName, gameStatsHistory]);

  if (isLoadingSummonerName || isLoadingGameStats) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>KDA Trends for {playerName}</CardTitle>
          <CardDescription>Analyzing game history...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading KDA data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!summonerName) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>KDA Trends for {playerName}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-destructive">
          <AlertCircle className="h-6 w-6 mr-2" />
          <p>Could not find summoner name for this player. Ensure they are linked in the Players section.</p>
        </CardContent>
      </Card>
    );
  }

  if (processedKDAData.length === 0) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>KDA Trends for {playerName}</CardTitle>
          <CardDescription>Summoner: {summonerName}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
          <BarChart2 className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">No KDA data available.</p>
          <p className="text-sm text-center">This player may not have any recorded games with detailed stats or the summoner name format could not be matched.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle>KDA Trends for {playerName}</CardTitle>
        <CardDescription>Showing Kills, Deaths, and Assists over recent games for {summonerName}.</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <LineChart accessibilityLayer data={processedKDAData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={-15}
              textAnchor="end"
              height={50}
              interval="preserveStartEnd"
              tickFormatter={(value) => format(new Date(value), "MMM dd")}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
            <ChartTooltip
              cursor={true}
              content={<ChartTooltipContent indicator="dot" hideLabel />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line dataKey="kills" type="monotone" stroke="var(--color-kills)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            <Line dataKey="deaths" type="monotone" stroke="var(--color-deaths)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            <Line dataKey="assists" type="monotone" stroke="var(--color-assists)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default PlayerKDATrendsChart;
