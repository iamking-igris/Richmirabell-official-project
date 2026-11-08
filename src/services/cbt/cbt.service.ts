import type { Attempt } from "@/lib/session";
import { apiClient } from "../api/client";
import type { StartCbtRequest, SubmitCbtRequest } from "./cbt.types";

export class CbtService {
  public async startExam(req: StartCbtRequest): Promise<{ examId: string; questions: unknown[] }> {
    return apiClient.post("/cbt/start", req);
  }

  public async submitExam(req: SubmitCbtRequest): Promise<Attempt> {
    return apiClient.post<Attempt>("/cbt/submit", req);
  }

  public async getHistory(): Promise<Attempt[]> {
    return apiClient.get<Attempt[]>("/cbt/history");
  }
}

export const cbtService = new CbtService();
