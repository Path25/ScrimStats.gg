
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Loader2, Users, Shield, Sword, Award } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AddPlayerDialog, { PlayerFormData as AddPlayerFormData } from '@/components/AddPlayerDialog';
import EditPlayerDialog, { PlayerFormData as EditPlayerFormData } from '@/components/EditPlayerDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/integrations/supabase/types';

// Use the Player type from Supabase generated types
type Player = Tables<'players'>;

// API functions for players
const fetchPlayers = async (): Promise<Player[]> => {
  console.log("PlayersPage: Fetching all players");
  const { data, error } = await supabase
    .from('players')
    .select('*') // Fetches all players, RLS will ensure only readable data is returned
    .order('created_at', { ascending: false });

  if (error) {
    console.error("PlayersPage: Error fetching players:", error);
    throw new Error(error.message);
  }
  console.log("PlayersPage: Fetched players data:", data);
  return data || [];
};

const addPlayer = async ({ playerData, userId }: { playerData: AddPlayerFormData; userId: string }): Promise<Player> => {
  console.log("PlayersPage: Adding player:", playerData, "for user_id:", userId);
  // Map from AddPlayerFormData (summonerName, linkedProfileId) to DB schema (summoner_name, linked_profile_id)
  const newPlayerData = {
    summoner_name: playerData.summonerName,
    role: playerData.role,
    team_tag: playerData.teamTag,
    user_id: userId,
    linked_profile_id: playerData.linkedProfileId || null, // Ensure null if undefined/empty
  };

  const { data, error } = await supabase
    .from('players')
    .insert(newPlayerData)
    .select()
    .single();

  if (error) {
    console.error("PlayersPage: Error adding player:", error);
    throw new Error(error.message);
  }
  console.log("PlayersPage: Added player data:", data);
  return data;
};

const updatePlayer = async ({ playerId, playerData, userId }: { playerId: string; playerData: EditPlayerFormData; userId: string }): Promise<Player> => {
  console.log("PlayersPage: Updating player ID:", playerId, "with data:", playerData, "for user_id:", userId);
  // Map from EditPlayerFormData (summonerName, linkedProfileId) to DB schema (summoner_name, linked_profile_id)
  const playerUpdateData = {
    summoner_name: playerData.summonerName,
    role: playerData.role,
    team_tag: playerData.teamTag || null, // Ensure optional teamTag is handled as null if empty
    linked_profile_id: playerData.linkedProfileId || null, // Ensure null if undefined/empty
    // user_id is part of the WHERE clause, not updated here
    // updated_at is handled by DB trigger
  };

  const { data, error } = await supabase
    .from('players')
    .update(playerUpdateData)
    .eq('id', playerId)
    .eq('user_id', userId) // Extra check for ownership, RLS also enforces this
    .select()
    .single();

  if (error) {
    console.error("PlayersPage: Error updating player:", error);
    throw new Error(error.message);
  }
  console.log("PlayersPage: Updated player data:", data);
  return data;
};

const deletePlayer = async (playerId: string): Promise<void> => {
  console.log("PlayersPage: Deleting player with ID:", playerId);
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId);

  if (error) {
    console.error("PlayersPage: Error deleting player:", error);
    throw new Error(error.message);
  }
  console.log("PlayersPage: Deleted player with ID:", playerId);
};

