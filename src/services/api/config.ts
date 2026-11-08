export const API_CONFIG = {
  baseUrl: typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:4000/api/v1",
  timeoutMs: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};
