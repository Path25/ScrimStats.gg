
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import CompactPlayerKDATrendsChart from '@/components/CompactPlayerKDATrendsChart';
import PlayerAnalyticsCustomizer from '@/components/PlayerAnalyticsCustomizer';
import { usePlayerAnalyticsWidgets } from '@/hooks/usePlayerAnalyticsWidgets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, BarChartHorizontalBig, Trophy, Target, Clock, TrendingUp, Activity, Gamepad2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type PlayerProfile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'ign'> & {
  players: Array<Pick<Tables<'players'>, 'id' | 'summoner_name' | 'role' | 'team_tag'>>
};

const fetchPlayersWithProfiles = async (): Promise<PlayerProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      ign,
      players (
        id,
        summoner_name,
        role,
        team_tag
      )
    `)
    .not('players', 'is', null);

  if (error) {
    console.error('Error fetching players with profiles:', error);
    throw new Error(error.message);
  }
  return (data as PlayerProfile[]).filter(p => p.players && p.players.length > 0);
};

const PlaceholderWidget: React.FC<{ 
  title: string; 
  description: string; 
  icon: React.ComponentType<any>; 
  size: 'small' | 'medium' | 'large' 
}> = ({ title, description, icon: Icon, size }) => {
  const getHeightClass = () => {
    switch (size) {
      case 'small': return 'h-[200px]';
      case 'large': return 'h-[400px]';
      default: return 'h-[300px]';
    }
  };

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-gaming flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={`${getHeightClass()} flex flex-col items-center justify-center text-muted-foreground`}>
        <Icon className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-center text-sm">{description}</p>
        <p className="text-xs text-center mt-2 opacity-75">Coming soon...</p>
      </CardContent>
    </Card>
  );
};

const PlayerAnalyticsPage: React.FC = () => {
  const [selectedPlayerProfileId, setSelectedPlayerProfileId] = useState<string | null>(null);
  const { widgets, updateWidgets, getEnabledWidgets, isWidgetEnabled } = usePlayerAnalyticsWidgets();
  
  const { data: playersData, isLoading: isLoadingPlayers, error: playersError } = useQuery({
    queryKey: ['allPlayersWithProfilesForAnalytics'],
    queryFn: fetchPlayersWithProfiles,
  });

  const selectedPlayerData = React.useMemo(() => {
    if (!selectedPlayerProfileId || !playersData) return null;
    return playersData.find(p => p.id === selectedPlayerProfileId);
  }, [selectedPlayerProfileId, playersData]);

  const handlePlayerSelect = (profileId: string) => {
    setSelectedPlayerProfileId(profileId);
  };

  const renderWidget = (widget: any) => {
    const playerName = selectedPlayerData?.full_name || selectedPlayerData?.ign || selectedPlayerData?.players[0]?.summoner_name || 'Selected Player';
    
    switch (widget.id) {
      case 'kda-trends':
        return selectedPlayerProfileId ? (
          <CompactPlayerKDATrendsChart
            key={widget.id}
            profileId={selectedPlayerProfileId}
            playerName={playerName}
            size={widget.size}
          />
        ) : null;
      
      case 'champion-mastery':
        return <PlaceholderWidget 
          title="Champion Mastery" 
          description="Win rates and performance statistics for each champion played"
          icon={Trophy}
          size={widget.size}
        />;
      
      case 'role-metrics':
        return <PlaceholderWidget 
          title="Role-Specific Metrics" 
          description="CS/min, vision score, damage share based on role"
          icon={Target}
          size={widget.size}
        />;
      
      case 'game-phase-performance':
        return <PlaceholderWidget 
          title="Game Phase Performance" 
          description="Early, mid, and late game effectiveness analysis"
          icon={Clock}
          size={widget.size}
        />;
      
      case 'team-synergy':
        return <PlaceholderWidget 
          title="Team Synergy" 
          description="Performance metrics when playing with different teammates"
          icon={Users}
          size={widget.size}
        />;
      
      case 'improvement-trends':
        return <PlaceholderWidget 
          title="Improvement Trends" 
          description="Skill progression and development over time"
          icon={TrendingUp}
          size={widget.size}
        />;
      
      case 'playstyle-analysis':
        return <PlaceholderWidget 
          title="Playstyle Analysis" 
          description="Aggressive vs defensive gameplay patterns"
          icon={Activity}
          size={widget.size}
        />;
      
      case 'objective-control':
        return <PlaceholderWidget 
          title="Objective Control" 
          description="Dragon, Baron, Herald participation statistics"
          icon={Gamepad2}
          size={widget.size}
        />;
      
      default:
        return null;
    }
  };

  const getGridClass = (size: string) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'large': return 'col-span-2';
      default: return 'col-span-1';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Card className="dashboard-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <BarChartHorizontalBig className="mr-2 h-6 w-6 text-primary" />
                  Player Performance Analytics
                </CardTitle>
                <CardDescription>
                  Select a player to view their detailed performance statistics and trends.
                </CardDescription>
              </div>
              <PlayerAnalyticsCustomizer 
                widgets={widgets} 
                onUpdateWidgets={updateWidgets}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPlayers && (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading players...</span>
              </div>
            )}
            {playersError && (
              <p className="text-destructive">Error loading players: {playersError.message}</p>
            )}
            {playersData && playersData.length > 0 && (
              <div className="mb-6 max-w-xs">
                <Select onValueChange={handlePlayerSelect} value={selectedPlayerProfileId || undefined}>
                  <SelectTrigger id="player-select">
                    <SelectValue placeholder="Select a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {playersData.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.ign || profile.players[0]?.summoner_name || 'Unnamed Player'}
                        {profile.players[0]?.team_tag && ` [${profile.players[0].team_tag}]`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {playersData && playersData.length === 0 && !isLoadingPlayers && (
               <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No Players Found</p>
                <p className="text-sm text-center">
                  Make sure you have added players and linked them to profiles in the Players section.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedPlayerProfileId && (
          <div className="grid grid-cols-2 gap-4">
            {getEnabledWidgets().map((widget) => (
              <div key={widget.id} className={getGridClass(widget.size)}>
                {renderWidget(widget)}
              </div>
            ))}
          </div>
        )}
        
        {selectedPlayerProfileId && getEnabledWidgets().length === 0 && (
          <Card className="dashboard-card">
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <BarChartHorizontalBig className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Analytics Widgets Enabled</p>
                <p className="text-sm mb-4">Use the "Customize Analytics" button to enable widgets.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default PlayerAnalyticsPage;
