import { useMemo, useState } from "react";

export interface PaymentEntry {
  id: string;
  method: string;
  amount: string;
}

const BASE_PAYMENT_METHODS = ["Cash", "BCI", "BIM", "M-Pesa", "e-Mola", "Conta Movel", "Bank Transfer"];

/**
 * Shared payment-entry state + Store Credit clamping/visibility, extracted
 * from POS.tsx so checkout screens don't drift independently. Store Credit
 * only appears as an option once a customer with a positive creditBalance
 * is selected, and any amount typed against it is clamped to that balance.
 */
export function usePaymentEntries(selectedCustomer: { creditBalance?: number } | null | undefined) {
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([{ id: "1", method: "Cash", amount: "" }]);

  const creditBalance = selectedCustomer?.creditBalance || 0;

  const paymentMethods = useMemo(
    () => (creditBalance > 0 ? [...BASE_PAYMENT_METHODS, "Store Credit"] : BASE_PAYMENT_METHODS),
    [creditBalance]
  );

  const amountReceived = useMemo(
    () => paymentEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
    [paymentEntries]
  );

  const clampStoreCredit = (method: string, amount: string) => {
    if (method === "Store Credit" && creditBalance > 0 && Number(amount) > creditBalance) {
      return creditBalance.toString();
    }
    return amount;
  };

  const updateMethod = (id: string, method: string) => {
    setPaymentEntries((prev) =>
      prev.map((p) => (p.id === id ? { ...p, method, amount: clampStoreCredit(method, p.amount) } : p))
    );
  };

  const updateAmount = (id: string, amount: string) => {
    setPaymentEntries((prev) =>
      prev.map((p) => (p.id === id ? { ...p, amount: clampStoreCredit(p.method, amount) } : p))
    );
  };

  const addEntry = () => {
    setPaymentEntries((prev) => (prev.length >= 6 ? prev : [...prev, { id: Date.now().toString(), method: "Cash", amount: "" }]));
  };

  const removeEntry = (id: string) => {
    setPaymentEntries((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  };

  const reset = () => setPaymentEntries([{ id: "1", method: "Cash", amount: "" }]);

  return { paymentEntries, paymentMethods, amountReceived, updateMethod, updateAmount, addEntry, removeEntry, reset };
}

/** Walk-in (no selected customer) sales must be fully paid at checkout -- mirrors the backend guard in convex/transactions.ts. */
export function getWalkInPaymentError(hasCustomer: boolean, amountReceived: number, total: number): string | null {
  if (hasCustomer || amountReceived >= total) return null;
  if (amountReceived === 0) return "Please enter the amount received before completing the transaction.";
  return `Walk-in customers must pay in full. Received ${amountReceived} of ${total}.`;
}
