import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Wallet } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

const PAYMENT_METHODS = ["Cash", "M-Pesa", "e-Mola", "BCI", "BIM Cash", "Card", "Bank Transfer"];

interface PayExpenseModalProps {
  expense: any;
  onClose: () => void;
  formatCurrency: (v: number) => string;
}

const toDateTimeInputValue = (ts: number) => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const PayExpenseModal = ({ expense, onClose, formatCurrency }: PayExpenseModalProps) => {
  const payExpense = useMutation(api.expenses.payExpense);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(() => toDateTimeInputValue(Date.now()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await payExpense({
        id: expense._id,
        paymentMethod,
        paymentDate: new Date(paymentDate).getTime(),
      });
      toast.success("Expense marked as paid");
      onClose();
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to pay expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
            <h3 className="font-headline-md text-lg text-primary">Pay Expense</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full text-outline transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
            <div>
              <p className="font-body-md text-sm font-bold text-on-surface">{expense.title}</p>
              <p className="font-label-caps text-[9px] text-outline">{expense.category}</p>
            </div>
            <p className="font-data-tabular text-lg font-bold text-primary">{formatCurrency(expense.amount)}</p>
          </div>

          <div>
            <label className="font-label-caps text-[10px] text-outline block mb-2">PAYMENT METHOD</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {paymentMethod === "Cash" && (
              <p className="font-label-caps text-[9px] text-outline mt-1.5">
                Requires an open Caixa session with sufficient funds.
              </p>
            )}
          </div>

          <div>
            <label className="font-label-caps text-[10px] text-outline block mb-2">PAYMENT DATE</label>
            <input
              type="datetime-local"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-data-tabular"
            />
            <p className="font-label-caps text-[9px] text-outline mt-1.5">Can be backdated for late-entered payments.</p>
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
