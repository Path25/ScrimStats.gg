import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, CalendarIcon, ClockIcon } from 'lucide-react';
import { RRule, RRuleSet, rrulestr, Options as RRuleOptions } from 'rrule';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { format, parseISO, set } from 'date-fns';

import { scrimFormSchema, ScrimFormValues, DayOfWeekMap } from './schemas/scrimFormSchema';
import { Constants, Database, TablesInsert, Enums } from '@/integrations/supabase/types';

type ScrimInsert = TablesInsert<'scrims'>;
type ScrimGameInsert = TablesInsert<'scrim_games'>;
type ScrimRecurrenceRuleInsert = TablesInsert<'scrim_recurrence_rules'>;
type ScrimStatusEnum = Database['public']['Enums']['scrim_status_enum'];
type GameResultEnum = Enums<'game_result_enum'>;

const scrimStatusOptions = Constants.public.Enums.scrim_status_enum;
const weekDayKeys = Object.keys(DayOfWeekMap) as (keyof typeof DayOfWeekMap)[];

// Mapping for RRule weekdays
const rruleWeekdays = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

interface AddScrimDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialDate?: Date;
}

const AddScrimDialog: React.FC<AddScrimDialogProps> = ({ isOpen, onOpenChange, initialDate }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<ScrimFormValues>({
    resolver: zodResolver(scrimFormSchema),
    defaultValues: {
      opponent: '',
      // Use initialDate if provided, otherwise today's date
      scrim_date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      start_time: '', // Default start time
      patch: '',
      status: 'Scheduled',
      notes: '',
      number_of_games: undefined, // Added
      is_recurring: false,
      recurrence_days: [],
      series_end_date: '',
    },
  });

  // Effect to reset form when dialog opens or initialDate changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        opponent: '',
        scrim_date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        start_time: '', // Reset start time
        patch: '',
        status: 'Scheduled',
        notes: '',
        number_of_games: undefined, // Added for reset
        is_recurring: false,
        recurrence_days: [],
        series_end_date: initialDate 
          ? format(new Date(new Date(initialDate).setDate(initialDate.getDate() + 7)), 'yyyy-MM-dd') // Default series end date 1 week later
          : format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
      });
    }
  }, [isOpen, initialDate, form]);

  const isRecurring = form.watch('is_recurring');

  const addScrimMutation = useMutation({
    mutationFn: async (values: ScrimFormValues) => {
      if (!user) throw new Error('User not authenticated');

      const createGameStubs = async (scrimId: string, numberOfGames: number | undefined) => {
        if (!numberOfGames || numberOfGames <= 0) return;

        const gameStubs: ScrimGameInsert[] = [];
        for (let i = 1; i <= numberOfGames; i++) {
          gameStubs.push({
            scrim_id: scrimId,
            user_id: user.id,
            game_number: i,
            result: 'N/A' as GameResultEnum,
          });
        }
        if (gameStubs.length > 0) {
          const { error: gamesError } = await supabase.from('scrim_games').insert(gameStubs);
          if (gamesError) {
            console.error(`Error inserting game stubs for scrim ${scrimId}:`, gamesError);
            toast.error(`Scrim created/updated, but failed to add initial games: ${gamesError.message}`);
          } else {
            queryClient.invalidateQueries({ queryKey: ['scrimGames', scrimId] });
          }
        }
      };
      
      const createMultipleGameStubs = async (scrimInstances: {id: string}[], numberOfGames: number | undefined) => {
        if (!numberOfGames || numberOfGames <= 0 || !scrimInstances || scrimInstances.length === 0) return;

        const allGameStubs: ScrimGameInsert[] = [];
        scrimInstances.forEach(instance => {
          for (let i = 1; i <= numberOfGames; i++) {
            allGameStubs.push({
              scrim_id: instance.id,
              user_id: user.id,
              game_number: i,
              result: 'N/A' as GameResultEnum,
            });
          }
        });

        if (allGameStubs.length > 0) {
          const { error: gamesError } = await supabase.from('scrim_games').insert(allGameStubs);
          if (gamesError) {
            console.error("Error inserting game stubs for recurring scrims:", gamesError);
            toast.error(`Recurring scrims created, but failed to add initial games: ${gamesError.message}`);
          } else {
            scrimInstances.forEach(instance => {
              queryClient.invalidateQueries({ queryKey: ['scrimGames', instance.id] });
            });
          }
        }
      };

      if (values.is_recurring && values.recurrence_days && values.recurrence_days.length > 0 && values.series_end_date) {
        // Handle recurring scrim
        // Corrected type for rruleOptions to use aliased RRuleOptions
        const rruleOptions: Partial<RRuleOptions> = { 
          freq: RRule.WEEKLY,
          dtstart: new Date(values.scrim_date + `T${values.start_time || '00:00:00'}`),
          until: new Date(values.series_end_date + 'T23:59:59'),
          // byweekday is already using the corrected rruleWeekdays map
          byweekday: values.recurrence_days.map(day => rruleWeekdays[day as keyof typeof rruleWeekdays]),
        };
        const rule = new RRule(rruleOptions);
        const rruleString = rule.toString();

        const recurrenceRuleData: Omit<ScrimRecurrenceRuleInsert, 'id' | 'created_at' | 'updated_at'> = {
          user_id: user.id,
          opponent: values.opponent,
          start_time_template: values.start_time || null,
          patch_template: values.patch || null,
          notes_template: values.notes || null,
          rrule_string: rruleString,
          series_start_date: values.scrim_date,
          series_end_date: values.series_end_date,
        };
        
        console.log("Attempting to insert recurrence rule:", recurrenceRuleData);
        const { data: ruleData, error: ruleError } = await supabase
          .from('scrim_recurrence_rules')
          .insert(recurrenceRuleData)
          .select()
          .single();

        if (ruleError) {
          console.error("Error inserting recurrence rule:", ruleError);
          throw ruleError;
        }
        console.log("Recurrence rule inserted:", ruleData);

        const allDates = rule.all();
        const scrimInstances: ScrimInsert[] = allDates.map(dateInstance => ({
          opponent: values.opponent,
          scrim_date: format(dateInstance, 'yyyy-MM-dd'),
          start_time: values.start_time || null,
          status: 'Scheduled' as ScrimStatusEnum, // All recurring instances are scheduled by default
          patch: values.patch || null,
          notes: values.notes || null, // Could also use notes_template from rule here
          user_id: user.id,
          recurrence_rule_id: ruleData.id,
        }));

        if (scrimInstances.length === 0) {
            toast.info("No scrim instances generated based on the recurrence rule. Check dates and days.");
            // Potentially don't close dialog here, or provide more feedback
            return { rule: ruleData, instances: [] };
        }

        console.log(`Attempting to insert ${scrimInstances.length} scrim instances:`, scrimInstances);
        const { data: instancesData, error: instancesError } = await supabase
          .from('scrims')
          .insert(scrimInstances)
          .select();

        if (instancesError) {
          console.error("Error inserting scrim instances:", instancesError);
          // Attempt to delete the rule if instances fail? Or let user handle.
          throw instancesError;
        }
        console.log("Scrim instances inserted successfully:", instancesData);

        // Create game stubs for recurring instances
        if (instancesData) { // Ensure instancesData is not null
            await createMultipleGameStubs(instancesData, values.number_of_games);
        }
        return { rule: ruleData, instances: instancesData || [] }; // Ensure instances is always an array

      } else {
        // Handle single scrim
        const scrimData: ScrimInsert = {
          opponent: values.opponent,
          scrim_date: values.scrim_date,
          start_time: values.start_time || null,
          status: values.status as ScrimStatusEnum,
          patch: values.patch || null,
          notes: values.notes || null,
          user_id: user.id,
        };
        
        console.log("Attempting to insert single scrim:", scrimData);
        const { data, error } = await supabase
          .from('scrims')
          .insert([scrimData])
          .select()
          .single();

        if (error) {
          console.error("Error inserting single scrim:", error);
          throw error;
        }
        console.log("Single scrim inserted successfully:", data);
        
        // Create game stubs for single scrim
        if (data) { // Ensure data is not null
            await createGameStubs(data.id, values.number_of_games);
        }
        return { rule: null, instances: data ? [data] : [] }; // Ensure instances is always an array
      }
    },
    onSuccess: (data) => {
      const message = data.rule 
        ? `Recurring scrim series vs ${data.rule.opponent} added with ${data.instances.length} instances!`
        : `Scrim added successfully!`;
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['scrims'] }); 
      queryClient.invalidateQueries({ queryKey: ['scrimCalendarEvents'] });
      // We might need a query key for 'scrimRecurrenceRules' if we display them elsewhere
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to add scrim: ${error.message}`);
    },
  });

  const onSubmit = (values: ScrimFormValues) => {
    console.log("Form submitted with values:", values);
    // Ensure recurrence_days is an empty array if not recurring, or if it's undefined/null
    const processedValues = {
      ...values,
      recurrence_days: values.is_recurring && values.recurrence_days ? values.recurrence_days : [],
      series_end_date: values.is_recurring ? values.series_end_date : undefined,
    };
    addScrimMutation.mutate(processedValues);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Add New Scrim</DialogTitle>
          <DialogDescription>
            Fill in the details for the new scrim. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="opponent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opponent</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Team Liquid" {...field} className="bg-input text-foreground placeholder-muted-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scrim_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date (or Series Start Date)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal bg-input hover:bg-input/90 text-foreground",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value + 'T00:00:00'), "PPP") // Ensure date is parsed correctly
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                          initialFocus
                          defaultMonth={field.value ? new Date(field.value + 'T00:00:00') : (initialDate ? initialDate : new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Time (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="time" 
                          {...field} 
                          value={field.value || ''} 
                          className="bg-input text-foreground placeholder-muted-foreground w-full pr-8" 
                        />
                        <ClockIcon className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patch (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 15.10" {...field} value={field.value || ''} className="bg-input text-foreground placeholder-muted-foreground"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="number_of_games"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Games (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="e.g., 3" 
                        {...field} 
                        value={field.value === undefined ? '' : field.value} // Handle undefined for input display
                        onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                        min="1"
                        className="bg-input text-foreground placeholder-muted-foreground"
                      />
                    </FormControl>
                    <FormDescription>
                      If provided, placeholder games will be created.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isRecurring} // Recurring scrims always 'Scheduled' initially
                  >
                    <FormControl>
                      <SelectTrigger className="bg-input text-foreground">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {scrimStatusOptions.map((status) => (
                        <SelectItem key={status} value={status} disabled={isRecurring && status !== 'Scheduled'}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isRecurring && <p className="text-xs text-muted-foreground mt-1">Recurring scrims are initially set to 'Scheduled'.</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Recurring Scrim</FormLabel>
                    <FormDescription>
                      Schedule this scrim to repeat automatically.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) {
                          // When enabling recurring, set status to 'Scheduled'
                          form.setValue('status', 'Scheduled' as ScrimStatusEnum);
                          // Optionally set a default series_end_date if not already set
                          if (!form.getValues('series_end_date')) {
                            const currentScrimDate = form.getValues('scrim_date');
                            const defaultEndDate = currentScrimDate 
                              ? format(new Date(new Date(currentScrimDate).setDate(new Date(currentScrimDate).getDate() + 28)), 'yyyy-MM-dd') // e.g., 4 weeks later
                              : format(new Date(new Date().setDate(new Date().getDate() + 28)), 'yyyy-MM-dd');
                            form.setValue('series_end_date', defaultEndDate);
                          }
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isRecurring && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                <h4 className="text-sm font-medium text-foreground">Recurrence Settings</h4>
                <FormField
                  control={form.control}
                  name="recurrence_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeats Weekly On</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="multiple"
                          variant="outline"
                          value={field.value || []} // Ensure value is an array
                          onValueChange={field.onChange}
                          className="flex flex-wrap gap-1"
                        >
                          {Object.keys(DayOfWeekMap).map((day) => (
                            <ToggleGroupItem key={day} value={day} aria-label={`Toggle ${DayOfWeekMap[day as keyof typeof DayOfWeekMap]}`}>
                              {DayOfWeekMap[day as keyof typeof DayOfWeekMap]}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="series_end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Series End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal bg-input hover:bg-input/90 text-foreground",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value + 'T00:00:00'), "PPP")
                              ) : (
                                <span>Pick series end date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                            // Ensure default month makes sense, e.g., start from scrim_date or current series_end_date
                            defaultMonth={field.value ? new Date(field.value + 'T00:00:00') : new Date(form.getValues('scrim_date'))}
                            fromDate={new Date(form.getValues('scrim_date'))} // Series must end after it starts
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any overall notes for this scrim or series..." {...field} value={field.value || ''} className="bg-input text-foreground placeholder-muted-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={addScrimMutation.isPending}>
                {addScrimMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  'Save Scrim'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddScrimDialog;
