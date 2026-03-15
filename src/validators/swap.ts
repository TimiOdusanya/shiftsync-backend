import { z } from "zod";

export const createSwapSchema = z.object({
  shiftId: z.string().cuid(),
  receiverId: z.string().cuid(),
});

export const swapIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const swapActionSchema = z.object({
  action: z.enum(["accept", "reject", "approve", "reject_manager"]),
  reason: z.string().optional(),
});

export type CreateSwapInput = z.infer<typeof createSwapSchema>;
export type SwapActionInput = z.infer<typeof swapActionSchema>;
