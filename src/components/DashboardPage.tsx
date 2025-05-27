import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2, CalendarCheck, Users, TrendingUp, TrendingDown, Calendar, Clock, Trophy, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
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

// Enhanced tooltip component for better interactivity
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const wins = payload.find((p: any) => p.dataKey === 'wins')?.value || 0;
    const losses = payload.find((p: any) => p.dataKey === 'losses')?.value || 0;
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-xl transition-all duration-200 animate-in fade-in zoom-in-95">
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border/30 pb-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <p className="font-gaming tracking-wide text-sm font-semibold text-foreground">{label}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#9b87f5] rounded-full shadow-sm"></div>
                <span className="text-xs font-medium text-muted-foreground">WINS</span>
              </div>
              <p className="text-lg font-bold text-[#9b87f5] font-gaming">{wins}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#ea384c] rounded-full shadow-sm"></div>
                <span className="text-xs font-medium text-muted-foreground">LOSSES</span>
              </div>
              <p className="text-lg font-bold text-[#ea384c] font-gaming">{losses}</p>
            </div>
          </div>
          
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">WIN RATE</span>
              </div>
              <span className={`text-sm font-bold font-gaming ${winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                {winRate}%
              </span>
            </div>
            <div className="mt-1 w-full bg-muted rounded-full h-1.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center pt-1">
            {total} total games played
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Enhanced bar component with hover animations
const AnimatedBar = (props: any) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <Bar
      {...props}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="transition-all duration-200 cursor-pointer"
      style={{
        filter: isHovered ? 'brightness(1.1) saturate(1.1)' : 'brightness(1)',
        transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)',
      }}
    />
  );
};

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
      { 
        title: "Total Scrims", 
        value: totalScrims.toString(), 
        icon: BarChart2, 
        trend: totalScrims > 0 ? `${totalGames} games played` : "No scrims recorded",
        trendIcon: totalScrims > 0 ? TrendingUp : null,
        gradient: "from-blue-500/10 to-cyan-500/10",
        iconColor: "text-blue-500",
        change: totalScrims > 0 ? "+12%" : "0%"
      },
      { 
        title: "Win Rate", 
        value: `${winRate}%`, 
        icon: TrendingUp, 
        trend: `${wins} wins out of ${totalGames} games`,
        trendIcon: winRate >= 50 ? TrendingUp : TrendingDown,
        gradient: winRate >= 50 ? "from-green-500/10 to-emerald-500/10" : "from-red-500/10 to-orange-500/10",
        iconColor: winRate >= 50 ? "text-green-500" : "text-red-500",
        change: winRate >= 50 ? "+5%" : "-3%"
      },
      { 
        title: "Upcoming Blocks", 
        value: upcomingScrimsCount.toString(), 
        icon: CalendarCheck, 
        trend: `Next: ${nextOpponent}`,
        trendIcon: Calendar,
        gradient: "from-purple-500/10 to-pink-500/10",
        iconColor: "text-purple-500",
        change: upcomingScrimsCount > 0 ? "+2" : "0"
      },
      { 
        title: "Active Players", 
        value: activePlayers.toString(), 
        icon: Users, 
        trend: rosterUpdateText,
        trendIcon: Clock,
        gradient: "from-amber-500/10 to-orange-500/10",
        iconColor: "text-amber-500",
        change: "+1"
      },
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
    { title: "Total Scrims", value: "...", icon: BarChart2, trend: "Loading...", gradient: "from-blue-500/10 to-cyan-500/10", iconColor: "text-blue-500", change: "..." },
    { title: "Win Rate", value: "...", icon: TrendingUp, trend: "Loading...", gradient: "from-green-500/10 to-emerald-500/10", iconColor: "text-green-500", change: "..." },
    { title: "Upcoming Blocks", value: "...", icon: CalendarCheck, trend: "Loading...", gradient: "from-purple-500/10 to-pink-500/10", iconColor: "text-purple-500", change: "..." },
    { title: "Active Players", value: "...", icon: Users, trend: "Loading...", gradient: "from-amber-500/10 to-orange-500/10", iconColor: "text-amber-500", change: "..." },
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
      <div className="space-y-8 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight font-gaming">DASHBOARD</h1>
          <p className="text-muted-foreground">Monitor your team's performance and upcoming events</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi) => (
            <Card key={kpi.title} className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-50 group-hover:opacity-70 transition-opacity duration-300`} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase font-gaming">
                    {kpi.title}
                  </CardTitle>
                </div>
                <div className={`p-2 rounded-lg bg-background/80 ${kpi.iconColor} group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 shadow-sm group-hover:shadow-lg`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              
              <CardContent className="relative">
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-bold text-foreground tracking-tight font-gaming group-hover:scale-105 transition-transform duration-300">
                      {kpi.value}
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      kpi.change.includes('+') ? 'bg-green-500/20 text-green-600' : 
                      kpi.change.includes('-') ? 'bg-red-500/20 text-red-600' : 
                      'bg-muted text-muted-foreground'
                    } transition-all duration-300 group-hover:scale-110`}>
                      {kpi.change}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                    {kpi.trendIcon && <kpi.trendIcon className="h-3 w-3 group-hover:scale-110 transition-transform duration-300" />}
                    <span className="line-clamp-1">{kpi.trend}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                  <BarChart2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-gaming tracking-wide">RECENT PERFORMANCE</CardTitle>
                  <CardDescription>Win/Loss trend over recent scrims with detailed analytics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[400px] pt-2">
              {isScrimsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <div className="animate-pulse w-8 h-8 bg-muted rounded-full mx-auto" />
                    <p className="text-muted-foreground text-sm">Loading performance data...</p>
                  </div>
                </div>
              ) : recentPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentPerformanceData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={8}
                      fontSize={12}
                      className="font-medium"
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={8}
                      allowDecimals={false}
                      fontSize={12}
                      className="font-medium"
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(155, 135, 245, 0.1)', radius: 4 }}
                    />
                    <Bar 
                      dataKey="wins" 
                      fill="#9b87f5" 
                      radius={[4, 4, 0, 0]}
                      className="transition-all duration-300 hover:brightness-110"
                    />
                    <Bar 
                      dataKey="losses" 
                      fill="#ea384c" 
                      radius={[4, 4, 0, 0]}
                      className="transition-all duration-300 hover:brightness-110"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3 p-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                      <BarChart2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium font-gaming">NO PERFORMANCE DATA</h3>
                      <p className="text-sm text-muted-foreground">Add some scrims to see performance trends</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:scale-110 transition-transform duration-300">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-gaming tracking-wide">UPCOMING SCRIMS</CardTitle>
                  <CardDescription>Next {upcomingEventsList.length} scheduled practice blocks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[350px] overflow-auto">
              {isUpcomingLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <div className="animate-pulse w-8 h-8 bg-muted rounded-full mx-auto" />
                    <p className="text-muted-foreground text-sm">Loading upcoming scrims...</p>
                  </div>
                </div>
              ) : upcomingEventsList.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEventsList.map((event, index) => (
                    <div 
                      key={event.id} 
                      className="group p-4 rounded-lg border bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors font-gaming tracking-wide">
                            VS {event.opponent.toUpperCase()}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 group-hover:text-primary transition-colors" />
                            <span>{event.date}</span>
                            {event.time && (
                              <>
                                <Clock className="h-3 w-3 ml-2 group-hover:text-primary transition-colors" />
                                <span className="font-gaming text-xs">{event.time}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <a 
                          href={`/scrims/${event.id}`} 
                          className="text-xs text-primary hover:text-primary/80 font-medium hover:underline transition-all group-hover:scale-105 font-gaming tracking-wide"
                        >
                          VIEW →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3 p-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                      <CalendarCheck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium font-gaming">NO UPCOMING SCRIMS</h3>
                      <p className="text-sm text-muted-foreground">Schedule scrims on the calendar or scrims page</p>
                    </div>
                  </div>
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
