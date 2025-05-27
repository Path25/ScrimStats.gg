
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { scrimGameFormSchema, ScrimGameFormValues } from './schemas/scrimGameFormSchema';
import { Database, Constants } from '@/integrations/supabase/types';

type ScrimGameInsert = Database['public']['Tables']['scrim_games']['Insert'];
const gameResultOptions = Constants.public.Enums.game_result_enum;

interface AddScrimGameDialogProps {
  scrimId: string;
  onGameAdded?: () => void;
  children?: React.ReactNode; // For custom trigger
}

const AddScrimGameDialog: React.FC<AddScrimGameDialogProps> = ({ scrimId, onGameAdded, children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<ScrimGameFormValues>({
    resolver: zodResolver(scrimGameFormSchema),
    defaultValues: {
      game_number: 1, // Default to 1, or could be games.length + 1
      result: 'N/A',
      duration: '',
      blue_side_pick: '',
      red_side_pick: '',
      notes: '',
    },
  });

  const addScrimGameMutation = useMutation({
    mutationFn: async (values: ScrimGameFormValues) => {
      if (!user) throw new Error('User not authenticated');
      if (!scrimId) throw new Error('Scrim ID is missing');

      const gameData: ScrimGameInsert = {
        scrim_id: scrimId,
        user_id: user.id,
        game_number: values.game_number,
        result: values.result,
        duration: values.duration || null,
        blue_side_pick: values.blue_side_pick || null,
        red_side_pick: values.red_side_pick || null,
        notes: values.notes || null,
      };
      
      console.log("Attempting to insert scrim game:", gameData);

      const { data, error } = await supabase
        .from('scrim_games')
        .insert([gameData])
        .select()
        .single();

      if (error) {
        console.error("Error inserting scrim game:", error);
        throw error;
      }
      console.log("Scrim game inserted successfully:", data);
      return data;
    },
    onSuccess: () => {
      toast.success('Scrim game added successfully!');
      queryClient.invalidateQueries({ queryKey: ['scrimGames', scrimId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['scrimGames', scrimId] }); // Broader invalidation just in case
      if (onGameAdded) onGameAdded();
      setIsOpen(false); // Close dialog on success
      form.reset({ // Reset form, potentially increment game number
        game_number: form.getValues('game_number') + 1,
        result: 'N/A',
        duration: '',
        blue_side_pick: '',
        red_side_pick: '',
        notes: '',
      });
    },
    onError: (error) => {
      toast.error(`Failed to add scrim game: ${error.message}`);
    },
  });

  const onSubmit = (values: ScrimGameFormValues) => {
    console.log("Scrim game form submitted with values:", values);
    addScrimGameMutation.mutate(values);
  };

  // Determine the next game number
  React.useEffect(() => {
    const fetchGamesCount = async () => {
      if (!scrimId || !user?.id) return;
      const { count, error } = await supabase
        .from('scrim_games')
        .select('*', { count: 'exact', head: true })
        .eq('scrim_id', scrimId)
        .eq('user_id', user.id); // Or remove user_id if all team members see all games

      if (error) {
        console.error("Error fetching games count for default game number:", error);
        return;
      }
      form.reset({ ...form.formState.defaultValues, game_number: (count ?? 0) + 1 });
    };
    if(isOpen) { // Only fetch when dialog is about to open or is open
        fetchGamesCount();
    }
  }, [scrimId, user?.id, form, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Game
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground border border-border/50 shadow-lg">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-xl font-semibold text-foreground">Add New Game to Scrim</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Fill in the details for the new game. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="game_number"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Game Number</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 1" 
                      {...field} 
                      className="h-11 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="result"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Result</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 bg-input border-border/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                        <SelectValue placeholder="Select game result" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border/50 text-popover-foreground">
                      {gameResultOptions.map((res) => (
                        <SelectItem key={res} value={res} className="hover:bg-muted/50">
                          {res}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Duration (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., 35:20" 
                      {...field} 
                      value={field.value || ''} 
                      className="h-11 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="blue_side_pick"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Blue Side Pick (Example - Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Yasuo" 
                      {...field} 
                      value={field.value || ''} 
                      className="h-11 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="red_side_pick"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Red Side Pick (Example - Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Yone" 
                      {...field} 
                      value={field.value || ''} 
                      className="h-11 bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Game Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any specific notes for this game..." 
                      {...field} 
                      value={field.value || ''} 
                      className="min-h-[80px] bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6 gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-10 px-6" onClick={() => setIsOpen(false)}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={addScrimGameMutation.isPending} className="h-10 px-6">
                {addScrimGameMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Game...</>
                ) : (
                  'Save Game'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddScrimGameDialog;
