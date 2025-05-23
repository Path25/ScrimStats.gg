
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2, CalendarCheck, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

// Chart configuration for the bar chart
const chartConfig = {
  wins: {
    label: "Wins",
    color: "#9b87f5", // Primary Purple from palette
  },
  losses: {
    label: "Losses",
    color: "#ea384c", // Red from palette
  },
} satisfies import("@/components/ui/chart").ChartConfig;

const DashboardPage: React.FC = () => {
  const { toast } = useToast();

  // Fetch scrim data
  const { data: scrims, isLoading: isScrimsLoading, error: scrimsError } = useQuery({
    queryKey: ['dashboard-scrims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scrims')
        .select('id, opponent, scrim_date, start_time, overall_result, status, scrim_games(id, result)')
        .order('scrim_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch player data
  const { data: players, isLoading: isPlayersLoading, error: playersError } = useQuery({
    queryKey: ['dashboard-players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('role', 'player') // Adjust if your role column has different values
        .limit(20);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch upcoming scrims/calendar events
  const { data: upcomingEvents, isLoading: isUpcomingLoading, error: upcomingError } = useQuery({
    queryKey: ['dashboard-upcoming'],
    queryFn: async () => {
      const today = new Date();
      const { data, error } = await supabase
        .from('scrims')
        .select('id, opponent, scrim_date, start_time')
        .gte('scrim_date', today.toISOString().split('T')[0])
        .order('scrim_date', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Calculate KPIs from fetched data
  const calculateKPIs = () => {
    if (isScrimsLoading || !scrims) return null;

    // Total scrims played
    const totalScrims = scrims.length;
    
    // Calculate win rate across all games
    const scrimGames = scrims.flatMap(scrim => scrim.scrim_games);
    const totalGames = scrimGames.length;
    const wins = scrimGames.filter(game => game.result === 'Win').length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    
    // Upcoming scrims count
    const upcomingScrimsCount = upcomingEvents?.length || 0;
    const nextOpponent = upcomingEvents && upcomingEvents.length > 0 ? upcomingEvents[0].opponent : 'None scheduled';
    
    // Active players count
    const activePlayers = players?.length || 0;
    
    // Calculate the date of the last roster update (most recent player created_at)
    const lastRosterUpdate = players && players.length > 0
      ? new Date(Math.max(...players.map(p => new Date(p.updated_at).getTime())))
      : null;
    
    const rosterUpdateText = lastRosterUpdate 
      ? `Updated ${new Date().getDate() - lastRosterUpdate.getDate() <= 1 ? 'today' : new Date().getDate() - lastRosterUpdate.getDate() + ' days ago'}`
      : 'No updates';

    return [
      { title: "Total Scrims", value: totalScrims.toString(), icon: BarChart2, trend: totalScrims > 0 ? `${totalGames} games played` : "No scrims recorded" },
      { title: "Win Rate", value: `${winRate}%`, icon: TrendingUp, trend: `${wins} wins out of ${totalGames} games` },
      { title: "Upcoming Blocks", value: upcomingScrimsCount.toString(), icon: CalendarCheck, trend: `Next: ${nextOpponent}` },
      { title: "Active Players", value: activePlayers.toString(), icon: Users, trend: rosterUpdateText },
    ];
  };

  // Generate performance data for the chart
  const generatePerformanceData = () => {
    if (isScrimsLoading || !scrims || scrims.length === 0) return [];

    // Get the 6 most recent scrims
    const recentScrims = [...scrims]
      .sort((a, b) => new Date(b.scrim_date).getTime() - new Date(a.scrim_date).getTime())
      .slice(0, 6);

    // Generate data for each scrim
    return recentScrims.map(scrim => {
      const games = scrim.scrim_games || [];
      const wins = games.filter(game => game.result === 'Win').length;
      const losses = games.filter(game => game.result === 'Loss').length;
      
      return {
        name: `vs ${scrim.opponent.slice(0, 8)}...`,
        wins,
        losses
      };
    }).reverse(); // Reverse to show oldest to newest
  };

  // Handle errors
  React.useEffect(() => {
    if (scrimsError) {
      toast({
        title: "Error loading scrims",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    }
    
    if (playersError || upcomingError) {
      toast({
        title: "Error loading data",
        description: "Some dashboard components may not display correctly",
        variant: "destructive",
      });
    }
  }, [scrimsError, playersError, upcomingError, toast]);

  const kpiData = calculateKPIs() || [
    { title: "Total Scrims", value: "...", icon: BarChart2, trend: "Loading..." },
    { title: "Win Rate", value: "...", icon: TrendingUp, trend: "Loading..." },
    { title: "Upcoming Blocks", value: "...", icon: CalendarCheck, trend: "Loading..." },
    { title: "Active Players", value: "...", icon: Users, trend: "Loading..." },
  ];

  const recentPerformanceData = generatePerformanceData();

  // Format upcoming events for display
  const formatUpcomingEvents = () => {
    if (isUpcomingLoading || !upcomingEvents) return [];
    
    return upcomingEvents.map(event => {
      const date = new Date(event.scrim_date);
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Format time if available
      let timeStr = '';
      if (event.start_time) {
        // Format as HH:MM AM/PM - assuming start_time is in format like "14:30:00"
        const [hours, minutes] = event.start_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12; // Convert to 12-hour format
        timeStr = `${hour12}:${minutes} ${ampm}`;
      }

      return {
        id: event.id,
        opponent: event.opponent,
        date: formattedDate,
        time: timeStr,
      };
    });
  };

  const upcomingEventsList = formatUpcomingEvents();

  return (
    <Layout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {kpiData.map((kpi) => (
            <Card key={kpi.title} className="scrim-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                <p className="text-xs text-muted-foreground pt-1">{kpi.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card className="scrim-card lg:col-span-1">
            <CardHeader>
              <CardTitle>Recent Performance</CardTitle>
              <CardDescription>Win/Loss trend over recent scrims</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] pt-6">
              {isScrimsLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading performance data...
                </div>
              ) : recentPerformanceData.length > 0 ? (
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <BarChart data={recentPerformanceData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={8}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={8}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="wins" fill="var(--color-wins)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="losses" fill="var(--color-losses)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No recent scrims found. Add some scrims to see performance data.
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="scrim-card lg:col-span-1">
            <CardHeader>
              <CardTitle>Upcoming Scrims</CardTitle>
              <CardDescription>Next {upcomingEventsList.length} scheduled practice blocks</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] overflow-auto">
              {isUpcomingLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading upcoming scrims...
                </div>
              ) : upcomingEventsList.length > 0 ? (
                <ul className="space-y-2">
                  {upcomingEventsList.map((event) => (
                    <li key={event.id} className="border-b border-border pb-2 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">vs {event.opponent}</p>
                          <p className="text-xs text-muted-foreground">{event.date} {event.time}</p>
                        </div>
                        <a 
                          href={`/scrims/${event.id}`} 
                          className="text-xs text-primary hover:underline"
                        >
                          View Details
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No upcoming scrims scheduled. Add a scrim on the calendar or scrims page.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
      </div>
    </Layout>
  );
};

export default DashboardPage;
