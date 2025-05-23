
import { z } from 'zod';
import { Constants } from '@/integrations/supabase/types';

const gameResultOptions = Constants.public.Enums.game_result_enum;

export const scrimGameFormSchema = z.object({
  game_number: z.coerce.number().min(1, "Game number must be at least 1"),
  result: z.enum(gameResultOptions, {
    errorMap: () => ({ message: "Please select a valid game result." }),
  }),
  duration: z.string().optional().nullable(),
  blue_side_pick: z.string().optional().nullable(),
  red_side_pick: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ScrimGameFormValues = z.infer<typeof scrimGameFormSchema>;
