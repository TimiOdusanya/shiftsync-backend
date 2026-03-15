import * as bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { userRepository } from "../repositories/user.repository";
import { env } from "../config";
import type { LoginInput } from "../validators/user";
import type { AuthResponse } from "../types/api";
import type { JwtPayload } from "../middleware/auth";

const SALT_ROUNDS = 10;

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async login(input: LoginInput): Promise<AuthResponse | null> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) return null;

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) return null;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const expiresInSec = parseExpiry(env.JWT_EXPIRES_IN);
    const signOpts = { expiresIn: env.JWT_EXPIRES_IN } as SignOptions;
    const accessToken = jwt.sign(payload, env.JWT_SECRET, signOpts);
    const refreshPayload = { ...payload, type: "refresh" };
    const refreshToken = jwt.sign(refreshPayload, env.JWT_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN } as SignOptions);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSec,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  },

  async refresh(token: string): Promise<AuthResponse | null> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload & { type?: string };
      if (decoded.type !== "refresh") return null;
      const user = await userRepository.findById(decoded.sub);
      if (!user) return null;
      const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
      const expiresInSec = parseExpiry(env.JWT_EXPIRES_IN);
      const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
      const refreshPayload = { ...payload, type: "refresh" };
      const newRefresh = jwt.sign(refreshPayload, env.JWT_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN } as SignOptions);
      return {
        accessToken,
        refreshToken: newRefresh,
        expiresIn: expiresInSec,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    } catch {
      return null;
    }
  },

  async me(userId: string) {
    return userRepository.findById(userId);
  },

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  },
};

function parseExpiry(s: string): number {
  const match = s.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 3600;
  const n = Number(match[1]);
  const unit = match[2];
  if (unit === "s") return n;
  if (unit === "m") return n * 60;
  if (unit === "h") return n * 3600;
  if (unit === "d") return n * 24 * 3600;
  return 7 * 24 * 3600;
}
