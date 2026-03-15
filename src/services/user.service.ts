import { Role } from "@prisma/client";
import { userRepository } from "../repositories/user.repository";
import { authService } from "./auth.service";
import { availabilityRepository } from "../repositories/availability.repository";
import type { CreateUserInput, UpdateUserInput } from "../validators/user";
import type { RecurringAvailabilityInput, ExceptionAvailabilityInput, DesiredHoursInput } from "../validators/availability";

export const userService = {
  async getById(id: string, requestorRole: Role, requestorId: string) {
    if (requestorRole === Role.STAFF && requestorId !== id) return null;
    const user = await userRepository.findById(id);
    if (!user) return null;
    if (requestorRole === Role.MANAGER && requestorId !== id) {
      const managerLocIds = await userRepository.getManagerLocationIds(requestorId);
      const staffLocIds = user.staffLocations?.map((sl: { locationId: string }) => sl.locationId) ?? [];
      const manages = managerLocIds.some((lid) => staffLocIds.includes(lid));
      if (!manages) return null;
    }
    return user;
  },

  async list(filters: { role?: Role; locationId?: string }, requestorId: string, requestorRole: Role) {
    if (requestorRole === Role.STAFF) {
      const self = await userRepository.findById(requestorId);
      return self ? [self] : [];
    }
    if (requestorRole === Role.MANAGER) {
      const locationIds = await userRepository.getManagerLocationIds(requestorId);
      if (locationIds.length === 0) return [];
      const locationIdsFilter =
        filters.locationId && locationIds.includes(filters.locationId)
          ? [filters.locationId]
          : locationIds;
      return userRepository.findMany({ ...filters, locationIds: locationIdsFilter });
    }
    return userRepository.findMany(filters);
  },

  async create(data: CreateUserInput) {
    const passwordHash = await authService.hashPassword(data.password);
    return userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as Role,
    });
  },

  async update(id: string, data: UpdateUserInput) {
    return userRepository.update(id, data);
  },

  async getAvailability(userId: string) {
    const [recurring, exceptions] = await Promise.all([
      availabilityRepository.findRecurringByUserId(userId),
      availabilityRepository.findExceptionsByUserId(userId),
    ]);
    return { recurring, exceptions };
  },

  async setRecurringAvailability(userId: string, windows: RecurringAvailabilityInput[]) {
    await availabilityRepository.setRecurringBulk(
      userId,
      windows.map((w) => ({ ...w }))
    );
    return availabilityRepository.findRecurringByUserId(userId);
  },

  async setException(userId: string, data: ExceptionAvailabilityInput) {
    const date = new Date(data.date);
    return availabilityRepository.upsertException(userId, date, {
      isAvailable: data.isAvailable,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timezone,
    });
  },

  async setDesiredHours(userId: string, data: DesiredHoursInput) {
    return availabilityRepository.upsertDesiredHours(userId, {
      minHours: data.minHours ?? undefined,
      maxHours: data.maxHours ?? undefined,
    });
  },

  async getDesiredHours(userId: string) {
    return availabilityRepository.findDesiredHours(userId);
  },
};
