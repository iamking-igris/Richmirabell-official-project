const DEFAULT_API_BASE_URL = "https://richmirabel-backend.onrender.com/api/v1";

function resolveBaseUrl(): string {
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  // VITE_API_URL is accepted as an alias so either name works when setting
  // the backend origin (both are documented in .env.example).
  return (
    env?.VITE_API_BASE_URL?.replace(/\/$/, "") ||
    env?.VITE_API_URL?.replace(/\/$/, "") ||
    DEFAULT_API_BASE_URL
  );
}

export const API_CONFIG = {
  baseUrl: resolveBaseUrl(),
  timeoutMs: 20000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export const AUTH_TOKEN_KEY = "richmirabel_auth_token";
