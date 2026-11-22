import { billingApi } from "@/lib/backend";
import type { InitiatePaymentRequest, PaymentTransaction, VerifyPaymentRequest } from "./payments.types";

export class PaymentsService {
  public initiatePayment(req: InitiatePaymentRequest) {
    return billingApi.initPayment(req.planId);
  }

  public verifyPayment(req: VerifyPaymentRequest) {
    return billingApi.verifyPayment(req.reference);
  }

  public getTransactions(): Promise<PaymentTransaction[]> {
    return billingApi.transactions() as unknown as Promise<PaymentTransaction[]>;
  }
}

export const paymentsService = new PaymentsService();
