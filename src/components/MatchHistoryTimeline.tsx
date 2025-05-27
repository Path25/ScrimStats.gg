
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trophy, Target, TrendingUp, TrendingDown, Clock, Users, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface ScrimTimelineData {
  id: string;
  opponent: string;
  scrim_date: string;
  overall_result: string | null;
  status: string;
  scrim_games: Array<{ result: string }>;
}

const MatchHistoryTimeline: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: scrims, isLoading, error } = useQuery({
    queryKey: ['timeline-scrims', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('scrims')
        .select('id, opponent, scrim_date, overall_result, status, scrim_games(result)')
        .gte('scrim_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('scrim_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('scrim_date', { ascending: true });

      if (error) throw error;
      return data as ScrimTimelineData[] || [];
    }
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const getWinRate = (games: Array<{ result: string }>) => {
    if (!games.length) return 0;
    const wins = games.filter(game => game.result === 'Win').length;
    return Math.round((wins / games.length) * 100);
  };

  const getPerformanceTrend = (scrims: ScrimTimelineData[]) => {
    if (scrims.length < 2) return 'neutral';
    
    const recentScrims = scrims.slice(-3);
    const winRates = recentScrims.map(scrim => getWinRate(scrim.scrim_games));
    const avgRecent = winRates.reduce((a, b) => a + b, 0) / winRates.length;
    
    if (avgRecent >= 60) return 'up';
    if (avgRecent <= 40) return 'down';
    return 'neutral';
  };

  const handleViewDetails = (scrimId: string) => {
    navigate(`/scrims/${scrimId}`);
  };

  if (error) {
    toast({
      title: "Error loading timeline",
      description: "Failed to fetch match history data",
      variant: "destructive",
    });
  }

  const performanceTrend = scrims ? getPerformanceTrend(scrims) : 'neutral';

  return (
    <Card className="gaming-card shadow-lg border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-gaming tracking-wide">MATCH TIMELINE</CardTitle>
              <p className="text-muted-foreground text-sm">
                Performance trends for {format(currentMonth, 'MMMM yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {scrims && scrims.length > 0 && (
          <div className="flex items-center gap-4 pt-2 border-t border-border/20">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{scrims.length} matches</span>
            </div>
            <div className="flex items-center gap-2">
              {performanceTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
              {performanceTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
              {performanceTrend === 'neutral' && <Target className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium">
                {performanceTrend === 'up' && 'Improving'}
                {performanceTrend === 'down' && 'Declining'}
                {performanceTrend === 'neutral' && 'Stable'}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-pulse w-8 h-8 bg-muted rounded-full mx-auto" />
              <p className="text-muted-foreground text-sm">Loading timeline...</p>
            </div>
          </div>
        ) : !scrims || scrims.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium font-gaming">No matches this month</h3>
                <p className="text-sm text-muted-foreground">
                  Try navigating to a different month or schedule some scrims
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20" />
            
            <div className="space-y-6">
              {scrims.map((scrim, index) => {
                const winRate = getWinRate(scrim.scrim_games);
                const isWin = winRate >= 50;
                const date = parseISO(scrim.scrim_date);
                
                return (
                  <div 
                    key={scrim.id}
                    className="relative flex items-start gap-4 animate-in fade-in slide-in-from-left-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Timeline node */}
                    <div className={`
                      relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center
                      transition-all duration-300 hover:scale-110 cursor-pointer shadow-lg
                      ${isWin 
                        ? 'bg-green-500/20 border-green-500 text-green-500 hover:bg-green-500/30' 
                        : 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30'
                      }
                    `}>
                      <Trophy className="h-5 w-5" />
                    </div>

                    {/* Match card */}
                    <div className="flex-1 group">
                      <Card className="border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-md cursor-pointer">
                        <CardContent className="p-4" onClick={() => handleViewDetails(scrim.id)}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-gaming font-semibold tracking-wide group-hover:text-primary transition-colors">
                                VS {scrim.opponent.toUpperCase()}
                              </h4>
                              <Badge 
                                variant={scrim.status === 'Completed' ? 'default' : 'secondary'}
                                className="text-xs font-gaming"
                              >
                                {scrim.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(date, 'MMM dd')}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">Win Rate:</span>
                                <span className={`text-sm font-bold font-gaming ${
                                  isWin ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {winRate}%
                                </span>
                              </div>
                              
                              {scrim.overall_result && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">Result:</span>
                                  <span className="text-sm font-gaming font-medium">
                                    {scrim.overall_result}
                                  </span>
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchHistoryTimeline;
