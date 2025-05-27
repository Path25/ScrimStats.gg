import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, KeyRound, Eye, EyeOff, Copy, AlertTriangle, ShieldCheck, ShieldOff, Server, UserCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type PlayerApiToken = Tables<'player_api_tokens'>;
type Profile = Tables<'profiles'>;
type Player = Tables<'players'>; // For linked player info

// Helper to generate a secure random token
const generateSecureToken = (length = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// API functions for tokens
const fetchUserToken = async (userId: string): Promise<PlayerApiToken | null> => {
  const { data, error } = await supabase
    .from('player_api_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const fetchAllProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data || [];
};

const createToken = async (userId: string): Promise<PlayerApiToken> => {
  // 1. Revoke any existing active tokens for the user
  const { error: revokeError } = await supabase
    .from('player_api_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true);
  if (revokeError) throw revokeError;

  // 2. Generate and insert new token
  const newTokenString = generateSecureToken();
  const { data, error: insertError } = await supabase
    .from('player_api_tokens')
    .insert({ user_id: userId, token: newTokenString, is_active: true })
    .select()
    .single();
  if (insertError) {
    console.error("Error inserting token:", insertError);
    throw insertError;
  }
  return data;
};

const revokeToken = async (tokenId: string): Promise<void> => {
  const { error } = await supabase
    .from('player_api_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', tokenId);
  if (error) throw error;
};

const fetchLinkedPlayer = async (profileId: string): Promise<Player | null> => {
  if (!profileId) return null;
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('linked_profile_id', profileId)
    .maybeSingle();
  if (error) {
    console.error("Error fetching linked player:", error);
    return null;
  }
  return data;
};

const ApiTokenManager: React.FC = () => {
  const { user, isAdmin, isCoach } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const API_ENDPOINT_URL = useMemo(() => {
    let endpoint = "";
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        const projectId = url.hostname.split('.')[0];
        if (projectId && projectId !== 'your-project-id') {
          endpoint = `https://${projectId}.supabase.co/functions/v1/receive-game-stats`;
        } else {
          console.warn("ApiTokenManager: Supabase project ID is not configured properly. Please update VITE_SUPABASE_URL.");
        }
      } catch (e) {
        console.error("ApiTokenManager: VITE_SUPABASE_URL is not a valid URL. Please check your environment configuration.", e);
      }
    } else {
      console.info("ApiTokenManager: VITE_SUPABASE_URL is not set. Please configure your Supabase environment variables.");
    }
    return endpoint;
  }, []);

  useEffect(() => {
    if (user && !isAdmin && !isCoach) {
      setSelectedUserId(user.id);
    }
  }, [user, isAdmin, isCoach]);

  const { data: profiles, isLoading: profilesLoading } = useQuery<Profile[], Error>({
    queryKey: ['allProfilesForTokenManagement'],
    queryFn: fetchAllProfiles,
    enabled: !!user && (isAdmin || isCoach),
  });

  const queryKeyForToken: QueryKey = ['playerApiToken', selectedUserId];
  const { data: currentToken, isLoading: tokenLoading, isSuccess: isTokenFetchSuccess } = useQuery<PlayerApiToken | null, Error>({
    queryKey: queryKeyForToken,
    queryFn: () => selectedUserId ? fetchUserToken(selectedUserId) : Promise.resolve(null),
    enabled: !!selectedUserId,
  });

  const { data: linkedPlayer, isLoading: linkedPlayerLoading } = useQuery<Player | null, Error>({
    queryKey: ['linkedPlayerForToken', selectedUserId],
    queryFn: () => selectedUserId ? fetchLinkedPlayer(selectedUserId) : Promise.resolve(null),
    enabled: !!selectedUserId,
  });
  
  useEffect(() => {
    if (isTokenFetchSuccess) {
      setGeneratedToken(null); 
      setShowToken(false);     
    }
  }, [isTokenFetchSuccess, selectedUserId]);

  const createTokenMutation = useMutation({
    mutationFn: (userId: string) => createToken(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeyForToken });
      queryClient.invalidateQueries({ queryKey: ['linkedPlayerForToken', selectedUserId] });
      setGeneratedToken(data.token); 
      setShowToken(true);
      toast({ title: "API Token Generated", description: "A new API token has been generated. Please copy it now." });
    },
    onError: (error: Error) => {
      if (!isAdmin && !isCoach) { // Check if the current user is a regular player
        toast({
          title: "Permission Denied",
          description: "Only an admin or coach can generate API tokens. Please contact them to get a token.",
          variant: "destructive",
        });
      } else { // For admins/coaches, or other types of errors (e.g. network issue)
        toast({
          title: "Error Generating Token",
          description: error.message, // Display the actual error message for admins/coaches
          variant: "destructive",
        });
      }
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: (tokenId: string) => revokeToken(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyForToken });
      queryClient.invalidateQueries({ queryKey: ['linkedPlayerForToken', selectedUserId] });
      setGeneratedToken(null);
      setShowToken(false);
      toast({ title: "API Token Revoked", description: "The API token has been successfully revoked." });
    },
    onError: (error: Error) => {
      toast({ title: "Error Revoking Token", description: error.message, variant: "destructive" });
    },
  });

  const handleGenerateToken = () => {
    if (!selectedUserId) {
      toast({ title: "User not selected", description: "Please select a user to generate a token.", variant: "destructive" });
      return;
    }
    createTokenMutation.mutate(selectedUserId);
  };

  const handleRevokeToken = () => {
    // Ensure currentToken and currentToken.id exist before calling mutate
    if (currentToken && currentToken.id) {
      revokeTokenMutation.mutate(currentToken.id);
    } else {
      toast({ title: "No Active Token", description: "There is no active token to revoke for this user.", variant: "destructive" });
    }
  };

  const handleCopyToClipboard = (textToCopy: string, type: 'Token' | 'Endpoint URL') => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: "Copied!", description: `${type} copied to clipboard.` }))
      .catch(() => toast({ title: "Copy Failed", description: `Could not copy ${type.toLowerCase()} to clipboard.`, variant: "destructive" }));
  };

  const canManage = isAdmin || isCoach;

  if (!user) {
    return <p>Please log in to manage API tokens.</p>;
  }

  const selectedProfile = profiles?.find(p => p.id === selectedUserId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Token Management</CardTitle>
        <CardDescription>
          {canManage ? "Generate and manage API tokens for users." : "Manage your API token for desktop application integration."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {canManage && (
          <div className="space-y-2">
            <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select User</label>
            <Select
              value={selectedUserId || ""}
              onValueChange={(value) => {
                setSelectedUserId(value);
                setGeneratedToken(null);
                setShowToken(false);
              }}
              disabled={profilesLoading || createTokenMutation.isPending || revokeTokenMutation.isPending}
            >
              <SelectTrigger id="user-select">
                <SelectValue placeholder={profilesLoading ? "Loading users..." : "Select a user"} />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name || p.ign || p.id} {p.id === user.id ? "(You)" : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!selectedUserId && canManage && (
          <p className="text-sm text-muted-foreground">Please select a user to view or manage their API token.</p>
        )}
        
        {selectedUserId && (tokenLoading || createTokenMutation.isPending || revokeTokenMutation.isPending || (canManage && linkedPlayerLoading)) && (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Loading token information...</p>
          </div>
        )}

        {selectedUserId && !tokenLoading && !createTokenMutation.isPending && !revokeTokenMutation.isPending && (!canManage || (canManage && !linkedPlayerLoading)) && (
          <>
            {selectedProfile && (
                <div className="p-3 border rounded-md bg-muted/50 dark:bg-muted/30">
                    <div className="flex items-center space-x-3">
                        <UserCircle2 className="h-6 w-6 text-primary" />
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                Managing token for: {selectedProfile.full_name || selectedProfile.ign || selectedProfile.id}
                            </p>
                            {linkedPlayer && (
                                <p className="text-xs text-muted-foreground">
                                    Linked Player: {linkedPlayer.summoner_name} (Role: {linkedPlayer.role})
                                </p>
                            )}
                            {!linkedPlayer && canManage && (
                                <p className="text-xs text-muted-foreground">
                                    This user is not directly linked to a player entry in the roster.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {generatedToken && (
              <div className="space-y-2 p-4 border border-dashed rounded-md bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-700">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">New Token Generated!</h3>
                <p className="text-sm text-muted-foreground">
                  Please copy this token and store it securely. You will not be able to see it again.
                </p>
                <div className="flex items-center space-x-2">
                  <Input 
                    readOnly 
                    type={showToken ? "text" : "password"} 
                    value={generatedToken} 
                    className="flex-grow"
                    aria-label="Generated API Token"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShowToken(!showToken)} aria-label={showToken ? "Hide token" : "Show token"}>
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(generatedToken, 'Token')} aria-label="Copy token">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {!generatedToken && currentToken && (
              <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-700">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium">An active API token exists for this user.</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">This token is not displayed for security reasons. If you need a new token, please regenerate one.</p>
                <p className="text-xs text-muted-foreground mt-1">Created: {new Date(currentToken.created_at).toLocaleString()}</p>
                {currentToken.last_used_at && <p className="text-xs text-muted-foreground">Last Used: {new Date(currentToken.last_used_at).toLocaleString()}</p>}
              </div>
            )}
            
            {!generatedToken && !currentToken && (
              <div className="p-4 border rounded-md bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-700">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm font-medium">No active API token found for this user.</p>
                </div>
              </div>
            )}

            {/* Display API Endpoint URL */}
            <div className="mt-4 p-3 border rounded-md bg-secondary/30 dark:bg-secondary/20">
              <div className="flex items-center space-x-2 mb-2">
                <Server className="h-5 w-5 text-foreground" />
                <h4 className="text-sm font-semibold text-foreground">API Endpoint for Desktop App</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Use the following URL in your desktop application to send game statistics:
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <Input 
                  readOnly 
                  value={API_ENDPOINT_URL} 
                  className="mt-1 text-xs flex-grow bg-background"
                  aria-label="API Endpoint URL"
                  placeholder={!API_ENDPOINT_URL ? "Please configure VITE_SUPABASE_URL" : ""}
                />
                {API_ENDPOINT_URL && (
                  <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(API_ENDPOINT_URL, 'Endpoint URL')} aria-label="Copy API Endpoint URL">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {API_ENDPOINT_URL ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Ensure your API token (generated above) is included in the <code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization</code> header as a <code className="text-xs bg-muted px-1 py-0.5 rounded">Bearer</code> token.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  The API endpoint URL will appear here once you configure your Supabase environment variables (VITE_SUPABASE_URL).
                </p>
              )}
            </div>

            <div className="flex space-x-2 pt-4">
              <Button 
                onClick={handleGenerateToken} 
                disabled={createTokenMutation.isPending || !selectedUserId || revokeTokenMutation.isPending}
              >
                {createTokenMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <KeyRound className="mr-2 h-4 w-4" />
                {currentToken ? "Regenerate Token" : "Generate Token"}
              </Button>
              {currentToken && (
                <Button 
                  variant="destructive" 
                  onClick={handleRevokeToken}
                  disabled={revokeTokenMutation.isPending || !currentToken.id || createTokenMutation.isPending}
                >
                  {revokeTokenMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Revoke Token
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiTokenManager;
