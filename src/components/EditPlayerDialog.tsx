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
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground scrim-card">
        <DialogHeader>
          <DialogTitle>Edit Player</DialogTitle>
          <DialogDescription>
            Update the details for {player.summoner_name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="summonerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summoner Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ProGamer123" {...field} className="bg-input text-foreground placeholder:text-muted-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Top, Mid, ADC" {...field} className="bg-input text-foreground placeholder:text-muted-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="teamTag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Tag (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SSP" {...field} className="bg-input text-foreground placeholder:text-muted-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="linkedProfileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to User (Optional)</FormLabel>
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
                      <SelectTrigger className="bg-input text-foreground">
                        <SelectValue placeholder={profilesLoading ? "Loading users..." : "Select a user to link"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover text-popover-foreground">
                      <SelectItem value={NULL_PROFILE_ID_VALUE}>None</SelectItem>
                      {profiles?.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || profile.ign || profile.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isUpdating || isSubmitting}>
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
