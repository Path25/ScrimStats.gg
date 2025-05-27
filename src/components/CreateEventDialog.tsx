
import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarEvent, EventType, EVENT_TYPES } from '@/types/event';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { eventFormSchema, EventFormData, DayOfWeek, DayOfWeekMap } from './schemas/eventFormSchema';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon as DatePickerIcon, ChevronDown } from 'lucide-react';
import { Calendar as ShadCalendar } from '@/components/ui/calendar'; // Renamed to avoid conflict
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';


interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // onSave will now pass the full EventFormData, including recurrence fields
  onSave: (event: EventFormData & { date: Date }) => void;
  selectedDate: Date | undefined;
  allowedEventTypes?: EventType[];
  initialEventType?: EventType;
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  allowedEventTypes,
  initialEventType,
}) => {
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      type: initialEventType || (allowedEventTypes && allowedEventTypes.length === 1 ? allowedEventTypes[0] : undefined),
      startTime: '',
      endTime: '',
      description: '',
      is_recurring: false,
      recurrence_days: [],
      series_end_date: '',
    },
  });

  const isRecurring = form.watch('is_recurring');

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: '',
        type: initialEventType || (allowedEventTypes && allowedEventTypes.length === 1 ? allowedEventTypes[0] : form.getValues().type || undefined),
        startTime: '',
        endTime: '',
        description: '',
        is_recurring: false,
        recurrence_days: [],
        series_end_date: '',
      });
      // Ensure series_end_date is cleared if is_recurring is false
      if (!form.getValues().is_recurring) {
        form.setValue('recurrence_days', []);
        form.setValue('series_end_date', undefined);
      }
    }
  }, [isOpen, form, initialEventType, allowedEventTypes]);

  const onSubmit = (data: EventFormData) => {
    if (!selectedDate) {
      toast({
        title: "Error Creating Event",
        description: "A date must be selected to create an event.",
        variant: "destructive",
      });
      return;
    }
    
    const payload = { ...data, date: selectedDate };

    if (data.is_recurring) {
      if ((!data.recurrence_days || data.recurrence_days.length === 0)) {
         form.setError('recurrence_days', { type: 'manual', message: 'Recurrence days are required.' });
      }
      if (!data.series_end_date) {
        form.setError('series_end_date', { type: 'manual', message: 'Series end date is required.' });
      }
      if (data.series_end_date && selectedDate && new Date(data.series_end_date) < selectedDate) {
        form.setError('series_end_date', { type: 'manual', message: 'Series end date cannot be before the event start date.' });
      }
       if (form.formState.errors.recurrence_days || form.formState.errors.series_end_date) {
        return;
      }
    }


    onSave(payload);
    onClose();
  };
  
  const displayableEventTypes = useMemo(() => {
    if (allowedEventTypes) {
      return EVENT_TYPES.filter(et => allowedEventTypes.includes(et));
    }
    return EVENT_TYPES.filter(et => et !== 'scrim');
  }, [allowedEventTypes]);

  useEffect(() => {
    if (initialEventType && displayableEventTypes.includes(initialEventType)) {
      form.setValue('type', initialEventType);
    } else if (displayableEventTypes.length === 1) {
      form.setValue('type', displayableEventTypes[0]);
    }
  }, [initialEventType, displayableEventTypes, form, isOpen]);

  if (!selectedDate && isOpen) {
      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[480px] bg-card border border-border/50 shadow-lg">
            <DialogHeader className="space-y-3 pb-6">
              <DialogTitle className="text-xl font-semibold text-foreground">Create New Event</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Please select a date on the calendar first to create an event.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button variant="outline" onClick={onClose} className="h-10 px-6">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
  }
  
  if (!selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border border-border/50 shadow-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-xl font-semibold text-foreground">Create New Event</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add details for your event on {selectedDate.toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Title</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="h-11 bg-input border-border/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    defaultValue={field.value}
                    disabled={displayableEventTypes.length === 1 && !!initialEventType}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 bg-input border-border/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border/50 text-popover-foreground">
                      {displayableEventTypes.map((eventType) => (
                        <SelectItem key={eventType} value={eventType} className="capitalize hover:bg-muted/50">
                          {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
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
              name="startTime"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Start Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="time" 
                      {...field} 
                      value={field.value || ''} 
                      className="h-11 bg-input border-border/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">End Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="time" 
                      {...field} 
                      value={field.value || ''} 
                      className="h-11 bg-input border-border/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      className="min-h-[80px] bg-input border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      placeholder="Optional event details..."
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            {/* Recurrence Fields */}
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (!checked) {
                            form.setValue('recurrence_days', []);
                            form.setValue('series_end_date', undefined);
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-medium text-foreground cursor-pointer">Recurring Event</FormLabel>
                  </div>
                  <FormMessage className="text-xs text-destructive" />
                </FormItem>
              )}
            />

            {isRecurring && (
              <>
                <FormField
                  control={form.control}
                  name="recurrence_days"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-medium text-foreground">Repeat on</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(DayOfWeekMap) as DayOfWeek[]).map((day) => (
                          <Button
                            type="button"
                            key={day}
                            variant={field.value?.includes(day) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const currentDays = field.value || [];
                              const newDays = currentDays.includes(day)
                                ? currentDays.filter(d => d !== day)
                                : [...currentDays, day];
                              field.onChange(newDays);
                            }}
                            className="px-3 py-1 h-auto"
                          >
                            {DayOfWeekMap[day]}
                          </Button>
                        ))}
                      </div>
                      <FormMessage className="text-xs text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="series_end_date"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-medium text-foreground">Ends on</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal h-11 bg-input border-border/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-colors",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <DatePickerIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover border-border/50" align="start">
                          <ShadCalendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)}
                            disabled={(date) => selectedDate ? date < selectedDate : false }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="text-xs text-destructive" />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter className="pt-6 gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-10 px-6">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting} className="h-10 px-6">Save Event</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
