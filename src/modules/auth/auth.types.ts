import type { Request } from 'express';

// ── Authenticated Request ─────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// ── User Types ────────────────────────────────────────────────
export enum UserRole {
  USER = 'USER',
  RESEARCHER = 'RESEARCHER',
  ADMIN = 'ADMIN',
}

export interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
}
