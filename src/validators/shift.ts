import { z } from "zod";

export const createShiftSchema = z.object({
  locationId: z.string().min(1, { message: "Use the location id from GET /api/locations" }),
  skillId: z.string().min(1, { message: "Use the skill id from GET /api/skills" }),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  headcountRequired: z.number().int().min(1),
});

export const updateShiftSchema = createShiftSchema.partial();

export const shiftIdParamSchema = z.object({
  id: z.string().min(1),
});

export const shiftFiltersQuerySchema = z.object({
  locationId: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  state: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
