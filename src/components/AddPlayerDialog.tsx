import React, { useState } from 'react';
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
  DialogTrigger,
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

// Define the Zod schema for player form validation
const playerSchema = z.object({
  summonerName: z.string().min(3, { message: "Summoner Name must be at least 3 characters." }).max(50),
  role: z.string().min(2, { message: "Role must be at least 2 characters." }).max(20),
  teamTag: z.string().min(2, { message: "Team Tag must be at least 2 characters." }).max(10),
  linkedProfileId: z.string().optional().nullable(), // Optional: can be empty string, undefined or null
});

export type PlayerFormData = z.infer<typeof playerSchema>;

interface AddPlayerDialogProps {
  onPlayerAdd: (player: PlayerFormData) => void;
  children: React.ReactNode; // This will be the trigger button
}

const NULL_PROFILE_ID_VALUE = "__NULL_PROFILE_ID__"; // Unique value for "None" option

const fetchProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error("Error fetching profiles for AddPlayerDialog:", error);
    throw new Error('Failed to fetch profiles');
  }
  return data || [];
};

const AddPlayerDialog: React.FC<AddPlayerDialogProps> = ({ onPlayerAdd, children }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: profiles, isLoading: profilesLoading } = useQuery<Profile[], Error>({
    queryKey: ['allProfilesForPlayerLink'],
    queryFn: fetchProfiles,
    enabled: open, // Only fetch when dialog is open
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

  const { handleSubmit, control, formState: { isSubmitting }, reset } = form;

  const onSubmit = (data: PlayerFormData) => {
    try {
      const submissionData = {
        ...data,
        linkedProfileId: data.linkedProfileId || null,
      };
      onPlayerAdd(submissionData);
      reset();
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to prepare player data. Please try again.",
        variant: "destructive",
      });
      console.error("Error in AddPlayerDialog onSubmit:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        reset(); 
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground scrim-card">
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new player to your roster.
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
                  <FormLabel>Team Tag</FormLabel>
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
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Player"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlayerDialog;
