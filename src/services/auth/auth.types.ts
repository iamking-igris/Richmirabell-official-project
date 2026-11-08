export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  onboardingComplete: boolean;
  createdAt: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password?: string;
  provider?: "email" | "google";
}

export interface LoginRequest {
  email: string;
  password?: string;
  provider?: "email" | "google";
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}
