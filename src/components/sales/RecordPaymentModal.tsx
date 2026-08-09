import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Wallet } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

const PAYMENT_METHODS = ["Cash", "BCI", "BIM", "M-Pesa", "e-Mola", "Conta Movel", "Bank Transfer"];

interface RecordPaymentModalProps {
  mode: "account" | "sale";
  transactionId: string;
  customerId: string;
  receiptNumber: string;
  remaining: number;
  onClose: () => void;
  formatCurrency: (v: number) => string;
}

export const RecordPaymentModal = ({
  mode,
  transactionId,
  customerId,
  receiptNumber,
  remaining,
  onClose,
  formatCurrency,
}: RecordPaymentModalProps) => {
  const addPayment = useMutation(api.payments.addPayment);
  const recordSalePayment = useMutation(api.payments.recordSalePayment);
  const customer = useQuery(api.customers.get, { id: customerId as Id<"customers"> });
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amount, setAmount] = useState(remaining.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasEditedRef = useRef(false);

  const creditBalance = customer?.creditBalance || 0;
  const paymentMethods = creditBalance > 0 ? [...PAYMENT_METHODS, "Store Credit"] : PAYMENT_METHODS;
  const isStoreCredit = paymentMethod === "Store Credit";

  // "account" mode recovers real customer.debitBalance: the transaction's own
  // "total - amountReceived" gap can overstate what's truly still owed on the
  // account if this sale was only partially added to it. Cap by whichever is
  // smaller. "sale" mode never touches the account, so it's just the sale's
  // own live remaining balance.
  const outstandingBalance =
    mode === "account"
      ? customer !== undefined && customer !== null
        ? Math.min(remaining, customer.debitBalance || 0)
        : remaining
      : remaining;

  // Store Credit is a hard cap -- can never move more than actually exists.
  // Real tenders (cash, mobile money, etc.) can exceed the outstanding
  // balance on purpose: the excess is banked as store credit, same as an
  // overpayment at checkout, so there's no hard cap for them.
  const hardCap = isStoreCredit ? Math.min(outstandingBalance, creditBalance) : Infinity;
  const prefillAmount = isStoreCredit ? hardCap : outstandingBalance;
  const overpayAmount = !isStoreCredit ? Math.max(0, (parseFloat(amount) || 0) - outstandingBalance) : 0;

  useEffect(() => {
    if (!hasEditedRef.current) {
      setAmount(prefillAmount.toString());
    }
  }, [prefillAmount]);

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }
    if (amountNum > hardCap + 0.01) {
      toast.error(`Cannot exceed the available store credit of ${formatCurrency(hardCap)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "account") {
        await addPayment({
          customerId: customerId as Id<"customers">,
          transactionId: transactionId as Id<"transactions">,
          amount: amountNum,
          paymentMethod,
        });
      } else {
        await recordSalePayment({
          transactionId: transactionId as Id<"transactions">,
          amount: amountNum,
          paymentMethod,
        });
      }
      toast.success(
        amountNum >= outstandingBalance - 0.01
          ? `${receiptNumber} closed — fully paid`
          : `Payment recorded for ${receiptNumber}`
      );
      onClose();
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md glass-panel bg-surface-container rounded-3xl shadow-2xl border border-white/50 overflow-hidden"
      >
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-white/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-secondary/10 text-secondary rounded-xl">
              <Wallet size={18} />
            </div>
            <div>
              <h3 className="font-headline-md text-lg text-primary">Record Payment</h3>
              <p className="font-label-caps text-[9px] text-outline tracking-widest">CLOSING {receiptNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full text-outline transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 bg-error/5 rounded-2xl border border-error/10 flex justify-between items-center">
            <span className="font-label-caps text-[10px] text-error">OUTSTANDING BALANCE</span>
            <span className="font-data-tabular text-lg font-bold text-error">{formatCurrency(outstandingBalance)}</span>
          </div>

          <div>
            <label className="font-label-caps text-[10px] text-outline block mb-2">PAYMENT METHOD</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m === "Store Credit" ? `Store Credit (${formatCurrency(creditBalance)})` : m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-label-caps text-[10px] text-outline block mb-2">AMOUNT</label>
            <input
              type="number"
              min="0.01"
              max={isStoreCredit ? hardCap : undefined}
              step="0.01"
              value={amount}
              onChange={(e) => {
                hasEditedRef.current = true;
                setAmount(e.target.value);
              }}
              className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-data-tabular"
            />
            <p className="font-label-caps text-[9px] text-outline mt-1.5">
              {isStoreCredit
                ? "This will consume the customer's store credit balance."
                : mode === "sale"
                  ? "Settles this sale only — the customer's account balance is not affected."
                  : "Pre-filled with the full balance — reduce it to record a partial payment."}
            </p>
            {overpayAmount > 0.01 && (
              <p className="font-label-caps text-[9px] text-emerald-600 mt-1.5">
                {formatCurrency(overpayAmount)} above the outstanding balance will be saved as store credit.
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-outline-variant/30 bg-white/40">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-secondary text-on-secondary rounded-2xl font-label-caps text-[11px] shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {isSubmitting ? "PROCESSING..." : "CONFIRM PAYMENT"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
