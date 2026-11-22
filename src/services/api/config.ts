const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function resolveBaseUrl(): string {
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  return env?.VITE_API_BASE_URL?.replace(/\/$/, "") || DEFAULT_API_BASE_URL;
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
