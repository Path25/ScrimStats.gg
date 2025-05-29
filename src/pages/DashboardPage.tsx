import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2, CalendarCheck, Users, TrendingUp, TrendingDown, Calendar, Clock, Trophy, Target } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import MatchHistoryTimeline from '@/components/MatchHistoryTimeline';
import DashboardCustomizer from '@/components/DashboardCustomizer';
import CustomizableKPIGrid from '@/components/CustomizableKPIGrid';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';

const DashboardPage: React.FC = () => {
  const { toast } = useToast();
  const { widgets, updateWidgets, isWidgetEnabled } = useDashboardWidgets();

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

  // Fetch upcoming scrims/calendar events - exclude cancelled scrims
  const { data: upcomingEvents, isLoading: isUpcomingLoading, error: upcomingError } = useQuery({
    queryKey: ['dashboard-upcoming'],
    queryFn: async () => {
      const today = new Date();
      const { data, error } = await supabase
        .from('scrims')
        .select('id, opponent, scrim_date, start_time')
        .gte('scrim_date', today.toISOString().split('T')[0])
        .neq('status', 'Cancelled') // Filter out cancelled scrims
        .order('scrim_date', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Calculate trends and changes
  const calculateTrendsAndChanges = () => {
    if (isScrimsLoading || !scrims) return null;

    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    console.log('Date calculations:', {
      today: today.toISOString(),
      oneWeekAgo: oneWeekAgo.toISOString(),
      twoWeeksAgo: twoWeeksAgo.toISOString(),
      totalScrims: scrims.length
    });
    
    // Filter for completed scrims only (those with games that have results)
    const completedScrims = scrims.filter(scrim => 
      scrim.scrim_games && scrim.scrim_games.length > 0
    );
    
    // Split completed scrims into recent week and previous week
    const recentCompletedScrims = completedScrims.filter(scrim => 
      new Date(scrim.scrim_date) >= oneWeekAgo
    );
    const previousCompletedScrims = completedScrims.filter(scrim => {
      const scrimDate = new Date(scrim.scrim_date);
      return scrimDate >= twoWeeksAgo && scrimDate < oneWeekAgo;
    });

    // Split ALL scrims (not just completed) for total scrims calculation
    const recentAllScrims = scrims.filter(scrim => 
      new Date(scrim.scrim_date) >= oneWeekAgo
    );

    console.log('Completed scrim filtering:', {
      totalCompletedScrims: completedScrims.length,
      recentCompletedScrims: recentCompletedScrims.length,
      previousCompletedScrims: previousCompletedScrims.length,
      recentAllScrims: recentAllScrims.length,
      recentCompletedScrimDates: recentCompletedScrims.map(s => s.scrim_date),
      previousCompletedScrimDates: previousCompletedScrims.map(s => s.scrim_date)
    });

    // Calculate recent week stats (completed games only)
    const recentGames = recentCompletedScrims.flatMap(scrim => scrim.scrim_games);
    const recentTotalGames = recentGames.length;
    const recentWins = recentGames.filter(game => game.result === 'Win').length;
    const recentWinRate = recentTotalGames > 0 ? Math.round((recentWins / recentTotalGames) * 100) : 0;

    // Calculate previous week stats (completed games only)
    const previousGames = previousCompletedScrims.flatMap(scrim => scrim.scrim_games);
    const previousTotalGames = previousGames.length;
    const previousWins = previousGames.filter(game => game.result === 'Win').length;
    const previousWinRate = previousTotalGames > 0 ? Math.round((previousWins / previousTotalGames) * 100) : 0;

    // Calculate changes - fix the logic here
    const scrimsChange = recentAllScrims.length; // Show scrims from this week only
    
    // Fix win rate change calculation - only compare completed games
    let winRateChange;
    if (previousTotalGames === 0 && recentTotalGames > 0) {
      // If we had no completed games before and now we do, show the current win rate as positive change
      winRateChange = recentWinRate;
    } else if (recentTotalGames === 0 && previousTotalGames > 0) {
      // If we had completed games before but none now, show no change (since current week has no completed games)
      winRateChange = 0;
    } else if (recentTotalGames === 0 && previousTotalGames === 0) {
      // If no completed games in either period, no change
      winRateChange = 0;
    } else {
      // Normal case - difference between win rates of completed games
      winRateChange = recentWinRate - previousWinRate;
    }
    
    // Fix upcoming change - show actual upcoming count
    const upcomingChange = upcomingEvents?.length || 0;

    // Calculate active players - show current count
    const activePlayers = players?.length || 0;
    
    console.log('Calculated changes:', {
      scrimsChange,
      winRateChange,
      upcomingChange,
      recentWinRate,
      previousWinRate,
      recentTotalGames,
      previousTotalGames,
      recentCompletedScrims: recentCompletedScrims.length,
      previousCompletedScrims: previousCompletedScrims.length,
      recentAllScrims: recentAllScrims.length
    });
    
    return {
      scrimsChange,
      winRateChange,
      upcomingChange,
      activePlayers,
      recentWinRate,
      previousWinRate,
      recentTotalGames,
      previousTotalGames
    };
  };

  // Calculate KPIs from fetched data
  const calculateKPIs = () => {
    if (isScrimsLoading || !scrims) return null;

    const trends = calculateTrendsAndChanges();
    if (!trends) return null;

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
      ? `Updated ${Math.max(0, Math.floor((new Date().getTime() - lastRosterUpdate.getTime()) / (1000 * 60 * 60 * 24)))} days ago`
      : 'No updates';

    // Format change values properly
    const formatChange = (value: number, isPercentage: boolean = false) => {
      if (value === 0) return "0";
      const prefix = value > 0 ? "+" : "";
      const suffix = isPercentage ? "%" : "";
      return `${prefix}${value}${suffix}`;
    };

    console.log('Final KPI calculations:', {
      totalScrims,
      winRate,
      upcomingScrimsCount,
      activePlayers,
      trendsData: trends
    });

    return [
      { 
        title: "Total Scrims", 
        value: totalScrims.toString(), 
        icon: BarChart2, 
        trend: totalScrims > 0 ? `${totalGames} games played` : "No scrims recorded",
        trendIcon: totalScrims > 0 ? TrendingUp : null,
        gradient: "from-blue-500/10 to-cyan-500/10",
        iconColor: "text-blue-500",
        change: formatChange(trends.scrimsChange)
      },
      { 
        title: "Win Rate", 
        value: `${winRate}%`, 
        icon: TrendingUp, 
        trend: `${wins} wins out of ${totalGames} games`,
        trendIcon: winRate >= 50 ? TrendingUp : TrendingDown,
        gradient: winRate >= 50 ? "from-green-500/10 to-emerald-500/10" : "from-red-500/10 to-orange-500/10",
        iconColor: winRate >= 50 ? "text-green-500" : "text-red-500",
        change: formatChange(trends.winRateChange, true)
      },
      { 
        title: "Upcoming Blocks", 
        value: upcomingScrimsCount.toString(), 
        icon: CalendarCheck, 
        trend: `Next: ${nextOpponent}`,
        trendIcon: Calendar,
        gradient: "from-purple-500/10 to-pink-500/10",
        iconColor: "text-purple-500",
        change: formatChange(trends.upcomingChange)
      },
      { 
        title: "Active Players", 
        value: activePlayers.toString(), 
        icon: Users, 
        trend: rosterUpdateText,
        trendIcon: Clock,
        gradient: "from-amber-500/10 to-orange-500/10",
        iconColor: "text-amber-500",
        change: activePlayers > 0 ? "Active" : "0"
      },
    ];
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
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight font-gaming">DASHBOARD</h1>
            <p className="text-muted-foreground">Monitor your team's performance and upcoming events</p>
          </div>
          
          <DashboardCustomizer
            widgets={widgets}
            onUpdateWidgets={updateWidgets}
          />
        </div>
        
        <CustomizableKPIGrid 
          kpiData={kpiData}
          enabledWidgetIds={widgets.filter(w => w.enabled && ['total-scrims', 'win-rate', 'upcoming-blocks', 'active-players'].includes(w.id)).map(w => w.id)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isWidgetEnabled('match-timeline') && <MatchHistoryTimeline />}
          
          {isWidgetEnabled('upcoming-scrims') && (
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
          )}
        </div>
        
      </div>
    </Layout>
  );
};

export default DashboardPage;
