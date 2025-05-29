
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { LolGameSummaryData, TeamDetails, GamePlayer, PlayerGameStats } from '@/types/leagueGameStats';

const playerStatsSchema = z.object({
  championName: z.string().min(1, "Champion name is required"),
  summonerName: z.string().min(1, "Summoner name is required"),
  kills: z.number().min(0).default(0),
  deaths: z.number().min(0).default(0),
  assists: z.number().min(0).default(0),
  cs: z.number().min(0).default(0),
  gold: z.number().min(0).default(0),
  visionScore: z.number().min(0).default(0),
  damageDealt: z.number().min(0).default(0),
  damageTaken: z.number().min(0).default(0),
});

const gameDataSchema = z.object({
  gameLength: z.number().min(1, "Game length is required"),
  gameMode: z.string().default("Classic"),
  blueTeamWin: z.boolean(),
  blueTeam: z.array(playerStatsSchema).length(5),
  redTeam: z.array(playerStatsSchema).length(5),
});

type GameDataFormValues = z.infer<typeof gameDataSchema>;

interface ManualGameDataDialogProps {
  scrimGameId: string;
  children: React.ReactNode;
}

const defaultPlayerStats = {
  championName: '',
  summonerName: '',
  kills: 0,
  deaths: 0,
  assists: 0,
  cs: 0,
  gold: 0,
  visionScore: 0,
  damageDealt: 0,
  damageTaken: 0,
};

