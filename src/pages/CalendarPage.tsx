import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import AddScrimDialog from '@/components/AddScrimDialog';
import CreateEventDialog from '@/components/CreateEventDialog';
import { CalendarEvent, EventType } from '@/types/event';
import { PlusCircle, CalendarPlus, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchScrimsAsCalendarEvents, fetchGeneralCalendarEvents, addCalendarEvent, AddCalendarEventPayload } from '@/integrations/supabase/queries/calendarQueries';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
// Import RRule components, ensure Options is aliased and constants are accessed via RRule
import { RRule, RRuleSet, rrulestr, Weekday, Options as RRuleOptions } from 'rrule'; 
import { EventFormData, DayOfWeek as FormDayOfWeek } from '@/components/schemas/eventFormSchema'; // Import EventFormData

// Mapping from form DayOfWeek (MO, TU, etc.) to RRule.Weekday using RRule properties
const rruleWeekdaysMap: Record<FormDayOfWeek, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

const eventTypeVisualsMap: Record<EventType, { borderColorClass: string, badgeBgClass: string, badgeTextColorClass: string, icon?: React.ElementType }> = {
  scrim: {
    borderColorClass: 'border-purple-500',
    badgeBgClass: 'bg-purple-500',
    badgeTextColorClass: 'text-purple-50',
  },
  theory: {
    borderColorClass: 'border-sky-500',
    badgeBgClass: 'bg-sky-500',
    badgeTextColorClass: 'text-sky-50',
  },
  official: {
    borderColorClass: 'border-amber-500',
    badgeBgClass: 'bg-amber-500',
    badgeTextColorClass: 'text-amber-50',
    icon: ShieldCheck,
  },
  meeting: {
    borderColorClass: 'border-emerald-500',
    badgeBgClass: 'bg-emerald-500',
    badgeTextColorClass: 'text-emerald-50',
  },
  other: {
    borderColorClass: 'border-slate-500',
    badgeBgClass: 'bg-slate-500',
    badgeTextColorClass: 'text-slate-50',
  },
};

const GENERAL_EVENT_TYPES_TO_CREATE: EventType[] = ['meeting', 'theory', 'other'];
const OFFICIAL_EVENT_TYPE: EventType[] = ['official'];

