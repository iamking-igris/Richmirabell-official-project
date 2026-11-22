import type { ApiUser, TokenResponse } from "@/lib/backend";

export type AuthUser = ApiUser;

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type AuthResponse = TokenResponse;

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}
