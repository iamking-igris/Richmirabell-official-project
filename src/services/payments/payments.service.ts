import { apiClient } from "../api/client";
import type { InitiatePaymentRequest, PaymentTransaction, VerifyPaymentRequest } from "./payments.types";

export class PaymentsService {
  public async initiatePayment(req: InitiatePaymentRequest): Promise<{ authorizationUrl: string; reference: string }> {
    return apiClient.post("/payments/initiate", req);
  }

  public async verifyPayment(req: VerifyPaymentRequest): Promise<PaymentTransaction> {
    return apiClient.post<PaymentTransaction>("/payments/verify", req);
  }

  public async getTransactions(): Promise<PaymentTransaction[]> {
    return apiClient.get<PaymentTransaction[]>("/payments/transactions");
  }
}

export const paymentsService = new PaymentsService();
