export class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(serviceName: string) {
    super(
      `The ${serviceName} is not connected to a backend server. Please configure backend services to proceed.`,
      503,
      "SERVICE_UNAVAILABLE"
    );
    this.name = "ServiceUnavailableError";
  }
}
