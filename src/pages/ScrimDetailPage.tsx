import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, PlusCircle, Copy, AlertCircle, Trash2, CheckCircle, XCircle, Target } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import AddScrimGameDialog from '@/components/AddScrimGameDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tables, Enums } from '@/integrations/supabase/types';
import GameStatsDisplay from '@/components/GameStatsDisplay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import EmptyState from '@/components/EmptyState';

// Define types using Tables from supabase/types
type Scrim = Tables<'scrims'>;
type ScrimGame = Tables<'scrim_games'>;
type Player = Tables<'players'>;
type Profile = Tables<'profiles'>;
type ScrimStatus = Enums<'scrim_status_enum'>;

// API Fetcher Functions
const fetchScrimById = async (scrimId: string): Promise<Scrim | null> => {
  if (!scrimId) throw new Error("Scrim ID is required");

  console.log(`Fetching scrim with ID: ${scrimId}`);
  const { data, error } = await supabase
    .from('scrims')
    .select('*')
    .eq('id', scrimId)
    .single();

  if (error) {
    console.error('Error fetching scrim by ID:', error);
    throw new Error(error.message);
  }
  console.log('Fetched scrim data:', data);
  return data as Scrim | null;
};

const fetchGamesByScrimId = async (scrimId: string): Promise<ScrimGame[]> => {
  if (!scrimId) throw new Error("Scrim ID is required");

  console.log(`Fetching games for scrim ID: ${scrimId}`);
  const { data, error } = await supabase
    .from('scrim_games')
    .select('*')
    .eq('scrim_id', scrimId)
    .order('game_number', { ascending: true });

  if (error) {
    console.error('Error fetching games by scrim ID:', error);
    throw new Error(error.message);
  }
  console.log('Fetched games data:', data);
  return (data as ScrimGame[] | null) || [];
};

// New function to fetch all players
const fetchAllPlayers = async (): Promise<Player[]> => {
  const { data, error } = await supabase
    .from('players')
    .select('*');

  if (error) {
    console.error('Error fetching all players:', error);
    throw new Error(error.message);
  }
  return data || [];
};

// Function to fetch all profiles
const fetchAllProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*'); 

  if (error) {
    console.error('Error fetching all profiles:', error);
    throw new Error(error.message);
  }
  return data || [];
};

const ScrimDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { scrimId } = useParams<{ scrimId: string }>();
  const { user, isAdmin: authIsAdmin, isCoach: authIsCoach } = useAuth();
  const queryClient = useQueryClient();

  const [currentScrimNotes, setCurrentScrimNotes] = useState<string>('');
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  
  const scrimQueryKey = ['scrim', scrimId];
  const gamesQueryKey = ['scrimGames', scrimId];
  const allPlayersQueryKey = ['allPlayers'];
  const allProfilesQueryKey = ['allProfiles'];
  const scrimsListQueryKey = ['scrims'];

  const { data: scrim, isLoading: isLoadingScrim, error: scrimError } = useQuery({
    queryKey: scrimQueryKey,
    queryFn: () => {
      if (!scrimId) return Promise.resolve(null);
      return fetchScrimById(scrimId);
    },
    enabled: !!scrimId && !!user,
  });

  const { data: games, isLoading: isLoadingGames, error: gamesError } = useQuery({
    queryKey: gamesQueryKey,
    queryFn: () => {
      if (!scrimId) return Promise.resolve([]);
      return fetchGamesByScrimId(scrimId);
    },
    enabled: !!scrimId && !!user,
  });

  const { 
    data: allPlayers,
    isLoading: isLoadingAllPlayers,
    error: allPlayersError
  } = useQuery({
    queryKey: allPlayersQueryKey,
    queryFn: fetchAllPlayers,
    enabled: !!user,
  });

  const {
    data: allProfiles,
    isLoading: isLoadingAllProfiles,
    error: allProfilesError
  } = useQuery({
    queryKey: allProfilesQueryKey,
    queryFn: fetchAllProfiles,
    enabled: !!user,
  });
  
  const canManageThisScrim = scrim && user && (authIsAdmin || authIsCoach);
  const isScrimActionable = scrim?.status === 'Scheduled' || scrim?.status === 'In Progress';

  useEffect(() => {
    if (scrim && user) {
      console.log('ScrimDetailPage Permissions Debug:', {
        userId: user.id,
        scrimUserId: scrim.user_id,
        authContextIsAdmin: authIsAdmin,
        authContextIsCoach: authIsCoach,
        finalCanManageThisScrim: canManageThisScrim,
        scrimStatus: scrim.status,
        isScrimActionable,
      });
    }
  }, [scrim, user, authIsAdmin, authIsCoach, canManageThisScrim, isScrimActionable]);

  useEffect(() => {
    if (scrim && scrim.notes !== null && scrim.notes !== undefined) {
      setCurrentScrimNotes(scrim.notes);
    } else if (scrim === null || (scrim && (scrim.notes === null || scrim.notes === undefined))) {
      setCurrentScrimNotes('');
    }
  }, [scrim]);

  const updateScrimNotesMutation = useMutation({
    mutationFn: async ({ notes }: { notes: string }) => {
      if (!scrimId || !user?.id) throw new Error("Scrim ID or User ID is missing.");
      if (!canManageThisScrim) throw new Error("You do not have permission to update notes for this scrim.");

      const updateObject: Partial<Scrim> = { notes: notes, updated_at: new Date().toISOString() };
      
      const { data, error } = await supabase
        .from('scrims')
        .update(updateObject)
        .eq('id', scrimId)
        .select()
        .single();

      if (error) {
        console.error('Error updating scrim notes:', error);
        toast.error(`Failed to save notes: ${error.message}`);
        throw error;
      }
      return data as Scrim | null;
    },
    onSuccess: (updatedScrim) => {
      queryClient.setQueryData(scrimQueryKey, (oldData: Scrim | null | undefined) => {
        if (oldData && updatedScrim) {
          return { ...oldData, notes: updatedScrim.notes, updated_at: updatedScrim.updated_at };
        }
        return updatedScrim;
      });
      toast.success(`Notes for Scrim ID ${scrimId} saved successfully!`);
      console.log('Scrim notes updated:', updatedScrim);
    },
    onError: (error) => {
      console.error('Mutation error for updateScrimNotes:', error);
    }
  });

  const updateScrimStatusMutation = useMutation({
    mutationFn: async ({ status: newStatus, cancellation_reason }: { status: ScrimStatus; cancellation_reason?: string }) => {
      if (!scrimId || !user?.id) throw new Error("Scrim ID or User ID is missing.");
      if (!canManageThisScrim) throw new Error("You do not have permission to update this scrim's status.");

      console.log(`Updating scrim status to: ${newStatus}`);
      const updateObject: Partial<Scrim> = { 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        ...(cancellation_reason && { cancellation_reason })
      };
      
      const currentScrimData = queryClient.getQueryData<Scrim>(scrimQueryKey);
      const oldStatus = currentScrimData?.status;

      if (newStatus === 'Completed') {
        const currentGamesData = queryClient.getQueryData<ScrimGame[]>(gamesQueryKey) || [];
        if (currentGamesData && currentGamesData.length > 0) {
          const wins = currentGamesData.filter(game => game.result === 'Win').length;
          const losses = currentGamesData.filter(game => game.result === 'Loss').length;
          const draws = currentGamesData.filter(game => game.result === 'Draw').length;
          updateObject.overall_result = `${wins}W-${losses}L-${draws}D`;
        } else {
          updateObject.overall_result = '0W-0L-0D'; 
        }
      } else {
        if (oldStatus === 'Completed') {
          updateObject.overall_result = null;
        }
      }
      
      const { data, error } = await supabase
        .from('scrims')
        .update(updateObject)
        .eq('id', scrimId)
        .select()
        .single();

      if (error) {
        console.error('Error updating scrim status:', error);
        toast.error(`Failed to update scrim status: ${error.message}`);
        throw error;
      }
      
      return data as Scrim | null;
    },
    onSuccess: (updatedScrim) => {
      if (updatedScrim) {
        queryClient.setQueryData(scrimQueryKey, (oldData: Scrim | null | undefined) => 
          oldData ? { 
            ...oldData, 
            status: updatedScrim.status, 
            updated_at: updatedScrim.updated_at, 
            overall_result: updatedScrim.overall_result,
            cancellation_reason: updatedScrim.cancellation_reason 
          } : updatedScrim
        );
        queryClient.invalidateQueries({ queryKey: scrimsListQueryKey });
        queryClient.invalidateQueries({ queryKey: ['scrimCalendarEvents'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-scrims'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming'] });
        toast.success(`Scrim status updated to ${updatedScrim.status}.`);
        setShowCancellationDialog(false);
        setCancellationReason('');
      }
    },
    onError: (error: Error) => {
      toast.error(`Error updating scrim status: ${error.message}`);
    }
  });

  const deleteScrimGameMutation = useMutation({
    mutationFn: async ({ gameId }: { gameId: string }) => {
      if (!canManageThisScrim) throw new Error("You do not have permission to delete games from this scrim.");

      console.log(`Deleting game with ID: ${gameId}`);
      const { error } = await supabase
        .from('scrim_games')
        .delete()
        .eq('id', gameId);

      if (error) {
        console.error('Error deleting game:', error);
        toast.error(`Failed to delete game: ${error.message}`);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(gamesQueryKey, (oldGames: ScrimGame[] | undefined) => 
        oldGames ? oldGames.filter(game => game.id !== variables.gameId) : []
      );
      const currentScrim = queryClient.getQueryData<Scrim>(scrimQueryKey);
      
      if (currentScrim && currentScrim.status === 'Completed') {
        const updatedGames = queryClient.getQueryData<ScrimGame[]>(gamesQueryKey) || [];
        const wins = updatedGames.filter(game => game.result === 'Win').length;
        const losses = updatedGames.filter(game => game.result === 'Loss').length;
        const draws = updatedGames.filter(game => game.result === 'Draw').length;
        const newOverallResult = `${wins}W-${losses}L-${draws}D`;
        
        queryClient.setQueryData(scrimQueryKey, (oldScrimData: Scrim | null | undefined) => {
          if (oldScrimData) {
            return { ...oldScrimData, overall_result: newOverallResult };
          }
          return oldScrimData;
        });
      } else {
        queryClient.invalidateQueries({ queryKey: gamesQueryKey }); 
      }
      queryClient.invalidateQueries({ queryKey: scrimsListQueryKey }); 
      toast.success("Game removed successfully.");
    },
    onError: (error: Error) => {
      toast.error(`Error removing game: ${error.message}`);
    }
  });

  const handleSaveNotes = () => {
    console.log(`Attempting to save notes for Scrim ID ${scrimId}:`, currentScrimNotes);
    updateScrimNotesMutation.mutate({ notes: currentScrimNotes });
  };
  
  const handleCopyGameId = (gameId: string) => {
    navigator.clipboard.writeText(gameId)
      .then(() => {
        toast.success("Game ID copied to clipboard!");
      })
      .catch(err => {
        toast.error("Failed to copy Game ID.");
        console.error('Failed to copy text: ', err);
      });
  };

  const handleCancelScrim = () => {
    updateScrimStatusMutation.mutate({ 
      status: 'Cancelled', 
      cancellation_reason: cancellationReason 
    });
  };

  const scrimTitle = scrimId ? `Scrim Detail (ID: ${scrimId})` : "Scrim Detail";
  const displayScrimTitle = scrim ? `Scrim vs ${scrim.opponent} on ${new Date(scrim.scrim_date).toLocaleDateString()}` : scrimTitle;

  if (isLoadingScrim || isLoadingGames || isLoadingAllPlayers || isLoadingAllProfiles) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading scrim details...</p>
        </div>
      </Layout>
    );
  }

  const anyError = scrimError || gamesError || allPlayersError || allProfilesError;
  if (anyError) {
    return (
      <Layout>
        <EmptyState
          icon={AlertCircle}
          title="Error Loading Scrim Data"
          description={`There was an issue fetching data: ${anyError?.message}`}
          action={{
            label: "Back to Scrims List",
            onClick: () => navigate('/scrims'),
            variant: "outline"
          }}
          className="border-destructive bg-destructive/5"
        />
      </Layout>
    );
  }
  
  if (!scrim) {
     return (
      <Layout>
        <EmptyState
          icon={AlertCircle}
          title="Scrim Not Found"
          description={`The scrim with ID ${scrimId} could not be found or you do not have permission to view it.`}
          action={{
            label: "Back to Scrims List",
            onClick: () => navigate('/scrims'),
            variant: "outline"
          }}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <TooltipProvider>
        <div className="space-y-6">
          <Button variant="outline" onClick={() => navigate('/scrims')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Scrims List
          </Button>
          <h1 className="text-3xl font-bold text-foreground">{displayScrimTitle}</h1>
          
          <Card className="scrim-card">
            <CardHeader>
              <CardTitle>Overall Scrim Stats</CardTitle>
              <CardDescription>Opponent: {scrim.opponent} | Date: {new Date(scrim.scrim_date).toLocaleDateString()} | Patch: {scrim.patch || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>Status: <span className={`font-semibold ${
                  scrim.status === 'Completed' ? 'text-green-500' : 
                  scrim.status === 'Scheduled' ? 'text-blue-500' : 
                  scrim.status === 'Cancelled' ? 'text-red-500' :
                  scrim.status === 'In Progress' ? 'text-yellow-500' :
                  'text-gray-500'
                }`}>{scrim.status}</span></p>
              <p>Overall Result: {scrim.overall_result || 'N/A'}</p>
              {scrim.status === 'Cancelled' && scrim.cancellation_reason && (
                <p className="text-red-600 mt-2">
                  <strong>Cancellation Reason:</strong> {scrim.cancellation_reason}
                </p>
              )}
            </CardContent>
            {canManageThisScrim && isScrimActionable && (
              <CardFooter className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => updateScrimStatusMutation.mutate({ status: 'Completed' })}
                  disabled={updateScrimStatusMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Mark as Completed
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowCancellationDialog(true)}
                  disabled={updateScrimStatusMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Cancel Scrim
                </Button>
              </CardFooter>
            )}
            {canManageThisScrim && scrim.status === 'Cancelled' && (
              <CardFooter className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => updateScrimStatusMutation.mutate({ status: 'Scheduled' })}
                  disabled={updateScrimStatusMutation.isPending}
                >
                  Re-schedule Scrim
                </Button>
              </CardFooter>
            )}
          </Card>

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-foreground">Games ({games?.length || 0})</h2>
            {scrimId && canManageThisScrim && isScrimActionable && (
              <AddScrimGameDialog scrimId={scrimId}>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Game
                </Button>
              </AddScrimGameDialog>
            )}
          </div>

          {(games && games.length > 0) ? (
            <Accordion type="single" collapsible className="w-full space-y-2">
              {games.map((game) => (
                <AccordionItem value={`game-${game.game_number}`} key={game.id} className="bg-card border border-border rounded-md scrim-card">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline text-foreground">
                    <div className="flex justify-between w-full items-center">
                      <span className="font-medium">Game {game.game_number} - {game.result}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Duration: {game.duration || 'N/A'}</span>
                        {canManageThisScrim && isScrimActionable && (
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Game {game.game_number}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove this game? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteScrimGameMutation.mutate({ gameId: game.id })}
                                   className="bg-destructive hover:bg-destructive/90"
                                >
                                  Confirm Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2 text-muted-foreground space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        <strong>Game ID (for desktop app):</strong>{' '}
                        <span className="font-mono bg-muted px-1 py-0.5 rounded">{game.id}</span>
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleCopyGameId(game.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy Game ID</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p><strong>Blue Side Pick (Example):</strong> {game.blue_side_pick || 'N/A'}</p>
                    <p><strong>Red Side Pick (Example):</strong> {game.red_side_pick || 'N/A'}</p>
                    <p><strong>Notes:</strong> {game.notes || 'No notes for this game.'}</p>
                    
                    {isLoadingAllPlayers || isLoadingAllProfiles ? (
                       <div className="flex items-center justify-center py-4">
                         <Loader2 className="h-5 w-5 animate-spin text-primary" />
                         <p className="ml-2 text-sm">Loading player data for stats...</p>
                       </div>
                    ) : allPlayersError || allProfilesError ? (
                      <div className="flex items-center text-destructive py-4">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <p className="text-sm">Error loading player/profile data: {(allPlayersError || allProfilesError)?.message}</p>
                      </div>
                    ) : (
                      <GameStatsDisplay
                        scrimGameId={game.id}
                        playersList={allPlayers || []}
                        profilesList={allProfiles || []}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            canManageThisScrim && isScrimActionable && scrimId ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Target className="h-16 w-16 text-muted-foreground/50" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">No game data available</h3>
                  <p className="text-muted-foreground max-w-md">
                    This scrim doesn't have any recorded games yet. Add your first game to start tracking match performance and statistics.
                  </p>
                </div>
                <AddScrimGameDialog scrimId={scrimId}>
                  <Button variant="gaming">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add First Game
                  </Button>
                </AddScrimGameDialog>
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title="No game data available"
                description="This scrim doesn't have any recorded games. Games can only be added when the scrim is active."
              />
            )
          )}
          
          <Card className="scrim-card">
            <CardHeader>
                <CardTitle>Scrim Notes</CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea 
                  className="w-full p-2 border rounded bg-input text-foreground placeholder-muted-foreground" 
                  rows={4} 
                  placeholder={`Enter overall notes for this scrim (vs ${scrim.opponent})...`}
                  value={currentScrimNotes}
                  onChange={(e) => setCurrentScrimNotes(e.target.value)}
                  disabled={!canManageThisScrim || updateScrimNotesMutation.isPending || !isScrimActionable}
                />
                {canManageThisScrim && isScrimActionable && (
                  <Button 
                    className="mt-2" 
                    onClick={handleSaveNotes}
                    disabled={updateScrimNotesMutation.isPending || currentScrimNotes === (scrim.notes || '')}
                  >
                    {updateScrimNotesMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      "Save Notes"
                    )}
                  </Button>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Cancellation Dialog */}
        <AlertDialog open={showCancellationDialog} onOpenChange={setShowCancellationDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Scrim</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for cancelling this scrim. This will help your team track cancellation patterns.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="e.g., Opponent cancelled, Player unavailable, Technical issues..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelScrim}
                disabled={!cancellationReason.trim() || updateScrimStatusMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {updateScrimStatusMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </Layout>
  );
};

export default ScrimDetailPage;