const PlayersPage: React.FC = () => {
  const { user, authLoading, isAdmin: contextIsAdmin, isCoach: contextIsCoach } = useAuth(); // Get isAdmin and isCoach from AuthContext
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Use isAdmin and isCoach from AuthContext directly
  const isAdmin = contextIsAdmin;
  const isCoach = contextIsCoach;
  const canManagePlayers = isAdmin || isCoach;

  console.log("PlayersPage RENDER: user:", user ? user.id : "null", "authLoading:", authLoading, "contextIsAdmin:", isAdmin, "contextIsCoach:", isCoach, "canManagePlayers:", canManagePlayers);

  const { data: players, isLoading: playersLoading, error: playersError } = useQuery<Player[], Error>({
    queryKey: ['players'],
    queryFn: fetchPlayers,
    enabled: !!user && !authLoading,
  });
  
  console.log("PlayersPage RENDER: playersLoading:", playersLoading, "playersError:", playersError, "players data:", players);

  const addPlayerMutation = useMutation({
    mutationFn: addPlayer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast({
        title: "Player Added",
        description: `${data.summoner_name} has been successfully added.`,
      });
      console.log("PlayersPage MUTATION (addPlayer): Success, new player:", data);
    },
    onError: (error) => {
      toast({
        title: "Error Adding Player",
        description: error.message || "Failed to add player. Please try again.",
        variant: "destructive",
      });
      console.error("PlayersPage MUTATION (addPlayer): Error:", error);
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: updatePlayer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast({
        title: "Player Updated",
        description: `${data.summoner_name} has been successfully updated.`,
      });
      setIsEditModalOpen(false);
      setEditingPlayer(null);
      console.log("PlayersPage MUTATION (updatePlayer): Success, updated player:", data);
    },
    onError: (error) => {
      toast({
        title: "Error Updating Player",
        description: error.message || "Failed to update player. Please try again.",
        variant: "destructive",
      });
      console.error("PlayersPage MUTATION (updatePlayer): Error:", error);
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: deletePlayer,
    onSuccess: (_, playerId) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast({
        title: "Player Deleted",
        description: "The player has been successfully deleted.",
      });
      console.log("PlayersPage MUTATION (deletePlayer): Success, deleted player ID:", playerId);
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Player",
        description: error.message || "Failed to delete player. Please try again.",
        variant: "destructive",
      });
      console.error("PlayersPage MUTATION (deletePlayer): Error:", error);
    },
  });

  const handleAddPlayer = (playerData: AddPlayerFormData) => {
    if (!user?.id) {
      toast({ title: "Authentication Error", description: "You must be logged in to add a player.", variant: "destructive" });
      console.error("PlayersPage: Cannot add player, user not authenticated.");
      return;
    }
    if (!canManagePlayers) {
      toast({ title: "Permission Denied", description: "You do not have permission to add players.", variant: "destructive" });
      return;
    }
    console.log("PlayersPage: handleAddPlayer called with data:", playerData);
    addPlayerMutation.mutate({ playerData, userId: user.id });
  };

  const handleOpenEditDialog = (player: Player) => {
    // Admin can edit any. Coach can edit their own.
    // The local isAdmin and isCoach now correctly reflect the context values.
    if (isAdmin || (isCoach && player.user_id === user?.id)) {
      console.log("PlayersPage: Opening edit dialog for player:", player);
      setEditingPlayer(player);
      setIsEditModalOpen(true);
    } else {
      toast({ title: "Permission Denied", description: "You do not have permission to edit this player.", variant: "destructive" });
    }
  };

  const handleUpdatePlayer = (playerData: EditPlayerFormData) => {
    if (!editingPlayer || !user?.id) {
      toast({ title: "Error", description: "Cannot update player. Missing data or user.", variant: "destructive" });
      console.error("PlayersPage: Cannot update player, editingPlayer or user not available.");
      return;
    }
    console.log("PlayersPage: handleUpdatePlayer called for ID:", editingPlayer.id, "with data:", playerData);
    updatePlayerMutation.mutate({ playerId: editingPlayer.id, playerData, userId: user.id });
  };

  const handleDeletePlayer = (player: Player) => {
    // Admin can delete any. Coach can delete their own.
    // The local isAdmin and isCoach now correctly reflect the context values.
    if (isAdmin || (isCoach && player.user_id === user?.id)) {
      console.log("PlayersPage: handleDeletePlayer called for ID:", player.id);
      deletePlayerMutation.mutate(player.id);
    } else {
      toast({ title: "Permission Denied", description: "You do not have permission to delete this player.", variant: "destructive" });
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center pulse-glow">
              <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
            </div>
            <p className="text-muted-foreground">Loading authentication...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-xl font-semibold text-destructive mb-4">Access Denied</p>
          <p className="text-muted-foreground">You must be logged in to manage players.</p>
          <Button onClick={() => window.location.href = '/login'} className="mt-4 shadow-sm">Go to Login</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gaming-purple to-gaming-neon-pink flex items-center justify-center shadow-gaming">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground neon-text">Team Roster</h1>
              <p className="text-muted-foreground">Manage your team's player roster</p>
            </div>
          </div>
          {canManagePlayers && (
            <AddPlayerDialog onPlayerAdd={handleAddPlayer}>
              <Button disabled={addPlayerMutation.isPending} className="shadow-gaming">
                {addPlayerMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" /> 
                )}
                Add Player
              </Button>
            </AddPlayerDialog>
          )}
        </div>
        
        <Card className="gaming-table">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-gaming-gold" />
              Team Roster
            </CardTitle>
            <CardDescription>View your team's players. Admins/Coaches can manage them.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {playersLoading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading players...</p>
              </div>
            )}
            {playersError && (
              <p className="text-center text-destructive py-8">
                Error loading players: {playersError.message}
              </p>
            )}
            {!playersLoading && !playersError && players && (
              <>
                <Table>
                  <TableHeader className="gaming-table-header">
                    <TableRow>
                      <TableHead className="w-[200px]">Summoner Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Team Tag</TableHead>
                      <TableHead>Account Status</TableHead>
                      {canManagePlayers && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.length > 0 ? players.map((player, index) => (
                      <TableRow 
                        key={player.id} 
                        className="gaming-table-row table-row-animate-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Sword className="h-4 w-4 text-primary" />
                            {player.summoner_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-muted-foreground">
                            {player.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {player.team_tag ? (
                            <span className="font-mono text-xs bg-muted/20 px-2 py-1 rounded">
                              {player.team_tag}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {player.linked_profile_id ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <span className="h-2 w-2 bg-gaming-green rounded-full animate-pulse"></span>
                              Linked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No Account
                            </Badge>
                          )}
                        </TableCell>
                        {canManagePlayers && (
                          <TableCell className="text-right space-x-2">
                            {(isAdmin || (isCoach && player.user_id === user?.id)) && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  aria-label="Edit player" 
                                  onClick={() => handleOpenEditDialog(player)}
                                  disabled={updatePlayerMutation.isPending && updatePlayerMutation.variables?.playerId === player.id}
                                  className="hover:bg-primary/10 hover:text-primary transition-all"
                                >
                                  {updatePlayerMutation.isPending && updatePlayerMutation.variables?.playerId === player.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                      <Edit className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  aria-label="Delete player" 
                                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10" 
                                  onClick={() => handleDeletePlayer(player)}
                                  disabled={deletePlayerMutation.isPending && deletePlayerMutation.variables === player.id}
                                >
                                  {deletePlayerMutation.isPending && deletePlayerMutation.variables === player.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={canManagePlayers ? 5 : 4} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 py-4">
                            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                              <Users className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="text-muted-foreground">No players added yet</div>
                            {canManagePlayers && (
                              <AddPlayerDialog onPlayerAdd={handleAddPlayer}>
                                <Button size="sm" variant="outline" className="mt-2">
                                  <PlusCircle className="mr-2 h-4 w-4" /> Add your first player
                                </Button>
                              </AddPlayerDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {editingPlayer && canManagePlayers && (isAdmin || (isCoach && editingPlayer.user_id === user?.id)) && (
        <EditPlayerDialog
          player={editingPlayer}
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onPlayerUpdate={handleUpdatePlayer}
          isUpdating={updatePlayerMutation.isPending}
        />
      )}
    </Layout>
  );
};

export default PlayersPage;
