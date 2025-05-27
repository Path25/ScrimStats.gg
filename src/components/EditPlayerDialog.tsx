
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type Player = Tables<'players'>;

// Define the Zod schema for player form validation
const playerSchema = z.object({
  summonerName: z.string().min(3, { message: "Summoner Name must be at least 3 characters." }).max(50),
  role: z.string().min(2, { message: "Role must be at least 2 characters." }).max(20),
  teamTag: z.string().min(2, { message: "Team Tag must be at least 2 characters." }).max(10).optional().or(z.literal('')),
  linkedProfileId: z.string().optional().nullable(), // Optional: can be empty string, undefined or null
});

export type PlayerFormData = z.infer<typeof playerSchema>;

interface EditPlayerDialogProps {
  player: Player | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayerUpdate: (playerData: PlayerFormData) => void;
  isUpdating: boolean;
}

const NULL_PROFILE_ID_VALUE = "__NULL_PROFILE_ID__"; // Unique value for "None" option

const fetchProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error("Error fetching profiles for EditPlayerDialog:", error);
    throw new Error('Failed to fetch profiles');
  }
  return data || [];
};

const EditPlayerDialog: React.FC<EditPlayerDialogProps> = ({ player, isOpen, onOpenChange, onPlayerUpdate, isUpdating }) => {
  const { toast } = useToast();

  const { data: profiles, isLoading: profilesLoading } = useQuery<Profile[], Error>({
    queryKey: ['allProfilesForPlayerLink'], 
    queryFn: fetchProfiles,
    enabled: isOpen, 
  });

  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      summonerName: '',
      role: '',
      teamTag: '',
      linkedProfileId: undefined, // Stays undefined initially
    },
  });

  const { handleSubmit, control, reset, formState: { isSubmitting } } = form;

  useEffect(() => {
    if (player && isOpen) {
      reset({
        summonerName: player.summoner_name,
        role: player.role,
        teamTag: player.team_tag || '',
        linkedProfileId: player.linked_profile_id ?? undefined, // Use undefined for default state
      });
    }
  }, [player, isOpen, reset]);

  const onSubmit = (data: PlayerFormData) => {
    if (!player) return;
    try {
      const submissionData = {
        ...data,
        linkedProfileId: data.linkedProfileId || null,
      };
      onPlayerUpdate(submissionData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to prepare player data for update. Please try again.",
        variant: "destructive",
      });
      console.error("Error in EditPlayerDialog onSubmit:", error);
    }
  };

  if (!player) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(openStatus) => {
      onOpenChange(openStatus);
      if (!openStatus) {
        reset({ 
            summonerName: player?.summoner_name || '',
            role: player?.role || '',
            teamTag: player?.team_tag || '',
            linkedProfileId: player?.linked_profile_id ?? undefined,
        });
      }
    }}>
      <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground border border-border/50 shadow-lg">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-xl font-semibold text-foreground">Edit Player</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update the details for {player.summoner_name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={control}
              name="summonerName"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Summoner Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., ProGamer123" 
                      {...field} 
                      className="h-11 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Role</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Top, Mid, ADC" 
                      {...field} 
                      className="h-11 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="teamTag"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Team Tag (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., SSP" 
                      {...field} 
                      className="h-11 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="linkedProfileId"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Link to User (Optional)</FormLabel>
                  <Select
                     onValueChange={(selectedValue) => {
                      if (selectedValue === NULL_PROFILE_ID_VALUE) {
                        field.onChange(null);
                      } else {
                        field.onChange(selectedValue);
                      }
                    }}
                    value={field.value ?? NULL_PROFILE_ID_VALUE} // Use nullish coalescing
                    disabled={profilesLoading}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 bg-input border-border/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                        <SelectValue placeholder={profilesLoading ? "Loading users..." : "Select a user to link"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border/50 text-popover-foreground">
                      <SelectItem value={NULL_PROFILE_ID_VALUE} className="hover:bg-muted/50">None</SelectItem>
                      {profiles?.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id} className="hover:bg-muted/50">
                          {profile.full_name || profile.ign || profile.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-6 gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-10 px-6">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isUpdating || isSubmitting} className="h-10 px-6">
                {isUpdating || isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPlayerDialog;
