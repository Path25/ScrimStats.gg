
import { z } from 'zod';
import { Constants } from '@/integrations/supabase/types'; // Import constants for enums

const scrimStatusEnumValues = Constants.public.Enums.scrim_status_enum;
const daysOfWeek = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

export const scrimFormSchema = z.object({
  opponent: z.string().min(1, { message: "Opponent name is required." }),
  scrim_date: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: "Invalid date format. Please use YYYY-MM-DD.",
  }),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:MM.").optional().or(z.literal('')),
  patch: z.string().optional(),
  status: z.enum(scrimStatusEnumValues).default('Scheduled'),
  notes: z.string().optional(),
  number_of_games: z.number().int().positive({ message: "Number of games must be a positive integer."}).min(1).optional(), // New field
  // Recurrence fields
  is_recurring: z.boolean().optional().default(false),
  recurrence_days: z.array(z.enum(daysOfWeek)).optional(), // e.g., ['MO', 'WE']
  series_end_date: z.string().optional(), // YYYY-MM-DD
}).superRefine((data, ctx) => {
  if (data.is_recurring) {
    if (!data.recurrence_days || data.recurrence_days.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrence_days'],
        message: 'At least one day must be selected for recurring scrims.',
      });
    }
    if (!data.series_end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['series_end_date'],
        message: 'Series end date is required for recurring scrims.',
      });
    } else if (new Date(data.series_end_date) < new Date(data.scrim_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['series_end_date'],
        message: 'Series end date cannot be before the first scrim date.',
      });
    }
  }
});

export type ScrimFormValues = z.infer<typeof scrimFormSchema>;

// For UI mapping
export const DayOfWeekMap: Record<typeof daysOfWeek[number], string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
};
