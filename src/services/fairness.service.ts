import { assignmentRepository } from "../repositories/assignment.repository";
import { availabilityRepository } from "../repositories/availability.repository";
import { userRepository } from "../repositories/user.repository";
import { locationRepository } from "../repositories/location.repository";
import { getShiftDateInLocation } from "../utils/timezone";
import type { FairnessScore } from "../types/api";

const PREMIUM_DAY_OF_WEEK = [5, 6]; // Friday, Saturday
const PREMIUM_HOUR_START = 17;

export const fairnessService = {
  async getDistribution(locationId: string, startDate: Date, endDate: Date) {
    const [users, location] = await Promise.all([
      userRepository.findMany({ locationId }),
      locationRepository.findById(locationId),
    ]);
    const timezone = location?.timezone ?? "UTC";

    const scores: FairnessScore[] = [];

    for (const user of users) {
      const assignments = await assignmentRepository.findByUserId(user.id, startDate, endDate);
      let totalHours = 0;
      let premiumHours = 0;

      for (const a of assignments) {
        const hours = (a.shift.endAt.getTime() - a.shift.startAt.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
        const { date, hour } = getShiftDateInLocation(a.shift.startAt, timezone);
        const day = date.getDay();
        if (PREMIUM_DAY_OF_WEEK.includes(day) && hour >= PREMIUM_HOUR_START) {
          premiumHours += hours;
        }
      }

      const desired = await availabilityRepository.findDesiredHours(user.id);
      const score = totalHours > 0 ? premiumHours / totalHours : 0;
      scores.push({
        userId: user.id,
        totalHours,
        premiumHours,
        desiredMin: desired?.minHours != null ? Number(desired.minHours) : undefined,
        desiredMax: desired?.maxHours != null ? Number(desired.maxHours) : undefined,
        score,
      });
    }

    return scores;
  },

  async getFairnessScore(locationId: string, startDate: Date, endDate: Date): Promise<number> {
    const distribution = await this.getDistribution(locationId, startDate, endDate);
    if (distribution.length === 0) return 0;
    const avgPremium = distribution.reduce((s, d) => s + d.premiumHours, 0) / distribution.length;
    const totalPremium = distribution.reduce((s, d) => s + d.premiumHours, 0);
    if (totalPremium === 0) return 1;
    const variance = distribution.reduce((s, d) => s + Math.pow(d.premiumHours - avgPremium, 2), 0) / distribution.length;
    return Math.max(0, 1 - Math.sqrt(variance) / (avgPremium || 1));
  },
};