const ManualGameDataDialog: React.FC<ManualGameDataDialogProps> = ({ scrimGameId, children }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('game-info');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<GameDataFormValues>({
    resolver: zodResolver(gameDataSchema),
    defaultValues: {
      gameLength: 0,
      gameMode: 'Classic',
      blueTeamWin: true,
      blueTeam: Array(5).fill(defaultPlayerStats),
      redTeam: Array(5).fill(defaultPlayerStats),
    },
  });

  const createManualGameDataMutation = useMutation({
    mutationFn: async (data: GameDataFormValues) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Convert form data to LolGameSummaryData format
      const blueTeamPlayers: GamePlayer[] = data.blueTeam.map(player => ({
        championName: player.championName,
        summonerName: player.summonerName,
        items: [null, null, null, null, null, null], // Empty items for manual entry
        spell1Id: 0, // Default values for manual entry
        spell2Id: 0,
        teamId: 100,
        stats: {
          WIN: data.blueTeamWin ? 1 : 0,
          CHAMPIONS_KILLED: player.kills,
          NUM_DEATHS: player.deaths,
          ASSISTS: player.assists,
          MINIONS_KILLED: Math.floor(player.cs * 0.7), // Approximate split
          NEUTRAL_MINIONS_KILLED: Math.floor(player.cs * 0.3),
          GOLD_EARNED: player.gold,
          VISION_SCORE: player.visionScore,
          TOTAL_DAMAGE_DEALT_TO_CHAMPIONS: player.damageDealt,
          TOTAL_DAMAGE_TAKEN: player.damageTaken,
        } as PlayerGameStats,
      }));

      const redTeamPlayers: GamePlayer[] = data.redTeam.map(player => ({
        championName: player.championName,
        summonerName: player.summonerName,
        items: [null, null, null, null, null, null],
        spell1Id: 0,
        spell2Id: 0,
        teamId: 200,
        stats: {
          WIN: !data.blueTeamWin ? 1 : 0,
          CHAMPIONS_KILLED: player.kills,
          NUM_DEATHS: player.deaths,
          ASSISTS: player.assists,
          MINIONS_KILLED: Math.floor(player.cs * 0.7),
          NEUTRAL_MINIONS_KILLED: Math.floor(player.cs * 0.3),
          GOLD_EARNED: player.gold,
          VISION_SCORE: player.visionScore,
          TOTAL_DAMAGE_DEALT_TO_CHAMPIONS: player.damageDealt,
          TOTAL_DAMAGE_TAKEN: player.damageTaken,
        } as PlayerGameStats,
      }));

      const blueTeam: TeamDetails = {
        teamId: 100,
        isWinningTeam: data.blueTeamWin,
        players: blueTeamPlayers,
        stats: {
          CHAMPIONS_KILLED: blueTeamPlayers.reduce((sum, p) => sum + (p.stats?.CHAMPIONS_KILLED || 0), 0),
          GOLD_EARNED: blueTeamPlayers.reduce((sum, p) => sum + (p.stats?.GOLD_EARNED || 0), 0),
        },
      };

      const redTeam: TeamDetails = {
        teamId: 200,
        isWinningTeam: !data.blueTeamWin,
        players: redTeamPlayers,
        stats: {
          CHAMPIONS_KILLED: redTeamPlayers.reduce((sum, p) => sum + (p.stats?.CHAMPIONS_KILLED || 0), 0),
          GOLD_EARNED: redTeamPlayers.reduce((sum, p) => sum + (p.stats?.GOLD_EARNED || 0), 0),
        },
      };

      const summaryData: LolGameSummaryData = {
        gameMode: data.gameMode,
        gameType: 'Custom',
        gameLength: data.gameLength,
        teams: [blueTeam, redTeam],
      };

      console.log('Creating manual game data:', summaryData);

      const { error } = await supabase
        .from('game_stats')
        .insert({
          scrim_game_id: scrimGameId,
          user_id: user.id,
          stat_type: 'lol_game_summary',
          stat_value: summaryData as any, // Cast to any to satisfy Json type requirement
          timestamp: new Date().toISOString(),
        });

      if (error) {
        console.error('Error inserting manual game data:', error);
        throw new Error(error.message);
      }

      return summaryData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameStats', scrimGameId] });
      toast.success('Manual game data added successfully!');
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error('Error creating manual game data:', error);
      toast.error(`Failed to add manual game data: ${error.message}`);
    },
  });

  const onSubmit = (data: GameDataFormValues) => {
    console.log('Submitting manual game data:', data);
    createManualGameDataMutation.mutate(data);
  };

  const renderPlayerForm = (teamName: string, teamIndex: 'blueTeam' | 'redTeam') => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{teamName} Team</h3>
        <div className="grid gap-4">
          {Array.from({ length: 5 }, (_, playerIndex) => (
            <div key={playerIndex} className="p-4 border rounded-lg bg-card space-y-3">
              <h4 className="font-medium text-foreground">Player {playerIndex + 1}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name={`${teamIndex}.${playerIndex}.summonerName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summoner Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter summoner name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${teamIndex}.${playerIndex}.championName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Champion</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter champion name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${teamIndex}.${playerIndex}.kills`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kills</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${teamIndex}.${playerIndex}.deaths`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deaths</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${teamIndex}.${playerIndex}.assists`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assists</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${teamIndex}.${playerIndex}.cs`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CS</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${teamIndex}.${playerIndex}.gold`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gold</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${teamIndex}.${playerIndex}.visionScore`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vision Score</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${teamIndex}.${playerIndex}.damageDealt`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Damage Dealt</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Manual Game Data</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="game-info">Game Info</TabsTrigger>
                <TabsTrigger value="blue-team">Blue Team</TabsTrigger>
                <TabsTrigger value="red-team">Red Team</TabsTrigger>
              </TabsList>
              
              <TabsContent value="game-info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gameLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game Length (seconds)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1800" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gameMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game Mode</FormLabel>
                        <FormControl>
                          <Input placeholder="Classic" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="blueTeamWin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <input 
                          type="checkbox" 
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4"
                        />
                      </FormControl>
                      <FormLabel>Blue Team Won</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="blue-team">
                {renderPlayerForm('Blue', 'blueTeam')}
              </TabsContent>
              
              <TabsContent value="red-team">
                {renderPlayerForm('Red', 'redTeam')}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === 'game-info') return;
                  if (activeTab === 'blue-team') setActiveTab('game-info');
                  if (activeTab === 'red-team') setActiveTab('blue-team');
                }}
                disabled={activeTab === 'game-info'}
              >
                Previous
              </Button>
              
              {activeTab !== 'red-team' ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'game-info') setActiveTab('blue-team');
                    if (activeTab === 'blue-team') setActiveTab('red-team');
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={createManualGameDataMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {createManualGameDataMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Data...
                    </>
                  ) : (
                    'Add Game Data'
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualGameDataDialog;
