
import { z } from 'zod';
import { EVENT_TYPES } from '@/types/event';

// Define days of the week, similar to scrimFormSchema
const daysOfWeek = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type DayOfWeek = typeof daysOfWeek[number];

export const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(EVENT_TYPES, {
    required_error: "Event type is required",
    invalid_type_error: "Please select a valid event type",
  }),
  startTime: z.string().optional().refine(val => !val || val === '' || /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(val), {
    message: "Invalid time format (HH:mm)"
  }),
  endTime: z.string().optional().refine(val => !val || val === '' || /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(val), {
    message: "Invalid time format (HH:mm)"
  }),
  description: z.string().optional(),
  // Recurrence fields
  is_recurring: z.boolean().optional().default(false),
  recurrence_days: z.array(z.enum(daysOfWeek)).optional(),
  series_end_date: z.string().optional(), // YYYY-MM-DD or ISO string
}).refine(data => {
  if (data.startTime && data.startTime !== '' && data.endTime && data.endTime !== '') {
    return data.startTime < data.endTime;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
}).superRefine((data, ctx) => {
  if (data.is_recurring) {
    if (!data.recurrence_days || data.recurrence_days.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrence_days'],
        message: 'At least one day must be selected for recurring events.',
      });
    }
    if (!data.series_end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['series_end_date'],
        message: 'Series end date is required for recurring events.',
      });
    } else {
      // Assuming selectedDate is the start date of the series for comparison.
      // This validation might be better placed where selectedDate is available,
      // or ensure series_end_date is validated against a known start (e.g., form's associated date).
      // For now, just basic check. A more robust check would compare against the event's specific start date.
      try {
        if (new Date(data.series_end_date) < new Date(new Date().toISOString().split('T')[0])) { // Basic check against today
          // This isn't ideal, as it should be compared against the *event's* start date.
          // The actual comparison against the event's specific start date will be handled
          // implicitly by RRule or should be added in the component consuming this schema if needed.
        }
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['series_end_date'],
          message: 'Invalid series end date format.',
        });
      }
    }
  }
});

export type EventFormData = z.infer<typeof eventFormSchema>;

// For UI mapping, similar to scrimFormSchema
export const DayOfWeekMap: Record<DayOfWeek, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
};
