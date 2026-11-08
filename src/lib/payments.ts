export type PayResult = { ok: true; reference: string } | { ok: false; reason: string };

export type PaymentRecord = {
  reference: string;
  name: string;
  amount: number;
  method: "Card" | "Bank transfer" | "USSD";
  at: number;
  status: "Successful" | "Failed" | "Pending";
};

export interface PaymentProvider {
  checkout(input: { name: string; amount: number; method: PaymentRecord["method"] }): Promise<PayResult>;
}

export const localProvider: PaymentProvider = {
  async checkout() {
    await new Promise((r) => setTimeout(r, 1400));
    return { ok: true, reference: "RM-" + Date.now().toString(36).toUpperCase() };
  },
};

export const provider: PaymentProvider = localProvider;

export const MONTHLY_PRICE = 4500;
export const TERM_PRICE = MONTHLY_PRICE; // Backwards-compatibility alias
