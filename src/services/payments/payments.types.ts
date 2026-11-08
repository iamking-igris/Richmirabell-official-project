export interface PaymentTransaction {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  planName: string;
  amount: number;
  reference: string;
  gateway: "Paystack" | "Flutterwave" | "Bank Transfer" | "Manual Grant";
  status: "Successful" | "Pending" | "Failed" | "Refunded";
  createdAt: string;
}

export interface InitiatePaymentRequest {
  planId: string;
  amount: number;
  gateway: string;
}

export interface VerifyPaymentRequest {
  reference: string;
}
