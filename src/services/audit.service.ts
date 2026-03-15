import { auditRepository } from "../repositories/audit.repository";
import type { AuditFilters } from "../repositories/audit.repository";

export const auditService = {
  async log(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>
  ) {
    return auditRepository.create({
      entityType,
      entityId,
      action,
      userId,
      before,
      after,
    });
  },

  async getByShiftId(shiftId: string) {
    return auditRepository.findByShiftId(shiftId);
  },

  async getByFilters(filters: AuditFilters) {
    return auditRepository.findMany(filters);
  },

  async export(startDate: Date, endDate: Date, locationId?: string) {
    return auditRepository.findByDateRange(startDate, endDate, locationId);
  },
};
