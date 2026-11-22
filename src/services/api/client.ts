import { API_CONFIG, AUTH_TOKEN_KEY } from "./config";
import { ApiError, ServiceUnavailableError } from "./errors";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  else window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

type BackendErrorBody = {
  detail?: string | { code?: string; message?: string };
  message?: string;
  code?: string;
};

function readError(body: BackendErrorBody | undefined, status: number): { message: string; code?: string } {
  const detail = body?.detail;
  if (detail && typeof detail === "object") {
    return {
      message: detail.message || `Request failed with status ${status}`,
      code: detail.code,
    };
  }
  if (typeof detail === "string") return { message: detail };
  if (body?.message) return { message: body.message, code: body.code };
  return { message: `Request failed with status ${status}` };
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = API_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const token = getAuthToken();
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? { Accept: "application/json" } : API_CONFIG.headers),
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => undefined)) as BackendErrorBody | undefined;
        const { message, code } = readError(body, response.status);
        throw new ApiError(message, response.status, code, body);
      }

      if (response.status === 204) return undefined as T;
      const text = await response.text();
      if (!text) return undefined as T;

      const json = JSON.parse(text) as unknown;
      if (
        json &&
        typeof json === "object" &&
        "success" in json &&
        (json as ApiResponse<T>).success === true &&
        "data" in json
      ) {
        return (json as ApiResponse<T>).data;
      }
      return json as T;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError("The backend request timed out.", 408, "TIMEOUT");
      }
      throw new ServiceUnavailableError(endpoint);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body:
        body === undefined ? undefined : isFormData ? (body as BodyInit) : JSON.stringify(body),
    });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body:
        body === undefined ? undefined : isFormData ? (body as BodyInit) : JSON.stringify(body),
    });
  }

  public patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body:
        body === undefined ? undefined : isFormData ? (body as BodyInit) : JSON.stringify(body),
    });
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
