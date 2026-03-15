import { z } from "zod";

export const recurringAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string(),
});

export const exceptionAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isAvailable: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string(),
});

export const bulkRecurringSchema = z.object({
  windows: z.array(recurringAvailabilitySchema),
});

export const desiredHoursSchema = z.object({
  minHours: z.number().min(0).max(168).optional().nullable(),
  maxHours: z.number().min(0).max(168).optional().nullable(),
});

export type RecurringAvailabilityInput = z.infer<typeof recurringAvailabilitySchema>;
export type ExceptionAvailabilityInput = z.infer<typeof exceptionAvailabilitySchema>;
export type DesiredHoursInput = z.infer<typeof desiredHoursSchema>;
