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

function getHoursPerCalendarDay(
  startAt: Date,
  endAt: Date,
  timezone: string = "UTC"
): Array<{ dateKey: string; hours: number }> {
  const dayHoursMap = new Map<string, number>();
  const msPerHour = 60 * 60 * 1000;
  let t = startAt.getTime();
  const endMs = endAt.getTime();
  while (t < endMs) {
    const d = new Date(t);
    const dateKey = d.toLocaleDateString("en-CA", { timeZone: timezone });
    const nextHour = Math.min(t + msPerHour, endMs);
    const hours = (nextHour - t) / msPerHour;
    dayHoursMap.set(dateKey, (dayHoursMap.get(dateKey) ?? 0) + hours);
    t = nextHour;
  }
  return Array.from(dayHoursMap.entries()).map(([dateKey, hours]) => ({ dateKey, hours }));
}

export const overtimeService = {
  async getWarningsForUser(userId: string, weekStart: Date, weekEnd: Date): Promise<OvertimeWarning[]> {
    const assignments = await assignmentRepository.findByUserId(userId, weekStart, weekEnd);
    const warnings: OvertimeWarning[] = [];
    let weeklyHours = 0;
    const dayHours = new Map<string, number>();
    const daysWithShift = new Set<string>();

    for (const a of assignments) {
      const hours = hoursBetween(a.shift.startAt, a.shift.endAt);
      weeklyHours += hours;
      const perDay = getHoursPerCalendarDay(a.shift.startAt, a.shift.endAt, "UTC");
      for (const { dateKey, hours: dayH } of perDay) {
        dayHours.set(dateKey, (dayHours.get(dateKey) ?? 0) + dayH);
        daysWithShift.add(dateKey);
      }
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

    const sortedDayStrs = Array.from(daysWithShift).sort();
    const dayNums = sortedDayStrs.map((d) =>
      Math.floor(new Date(d + "T12:00:00Z").getTime() / (24 * 60 * 60 * 1000))
    );
    let consecutive = 0;
    let maxConsecutive = 0;
    let prev = -2;
    for (const day of dayNums) {
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
    tentativeShift: { startAt: Date; endAt: Date },
    locationTimezone?: string
  ): Promise<OvertimeWarning[]> {
    const assignments = await assignmentRepository.findByUserId(userId, weekStart, weekEnd);
    const shifts = assignments.map((a: { shift: { startAt: Date; endAt: Date } }) => a.shift);
    shifts.push(tentativeShift);
    let weeklyHours = 0;
    const dayHours = new Map<string, number>();
    const daysWithShift = new Set<string>();
    for (const s of shifts) {
      const hours = hoursBetween(s.startAt, s.endAt);
      weeklyHours += hours;
      const perDay = getHoursPerCalendarDay(s.startAt, s.endAt, locationTimezone);
      for (const { dateKey, hours: dayH } of perDay) {
        dayHours.set(dateKey, (dayHours.get(dateKey) ?? 0) + dayH);
        daysWithShift.add(dateKey);
      }
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
    const sortedDayStrs = Array.from(daysWithShift).sort();
    const dayNums = sortedDayStrs.map((d) =>
      Math.floor(new Date(d + "T12:00:00Z").getTime() / (24 * 60 * 60 * 1000))
    );
    let consecutive = 0;
    let maxConsecutive = 0;
    let prev = -2;
    for (const day of dayNums) {
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
