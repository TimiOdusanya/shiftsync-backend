import { Role, ScheduleState, SwapStatus, DropStatus } from "@prisma/client";

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: { id: string; email: string; firstName: string; lastName: string; role: Role };
}

export interface CreateShiftBody {
  locationId: string;
  skillId: string;
  startAt: string;
  endAt: string;
  headcountRequired: number;
}

export interface UpdateShiftBody extends Partial<CreateShiftBody> {}

export interface AssignStaffBody {
  userId: string;
  /** Required when assignment would result in 7th consecutive day; documented reason for override. */
  overrideReason?: string;
}

export interface CreateSwapBody {
  shiftId: string;
  receiverId: string;
}

export interface CreateDropBody {
  shiftId: string;
}

export interface ClaimDropBody {
  dropRequestId: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface ShiftFiltersQuery {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  state?: ScheduleState;
}

export interface ConstraintViolation {
  rule: string;
  message: string;
  alternatives?: Array<{ userId: string; name: string }>;
}

export interface AssignmentResult {
  success: boolean;
  assignment?: { id: string; shiftId: string; userId: string };
  violation?: ConstraintViolation;
}

export interface OvertimeWarning {
  userId: string;
  type: "weekly" | "daily" | "consecutive_days";
  message: string;
  hours?: number;
  requiresOverride?: boolean;
}

export interface FairnessScore {
  userId: string;
  totalHours: number;
  premiumHours: number;
  desiredMin?: number;
  desiredMax?: number;
  score: number;
}

export interface AuditExportQuery {
  startDate: string;
  endDate: string;
  locationId?: string;
  entityType?: string;
}
