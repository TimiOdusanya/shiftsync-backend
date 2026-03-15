import { Role, ScheduleState } from "@prisma/client";
import { shiftRepository } from "../repositories/shift.repository";
import { userRepository } from "../repositories/user.repository";
import { auditService } from "./audit.service";
import { swapService } from "./swap.service";
import { dropService } from "./drop.service";
import { emitScheduleUpdated } from "../sockets/io";
import { env } from "../config";
import { addHours } from "../utils/date";
import type { CreateShiftInput, UpdateShiftInput } from "../validators/shift";
import type { ShiftFilters } from "../repositories/shift.repository";

export const shiftService = {
  async getById(id: string) {
    return shiftRepository.findById(id);
  },

  async list(filters: ShiftFilters, requestorId: string, requestorRole: Role) {
    let locationIds: string[] | undefined;
    if (requestorRole === Role.ADMIN) {
      locationIds = undefined;
    } else if (requestorRole === Role.MANAGER) {
      locationIds = await userRepository.getManagerLocationIds(requestorId);
      if (locationIds.length === 0) return [];
      if (filters.locationId && !locationIds.includes(filters.locationId)) return [];
    } else {
      locationIds = await userRepository.getStaffLocationIds(requestorId);
      if (locationIds.length === 0) return [];
      if (filters.locationId && !locationIds.includes(filters.locationId)) return [];
    }
    const effectiveFilters = { ...filters };
    if (locationIds && locationIds.length > 0 && !filters.locationId)
      effectiveFilters.locationIds = locationIds;
    return shiftRepository.findMany(effectiveFilters);
  },

  async create(data: CreateShiftInput, createdBy: string) {
    const shift = await shiftRepository.create({
      locationId: data.locationId,
      skillId: data.skillId,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      headcountRequired: data.headcountRequired,
    });
    await auditService.log("Shift", shift.id, "CREATE", createdBy, undefined, shift as unknown as Record<string, unknown>);
    emitScheduleUpdated(shift.locationId, { shiftId: shift.id, action: "created" });
    return shift;
  },

  async update(id: string, data: UpdateShiftInput, updatedBy: string) {
    const before = await shiftRepository.findById(id);
    if (!before) return null;

    const updatePayload: Parameters<typeof shiftRepository.update>[1] = {};
    if (data.locationId != null) updatePayload.locationId = data.locationId;
    if (data.skillId != null) updatePayload.skillId = data.skillId;
    if (data.startAt != null) updatePayload.startAt = new Date(data.startAt);
    if (data.endAt != null) updatePayload.endAt = new Date(data.endAt);
    if (data.headcountRequired != null) updatePayload.headcountRequired = data.headcountRequired;
    if (before.scheduleState === ScheduleState.PUBLISHED)
      updatePayload.editedAfterPublish = true;

    const after = await shiftRepository.update(id, updatePayload);
    await auditService.log("Shift", id, "UPDATE", updatedBy, before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
    await swapService.cancelPendingByShiftId(id, "Shift was edited");
    await dropService.cancelPendingByShiftId(id);
    emitScheduleUpdated(after.locationId, { shiftId: id, action: "updated" });
    return after;
  },

  async publish(id: string, publishedBy: string) {
    const shift = await shiftRepository.findById(id);
    if (!shift) return null;
    if (shift.scheduleState === ScheduleState.PUBLISHED) return shift;

    const updated = await shiftRepository.update(id, {
      scheduleState: ScheduleState.PUBLISHED,
      publishedAt: new Date(),
    });
    await auditService.log("Shift", id, "PUBLISH", publishedBy, shift as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
    emitScheduleUpdated(updated.locationId, { shiftId: id, action: "published" });
    return updated;
  },

  async unpublish(id: string, unpublishedBy: string) {
    const shift = await shiftRepository.findById(id);
    if (!shift) return null;

    const cutoff = addHours(shift.startAt, -env.SCHEDULE_EDIT_CUTOFF_HOURS);
    if (new Date() > cutoff) {
      throw new Error("Cannot unpublish: within edit cutoff window (e.g. 48h before shift start)");
    }

    const updated = await shiftRepository.update(id, {
      scheduleState: ScheduleState.DRAFT,
      publishedAt: null,
    });
    await auditService.log("Shift", id, "UNPUBLISH", unpublishedBy, shift as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
    emitScheduleUpdated(updated.locationId, { shiftId: id, action: "unpublished" });
    return updated;
  },

  async delete(id: string, deletedBy: string) {
    const before = await shiftRepository.findById(id);
    if (!before) return null;
    const locationId = before.locationId;
    await shiftRepository.delete(id);
    await auditService.log("Shift", id, "DELETE", deletedBy, before as unknown as Record<string, unknown>, undefined);
    emitScheduleUpdated(locationId, { shiftId: id, action: "deleted" });
    return { deleted: true };
  },
};
