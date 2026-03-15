import { assignmentRepository } from "../repositories/assignment.repository";
import { shiftRepository } from "../repositories/shift.repository";
import { hoursBetween } from "../utils/date";
import type { OvertimeWarning } from "../types/api";

const WEEKLY_WARNING_HOURS = 35;
const WEEKLY_OT_HOURS = 40;
const DAILY_WARNING_HOURS = 8;
const DAILY_BLOCK_HOURS = 12;
const CONSECUTIVE_DAYS_WARNING = 6;
const CONSECUTIVE_DAYS_OVERRIDE = 7;

export const overtimeService = {
  async getWarningsForUser(userId: string, weekStart: Date, weekEnd: Date): Promise<OvertimeWarning[]> {
    const assignments = await assignmentRepository.findByUserId(userId, weekStart, weekEnd);
    const warnings: OvertimeWarning[] = [];
    let weeklyHours = 0;
    const dayHours = new Map<number, number>();
    const daysWithShift = new Set<number>();

    for (const a of assignments) {
      const hours = hoursBetween(a.shift.startAt, a.shift.endAt);
      weeklyHours += hours;
      const dayKey = new Date(a.shift.startAt).setHours(0, 0, 0, 0);
      dayHours.set(dayKey, (dayHours.get(dayKey) ?? 0) + hours);
      daysWithShift.add(dayKey);
    }

    if (weeklyHours >= WEEKLY_OT_HOURS) {
      warnings.push({
        userId,
        type: "weekly",
        message: `Weekly hours (${weeklyHours.toFixed(1)}) exceed 40`,
        hours: weeklyHours,
      });
    } else if (weeklyHours >= WEEKLY_WARNING_HOURS) {
      warnings.push({
        userId,
        type: "weekly",
        message: `Weekly hours (${weeklyHours.toFixed(1)}) approaching 40`,
        hours: weeklyHours,
      });
    }

    for (const [, h] of dayHours) {
      if (h > DAILY_BLOCK_HOURS) {
        warnings.push({
          userId,
          type: "daily",
          message: `Daily hours (${h.toFixed(1)}) exceed 12 (hard block)`,
          hours: h,
          requiresOverride: true,
        });
      } else if (h > DAILY_WARNING_HOURS) {
        warnings.push({
          userId,
          type: "daily",
          message: `Daily hours (${h.toFixed(1)}) exceed 8`,
          hours: h,
        });
      }
    }

    const sortedDays = Array.from(daysWithShift).sort((a, b) => a - b);
    let consecutive = 0;
    let maxConsecutive = 0;
    let prev = -2;
    for (const d of sortedDays) {
      const day = Math.floor(d / (24 * 60 * 60 * 1000));
      if (day === prev + 1) consecutive++;
      else consecutive = 1;
      prev = day;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    }
    if (maxConsecutive >= CONSECUTIVE_DAYS_OVERRIDE) {
      warnings.push({
        userId,
        type: "consecutive_days",
        message: `7 consecutive days worked (requires manager override)`,
        requiresOverride: true,
      });
    } else if (maxConsecutive >= CONSECUTIVE_DAYS_WARNING) {
      warnings.push({
        userId,
        type: "consecutive_days",
        message: `6 consecutive days worked (warning)`,
      });
    }

    return warnings;
  },

  async getProjectedWeeklyHours(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
    const assignments = await assignmentRepository.findByUserId(userId, weekStart, weekEnd);
    let total = 0;
    for (const a of assignments) {
      total += hoursBetween(a.shift.startAt, a.shift.endAt);
    }
    return total;
  },

  async whatIfAssign(
    shiftId: string,
    userId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<{ projectedHours: number; warnings: OvertimeWarning[] }> {
    const shift = await shiftRepository.findById(shiftId);
    let currentHours = await this.getProjectedWeeklyHours(userId, weekStart, weekEnd);
    if (shift) {
      currentHours += hoursBetween(shift.startAt, shift.endAt);
    }
    const assignments = await assignmentRepository.findByUserId(userId, weekStart, weekEnd);
    const withTentative = shift
      ? [...assignments.map((a: { shift: { startAt: Date; endAt: Date } }) => a.shift), shift]
      : assignments.map((a: { shift: { startAt: Date; endAt: Date } }) => a.shift);
    const warnings = await this.getWarningsForUser(userId, weekStart, weekEnd);
    if (shift) {
      const tentativeHours = hoursBetween(shift.startAt, shift.endAt);
      if (currentHours >= WEEKLY_OT_HOURS)
        warnings.push({
          userId,
          type: "weekly",
          message: `With this shift, weekly hours would be ${currentHours.toFixed(1)} (over 40)`,
          hours: currentHours,
        });
    }
    return { projectedHours: currentHours, warnings };
  },

  /** Returns warnings as if the tentative shift were assigned (for assignment-time enforcement). */
  async getWarningsWithTentative(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
    tentativeShift: { startAt: Date; endAt: Date }
  ): Promise<OvertimeWarning[]> {
    const assignments = await assignmentRepository.findByUserId(userId, weekStart, weekEnd);
    const shifts = assignments.map((a: { shift: { startAt: Date; endAt: Date } }) => a.shift);
    shifts.push(tentativeShift);
    let weeklyHours = 0;
    const dayHours = new Map<number, number>();
    const daysWithShift = new Set<number>();
    for (const s of shifts) {
      const hours = hoursBetween(s.startAt, s.endAt);
      weeklyHours += hours;
      const dayKey = new Date(s.startAt).setHours(0, 0, 0, 0);
      dayHours.set(dayKey, (dayHours.get(dayKey) ?? 0) + hours);
      daysWithShift.add(dayKey);
    }
    const warnings: OvertimeWarning[] = [];
    if (weeklyHours >= WEEKLY_OT_HOURS) {
      warnings.push({ userId, type: "weekly", message: `Weekly hours (${weeklyHours.toFixed(1)}) exceed 40`, hours: weeklyHours });
    } else if (weeklyHours >= WEEKLY_WARNING_HOURS) {
      warnings.push({ userId, type: "weekly", message: `Weekly hours (${weeklyHours.toFixed(1)}) approaching 40`, hours: weeklyHours });
    }
    for (const [, h] of dayHours) {
      if (h > DAILY_BLOCK_HOURS) {
        warnings.push({
          userId,
          type: "daily",
          message: `Daily hours (${h.toFixed(1)}) exceed 12 (hard block)`,
          hours: h,
          requiresOverride: true,
        });
      } else if (h > DAILY_WARNING_HOURS) {
        warnings.push({ userId, type: "daily", message: `Daily hours (${h.toFixed(1)}) exceed 8`, hours: h });
      }
    }
    const sortedDays = Array.from(daysWithShift).sort((a, b) => a - b);
    let consecutive = 0;
    let maxConsecutive = 0;
    let prev = -2;
    for (const d of sortedDays) {
      const day = Math.floor(d / (24 * 60 * 60 * 1000));
      if (day === prev + 1) consecutive++;
      else consecutive = 1;
      prev = day;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    }
    if (maxConsecutive >= CONSECUTIVE_DAYS_OVERRIDE) {
      warnings.push({
        userId,
        type: "consecutive_days",
        message: `7 consecutive days worked (requires manager override)`,
        requiresOverride: true,
      });
    } else if (maxConsecutive >= CONSECUTIVE_DAYS_WARNING) {
      warnings.push({ userId, type: "consecutive_days", message: `6 consecutive days worked (warning)` });
    }
    return warnings;
  },
};
