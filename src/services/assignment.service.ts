import { assignmentRepository } from "../repositories/assignment.repository";
import { shiftRepository } from "../repositories/shift.repository";
import { constraintService } from "./constraint.service";
import { overtimeService } from "./overtime.service";
import { auditService } from "./audit.service";
import { notificationService } from "./notification.service";
import { emitScheduleUpdated, emitShiftAssigned, emitOnDutyUpdate } from "../sockets/io";
import { startOfWeek, endOfWeek } from "../utils/date";
import type { AssignStaffBody } from "../types/api";
import type { AssignmentResult } from "../types/api";

export const assignmentService = {
  async getByShiftId(shiftId: string) {
    return assignmentRepository.findByShiftId(shiftId);
  },

  async getByUserId(userId: string, startDate?: Date, endDate?: Date) {
    return assignmentRepository.findByUserId(userId, startDate, endDate);
  },

  async assign(shiftId: string, body: AssignStaffBody, assignedBy: string): Promise<AssignmentResult> {
    const violation = await constraintService.checkAssignment(shiftId, body.userId);
    if (violation) {
      return { success: false, violation };
    }

    const existing = await assignmentRepository.findByShiftAndUser(shiftId, body.userId);
    if (existing) {
      return {
        success: true,
        assignment: { id: existing.id, shiftId: existing.shiftId, userId: existing.userId },
      };
    }

    const shift = await shiftRepository.findById(shiftId);
    if (!shift) return { success: false, violation: { rule: "NOT_FOUND", message: "Shift not found" } };

    const currentCount = await assignmentRepository.countByShiftId(shiftId);
    if (currentCount >= (shift.headcountRequired ?? 1)) {
      const alternatives = (await constraintService.getAlternatives(shiftId)).filter(
        (a) => a.userId !== body.userId
      );
      return {
        success: false,
        violation: {
          rule: "HEADCOUNT",
          message: `This shift requires ${shift.headcountRequired} staff; ${currentCount} already assigned. Cannot add more.`,
          alternatives,
        },
      };
    }

    const weekStart = startOfWeek(shift.startAt);
    const weekEnd = endOfWeek(shift.startAt);
    const locationTimezone = shift.location?.timezone;
    const overtimeWarnings = await overtimeService.getWarningsWithTentative(
      body.userId,
      weekStart,
      weekEnd,
      { startAt: shift.startAt, endAt: shift.endAt },
      locationTimezone
    );
    const dailyBlock = overtimeWarnings.find((w) => w.type === "daily" && w.requiresOverride);
    if (dailyBlock) {
      const alternatives = (await constraintService.getAlternatives(shiftId)).filter(
        (a) => a.userId !== body.userId
      );
      return {
        success: false,
        violation: {
          rule: "OVERTIME",
          message: dailyBlock.message,
          alternatives,
        },
      };
    }
    const seventhDay = overtimeWarnings.find((w) => w.type === "consecutive_days" && w.requiresOverride);
    if (seventhDay && !body.overrideReason?.trim()) {
      return {
        success: false,
        violation: {
          rule: "OVERTIME",
          message: seventhDay.message + " Provide overrideReason to proceed.",
        },
      };
    }

    const assignment = await assignmentRepository.create({
      shiftId,
      userId: body.userId,
      assignedBy,
    });
    await auditService.log("ShiftAssignment", assignment.id, "CREATE", assignedBy, undefined, assignment as unknown as Record<string, unknown>);
    await notificationService.notifyShiftAssigned(body.userId, shiftId, assignment.id);
    emitShiftAssigned(body.userId, { shiftId, assignmentId: assignment.id });
    emitScheduleUpdated(shift.locationId, { shiftId, action: "assignment_added", userId: body.userId });
    emitOnDutyUpdate(shift.locationId, { shiftId, action: "assigned", userId: body.userId });
    return {
      success: true,
      assignment: { id: assignment.id, shiftId: assignment.shiftId, userId: assignment.userId },
    };
  },

  async unassign(shiftId: string, userId: string, removedBy: string) {
    const assignment = await assignmentRepository.findByShiftAndUser(shiftId, userId);
    if (!assignment) return null;

    const locationId = assignment.shift.locationId;
    await assignmentRepository.delete(shiftId, userId);
    await auditService.log("ShiftAssignment", assignment.id, "DELETE", removedBy, assignment as unknown as Record<string, unknown>, undefined);
    emitScheduleUpdated(locationId, { shiftId, action: "assignment_removed", userId });
    emitOnDutyUpdate(locationId, { shiftId, action: "unassigned", userId });
    return { removed: true };
  },

  async getActiveNow(locationId?: string, allowedLocationIds?: string[] | null) {
    return assignmentRepository.findActiveNow(locationId, allowedLocationIds);
  },
};
