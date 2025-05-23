import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent, EventType } from '@/types/event';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export const fetchScrimsAsCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("User not authenticated, cannot fetch scrims for calendar");
    return [];
  }

  const { data: scrims, error } = await supabase
    .from('scrims')
    .select('id, scrim_date, start_time, opponent, notes, status') // Added start_time
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching scrims for calendar:', error);
    throw error;
  }

  if (!scrims) {
    return [];
  }

  return scrims.map((scrim) => ({ // Ensure scrim type is inferred correctly or use Tables<'scrims'>
    id: scrim.id,
    date: new Date(scrim.scrim_date + 'T00:00:00'),
    title: `Scrim vs ${scrim.opponent || 'Unknown'}`,
    type: 'scrim' as EventType, // Explicitly cast to EventType
    description: scrim.notes || undefined,
    startTime: scrim.start_time || undefined, // Added startTime
    // endTime is not available in the scrims table currently
  }));
};

export const fetchGeneralCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("User not authenticated, cannot fetch general calendar events");
    return [];
  }

  const { data: generalEvents, error } = await supabase
    .from('calendar_events')
    .select('id, event_date, title, type, start_time, end_time, description')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching general calendar events:', error);
    throw error;
  }

  if (!generalEvents) {
    return [];
  }

  return generalEvents.map((event: Tables<'calendar_events'>) => ({
    id: event.id,
    date: new Date(event.event_date + 'T00:00:00'), 
    title: event.title,
    type: event.type as EventType, 
    startTime: event.start_time || undefined,
    endTime: event.end_time || undefined,
    description: event.description || undefined,
  }));
};

export type AddCalendarEventPayload = Omit<TablesInsert<'calendar_events'>, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { user_id?: string };

export const addCalendarEvent = async (eventData: AddCalendarEventPayload) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const payload: TablesInsert<'calendar_events'> = {
    ...eventData,
    user_id: user.id,
    event_date: eventData.event_date, 
  };
  
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error adding calendar event:', error);
    throw error;
  }
  return data;
};
