
import { supabase } from '../client';
import { CalendarEvent } from '@/types/event';
import { TablesInsert } from '@/integrations/supabase/types';

export const fetchScrimsAsCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase
    .from('scrims')
    .select('id, opponent, scrim_date, start_time, status')
    .neq('status', 'Cancelled') // Filter out cancelled scrims
    .order('scrim_date', { ascending: true });

  if (error) {
    console.error('Error fetching scrims for calendar:', error);
    throw new Error(`Failed to fetch scrims: ${error.message}`);
  }

  return (data || []).map(scrim => ({
    id: scrim.id,
    title: `vs ${scrim.opponent}`,
    date: new Date(scrim.scrim_date),
    startTime: scrim.start_time || undefined,
    type: 'scrim' as const,
    description: `Scrim against ${scrim.opponent}`,
  }));
};

export const fetchGeneralCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Error fetching general calendar events:', error);
    throw new Error(`Failed to fetch calendar events: ${error.message}`);
  }

  return (data || []).map(event => ({
    id: event.id,
    title: event.title,
    date: new Date(event.event_date),
    startTime: event.start_time || undefined,
    endTime: event.end_time || undefined,
    type: event.type as 'official' | 'meeting' | 'theory' | 'other',
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
