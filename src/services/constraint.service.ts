import { assignmentRepository } from "../repositories/assignment.repository";
import { shiftRepository } from "../repositories/shift.repository";
import { userRepository } from "../repositories/user.repository";
import { availabilityRepository } from "../repositories/availability.repository";
import { getAvailabilityWindowUtc, getDayOfWeekInTimezone } from "../utils/timezone";
import { minimumRestViolation, shiftsOverlap } from "../utils/conflict";
import type { ConstraintViolation } from "../types/api";

const MIN_REST_HOURS = 10;

export const constraintService = {
  async checkAssignment(shiftId: string, userId: string): Promise<ConstraintViolation | null> {
    const shift = await shiftRepository.findById(shiftId);
    if (!shift) return { rule: "NOT_FOUND", message: "Shift not found" };

    const [locationCertified, hasSkill] = await Promise.all([
      userRepository.getStaffLocationIds(userId),
      userRepository.getStaffSkillIds(userId),
    ]);
    if (!locationCertified.includes(shift.locationId))
      return {
        rule: "LOCATION",
        message: "Staff is not certified for this location",
        alternatives: await suggestAlternatives(shift),
      };
    if (!hasSkill.includes(shift.skillId))
      return {
        rule: "SKILL",
        message: "Staff does not have the required skill",
        alternatives: await suggestAlternatives(shift),
      };

    const overlapping = await shiftRepository.findOverlappingForUser(
      userId,
      shift.startAt,
      shift.endAt,
      shiftId
    );
    if (overlapping.length > 0)
      return {
        rule: "DOUBLE_BOOK",
        message: "Staff is already assigned to an overlapping shift",
      };

    const restViolation = await checkMinimumRest(userId, shift.startAt, shift.endAt, shiftId);
    if (restViolation)
      return {
        rule: "REST",
        message: `Minimum ${MIN_REST_HOURS} hours rest required between shifts`,
        alternatives: await suggestAlternatives(shift),
      };

    const available = await checkAvailability(userId, shift.startAt, shift.endAt);
    if (!available)
      return {
        rule: "AVAILABILITY",
        message: "Staff is not available during this shift time",
        alternatives: await suggestAlternatives(shift),
      };

    return null;
  },

  async getAlternatives(shiftId: string) {
    const shift = await shiftRepository.findById(shiftId);
    if (!shift) return [];
    return suggestAlternatives(shift);
  },
};

async function checkMinimumRest(
  userId: string,
  shiftStart: Date,
  shiftEnd: Date,
  excludeShiftId: string
): Promise<boolean> {
  const assignments = await assignmentRepository.findByUserId(userId);
  const others = assignments.filter((a) => a.shift.id !== excludeShiftId);
  for (const a of others as Array<{ shift: { startAt: Date; endAt: Date } }>) {
    const prevEnd = a.shift.endAt;
    const nextStart = a.shift.startAt;
    if (prevEnd <= shiftStart && minimumRestViolation(prevEnd, shiftStart, MIN_REST_HOURS))
      return true;
    if (nextStart >= shiftEnd && minimumRestViolation(shiftEnd, nextStart, MIN_REST_HOURS))
      return true;
  }
  return false;
}

async function checkAvailability(
  userId: string,
  shiftStart: Date,
  shiftEnd: Date
): Promise<boolean> {
  const [recurring, exceptions] = await Promise.all([
    availabilityRepository.findRecurringByUserId(userId),
    availabilityRepository.findExceptionsByUserId(
      userId,
      new Date(shiftStart.getTime() - 24 * 60 * 60 * 1000),
      new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000)
    ),
  ]);

  const timezone = recurring[0]?.timezone ?? "UTC";
  const exceptionByDateStr = new Map<string, (typeof exceptions)[0]>();
  exceptions.forEach((e) => exceptionByDateStr.set(e.date.toISOString().slice(0, 10), e));

  const recurringByDay = new Map<number, (typeof recurring)[0]>();
  recurring.forEach((r) => recurringByDay.set(r.dayOfWeek, r));

  if (recurring.length === 0 && exceptions.length === 0) return true;

  const day0 = getDayOfWeekInTimezone(shiftStart, timezone);
  const day1 = getDayOfWeekInTimezone(shiftEnd, timezone);
  const dateStr0 = shiftStart.toLocaleDateString("en-CA", { timeZone: timezone });
  const dateStr1 = shiftEnd.toLocaleDateString("en-CA", { timeZone: timezone });
  const date0Utc = new Date(dateStr0 + "T12:00:00Z");
  const date1Utc = new Date(dateStr1 + "T12:00:00Z");

  const windows: { start: Date; end: Date }[] = [];

  const addWindowForDate = (dateStr: string, dateUtc: Date, dayOfWeek: number) => {
    const exc = exceptionByDateStr.get(dateStr);
    if (exc && !exc.isAvailable) return;
    if (exc && exc.startTime && exc.endTime) {
      const w = getAvailabilityWindowUtc(dateUtc, exc.startTime, exc.endTime, exc.timezone);
      windows.push(w);
      return;
    }
    const rec = recurringByDay.get(dayOfWeek);
    if (!rec) return;
    const w = getAvailabilityWindowUtc(dateUtc, rec.startTime, rec.endTime, rec.timezone);
    windows.push(w);
  };

  addWindowForDate(dateStr0, date0Utc, day0);
  if (dateStr1 !== dateStr0) addWindowForDate(dateStr1, date1Utc, day1);

  for (const w of windows) {
    if (shiftStart >= w.start && shiftEnd <= w.end) return true;
    if (shiftsOverlap(shiftStart, shiftEnd, w.start, w.end)) {
      const overlapStart = new Date(Math.max(shiftStart.getTime(), w.start.getTime()));
      const overlapEnd = new Date(Math.min(shiftEnd.getTime(), w.end.getTime()));
      if (overlapEnd.getTime() - overlapStart.getTime() >= (shiftEnd.getTime() - shiftStart.getTime()) * 0.99)
        return true;
    }
  }
  return windows.length > 0 ? false : true;
}

async function suggestAlternatives(shift: {
  id?: string;
  locationId: string;
  skillId: string;
  startAt: Date;
  endAt: Date;
}): Promise<Array<{ userId: string; name: string }>> {
  const users = await userRepository.findMany({ locationId: shift.locationId });
  const result: Array<{ userId: string; name: string }> = [];
  for (const u of users) {
    const skillIds = await userRepository.getStaffSkillIds(u.id);
    if (!skillIds.includes(shift.skillId)) continue;
    const overlapping = await shiftRepository.findOverlappingForUser(
      u.id,
      shift.startAt,
      shift.endAt,
      shift.id
    );
    if (overlapping.length > 0) continue;
    result.push({ userId: u.id, name: `${u.firstName} ${u.lastName}` });
  }
  return result.slice(0, 10);
}
