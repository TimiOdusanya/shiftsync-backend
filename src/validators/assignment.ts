import { z } from "zod";

export const assignStaffSchema = z.object({
  userId: z.string().cuid(),
});

export const shiftIdParamSchema = z.object({
  shiftId: z.string().cuid(),
});

export const assignmentIdParamSchema = z.object({
  assignmentId: z.string().cuid(),
});

export type AssignStaffInput = z.infer<typeof assignStaffSchema>;
