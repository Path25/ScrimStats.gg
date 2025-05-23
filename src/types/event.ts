
export const EVENT_TYPES = ['scrim', 'theory', 'official', 'meeting', 'other'] as const;
export type EventType = typeof EVENT_TYPES[number];

export interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  type: EventType;
  startTime?: string;
  endTime?: string;
  description?: string;
}
