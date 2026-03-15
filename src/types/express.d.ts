import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