const CalendarPage: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isAddScrimDialogOpen, setIsAddScrimDialogOpen] = useState(false);
  const [isCreateGeneralEventDialogOpen, setIsCreateGeneralEventDialogOpen] = useState(false);
  const [isAddOfficialDialogOpen, setIsAddOfficialDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: scrimEvents = [], isLoading: isLoadingScrims, error: errorScrims } = useQuery<CalendarEvent[]>({
    queryKey: ['scrimCalendarEvents'],
    queryFn: fetchScrimsAsCalendarEvents,
  });

  const { data: generalEvents = [], isLoading: isLoadingGeneral, error: errorGeneral } = useQuery<CalendarEvent[]>({
    queryKey: ['generalCalendarEvents'],
    queryFn: fetchGeneralCalendarEvents,
  });
  
  const isLoading = isLoadingScrims || isLoadingGeneral;
  const queryError = errorScrims || errorGeneral;

  const allEvents = useMemo(() => {
    return [...scrimEvents, ...generalEvents].sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) {
        return a.date.getTime() - b.date.getTime();
      }
      if (a.startTime && b.startTime) {
        if(a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      } else if (a.startTime) {
        return -1; 
      } else if (b.startTime) {
        return 1; 
      }
      return a.title.localeCompare(b.title);
    });
  }, [scrimEvents, generalEvents]);

  const eventDays = useMemo(() => allEvents.map(e => e.date), [allEvents]);
  const modifiers = { hasEvent: eventDays };
  const modifiersClassNames = { hasEvent: 'day-has-event' };

  const selectedDayEvents = useMemo(() => {
    if (!date) return [];
    return allEvents.filter(
      (event) => event.date.toDateString() === date.toDateString()
    );
  }, [date, allEvents]);

  const addGeneralEventMutation = useMutation({
    mutationFn: addCalendarEvent,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['generalCalendarEvents'] });
    },
    onError: (error, variables, context) => {
      toast({ title: "Error Creating Sub-Event", description: `Failed to create an instance: ${error.message}`, variant: "destructive" });
    },
  });

  const handleSaveGeneralEvent = (eventData: EventFormData & { date: Date }) => {
    if (!eventData.date) {
        toast({ title: "Error", description: "Date is missing for the event.", variant: "destructive"});
        return;
    }
    const typeForDb = eventData.type as 'official' | 'meeting' | 'theory' | 'other';
    if (!['official', 'meeting', 'theory', 'other'].includes(typeForDb)) {
        toast({ title: "Error", description: `Event type "${eventData.type}" is not valid for general events.`, variant: "destructive"});
        return;
    }

    if (eventData.is_recurring && eventData.recurrence_days && eventData.recurrence_days.length > 0 && eventData.series_end_date) {
      // Use RRuleOptions and RRule.WEEKLY
      const rruleOptions: Partial<RRuleOptions> = {
        freq: RRule.WEEKLY, // Use RRule.WEEKLY
        dtstart: eventData.date, 
        until: parseISO(eventData.series_end_date + 'T23:59:59.999Z'), 
        byweekday: eventData.recurrence_days.map(day => rruleWeekdaysMap[day as FormDayOfWeek]),
      };
      const rule = new RRule(rruleOptions);
      const dates = rule.all();
      
      let successCount = 0;
      let failCount = 0;

      dates.forEach(occurrenceDate => {
        const payload: AddCalendarEventPayload = {
          event_date: format(occurrenceDate, 'yyyy-MM-dd'),
          title: eventData.title,
          type: typeForDb,
          start_time: eventData.startTime || null,
          end_time: eventData.endTime || null,
          description: eventData.description || null,
        } as unknown as AddCalendarEventPayload; 
        
        try {
          addGeneralEventMutation.mutate(payload);
          successCount++;
        } catch (e) {
          failCount++;
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ['generalCalendarEvents'] });

      if (successCount > 0) {
        toast({ title: "Recurring Event Processing", description: `${successCount} event instance(s) scheduled for creation. Check calendar for updates.`});
      }
      if (failCount > 0) {
         toast({ title: "Recurring Event Creation Issue", description: `${failCount} event instance(s) failed to create.`, variant: "destructive"});
      }
       if (successCount === 0 && failCount === 0 && dates.length > 0) {
        toast({ title: "Recurring Event Info", description: "No event instances were generated by the recurrence rule.", variant: "default"});
      } else if (dates.length === 0) {
         toast({ title: "Recurring Event Info", description: "No dates matched the recurrence criteria.", variant: "default"});
      }

    } else {
      // Single event creation
      const payload: AddCalendarEventPayload = {
        event_date: format(eventData.date, 'yyyy-MM-dd'),
        title: eventData.title,
        type: typeForDb,
        start_time: eventData.startTime || null,
        end_time: eventData.endTime || null,
        description: eventData.description || null,
      } as unknown as AddCalendarEventPayload; 
      
      addGeneralEventMutation.mutate(payload, {
        onSuccess: () => {
           toast({ title: "Event Created", description: "Your new event has been added to the calendar." });
        },
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="scrim-card md:col-span-2 min-h-[500px]">
            <CardHeader>
              <CardTitle>Event Calendar</CardTitle>
              <CardDescription>Select a day to view or add events.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-start pt-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border bg-popover text-popover-foreground"
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
              />
              <div className="mt-4 w-full max-w-md text-center space-y-2">
                {date && (
                  <>
                    <Button 
                      onClick={() => setIsAddScrimDialogOpen(true)} 
                      className="w-full"
                      variant="outline"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Scrim for {date.toLocaleDateString()}
                    </Button>
                    <Button 
                      onClick={() => setIsAddOfficialDialogOpen(true)} 
                      className="w-full font-semibold border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                      variant="outline"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" /> 
                      Add Official Event for {date.toLocaleDateString()}
                    </Button>
                    <Button 
                      onClick={() => setIsCreateGeneralEventDialogOpen(true)} 
                      className="w-full"
                      variant="outline"
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Add General Event for {date.toLocaleDateString()}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="scrim-card md:col-span-1 min-h-[500px]">
            <CardHeader>
              <CardTitle>
                Events for {date ? date.toLocaleDateString() : 'Selected Date'}
              </CardTitle>
              {!date && <CardDescription>Select a date to see events.</CardDescription>}
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              )}
              {queryError && <p className="text-destructive">Error loading events: {queryError.message}. Please try again.</p>}
              {!isLoading && !queryError && date && selectedDayEvents.length > 0 ? (
                <ul className="space-y-4">
                  {selectedDayEvents.map((event) => {
                    const visuals = eventTypeVisualsMap[event.type];
                    const EventIcon = visuals?.icon;
                    const isOfficial = event.type === 'official';

                    return (
                      <li 
                        key={event.id} 
                        className={cn(
                          "p-4 rounded-md border shadow-sm bg-card",
                          visuals?.borderColorClass,
                          isOfficial ? 'border-l-[6px]' : 'border-l-4',
                          isOfficial && 'bg-amber-50/50 dark:bg-amber-900/20'
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            {EventIcon && <EventIcon className={cn("h-5 w-5", isOfficial ? "text-amber-600" : "text-muted-foreground")} />}
                            <h4 className={cn(
                              "text-foreground text-base",
                              isOfficial ? "font-bold text-amber-700 dark:text-amber-400" : "font-semibold"
                            )}>{event.title}</h4>
                          </div>
                          {visuals && (
                            <Badge
                              className={cn(
                                visuals.badgeBgClass,
                                visuals.badgeTextColorClass,
                                "capitalize text-xs font-medium"
                              )}
                            >
                              {event.type}
                            </Badge>
                          )}
                        </div>
                        
                        {(event.startTime) && (
                          <p className="text-sm text-muted-foreground mb-1">
                            Time: {event.startTime}
                            {event.endTime && ` - ${event.endTime}`}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : !isLoading && !queryError && date ? (
                <p className="text-muted-foreground">No events scheduled for this date.</p>
              ) : !isLoading && !queryError && !date ? (
                <p className="text-muted-foreground">Select a date on the calendar to view and add events.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <AddScrimDialog
          isOpen={isAddScrimDialogOpen}
          onOpenChange={setIsAddScrimDialogOpen}
          initialDate={date}
        />
        <CreateEventDialog 
          isOpen={isCreateGeneralEventDialogOpen}
          onClose={() => setIsCreateGeneralEventDialogOpen(false)}
          onSave={handleSaveGeneralEvent}
          selectedDate={date}
          allowedEventTypes={GENERAL_EVENT_TYPES_TO_CREATE}
        />
        <CreateEventDialog 
          isOpen={isAddOfficialDialogOpen}
          onClose={() => setIsAddOfficialDialogOpen(false)}
          onSave={handleSaveGeneralEvent}
          selectedDate={date}
          allowedEventTypes={OFFICIAL_EVENT_TYPE}
          initialEventType={'official'}
        />
      </div>
    </Layout>
  );
};

export default CalendarPage;
