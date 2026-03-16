import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const paginationQuerySchema = z.object({
  page: z.string().transform(Number).optional().default("1"),
  limit: z.string().transform(Number).optional().default("20"),
});

export const listUsersQuerySchema = z.object({
  page: z.string().transform(Number).optional().default("1"),
  limit: z.string().transform(Number).optional().default("20"),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  locationId: z.string().min(1).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
