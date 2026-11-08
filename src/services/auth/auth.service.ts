import { apiClient } from "../api/client";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterRequest,
} from "./auth.types";

export class AuthService {
  public async register(data: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/register", data);
  }

  public async login(data: LoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/login", data);
  }

  public async loginWithGoogle(): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/google");
  }

  public async logout(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/auth/logout");
  }

  public async getCurrentUser(): Promise<AuthUser> {
    return apiClient.get<AuthUser>("/auth/me");
  }

  public async restoreSession(): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>("/auth/session/restore");
  }

  public async requestPasswordReset(data: PasswordResetRequest): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>("/auth/password/reset-request", data);
  }

  public async confirmPasswordReset(data: PasswordResetConfirm): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/auth/password/reset-confirm", data);
  }
}

export const authService = new AuthService();
