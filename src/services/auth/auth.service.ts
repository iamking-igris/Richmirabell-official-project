import { authApi } from "@/lib/backend";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterRequest,
} from "./auth.types";

export class AuthService {
  public register(data: RegisterRequest): Promise<AuthResponse> {
    return authApi.register(data);
  }

  public login(data: LoginRequest): Promise<AuthResponse> {
    return authApi.login(data);
  }

  public loginWithGoogle(idToken: string): Promise<AuthResponse> {
    return authApi.google(idToken);
  }

  public logout(): Promise<{ ok: boolean }> {
    return authApi.logout();
  }

  public getCurrentUser(): Promise<AuthUser> {
    return authApi.me();
  }

  public restoreSession(): Promise<AuthResponse> {
    return authApi.restore();
  }

  public requestPasswordReset(data: PasswordResetRequest) {
    return authApi.requestPasswordReset(data.email);
  }

  public confirmPasswordReset(data: PasswordResetConfirm) {
    return authApi.confirmPasswordReset(data.token, data.newPassword);
  }
}

export const authService = new AuthService();
