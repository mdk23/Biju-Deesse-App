import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Save } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES } from "./ExpenseFilters";

interface ExpenseFormDrawerProps {
  editingExpense: any | null; // null => create mode
  onClose: () => void;
}

const toDateInputValue = (ts?: number) => {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const ExpenseFormDrawer = ({ editingExpense, onClose }: ExpenseFormDrawerProps) => {
  const createExpense = useMutation(api.expenses.createExpense);
  const updateExpense = useMutation(api.expenses.updateExpense);

  const [title, setTitle] = useState(editingExpense?.title || "");
  const [category, setCategory] = useState(editingExpense?.category || EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount) : "");
  const [dueDate, setDueDate] = useState(() => toDateInputValue(editingExpense?.dueDate) || toDateInputValue(Date.now()));
  const [notes, setNotes] = useState(editingExpense?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!editingExpense;

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!amountNum || amountNum <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }
    if (!dueDate) {
      toast.error("Due date is required.");
      return;
    }

    const dueDateTs = new Date(`${dueDate}T00:00:00`).getTime();

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await updateExpense({
          id: editingExpense._id,
          title: title.trim(),
          category,
          amount: amountNum,
          dueDate: dueDateTs,
          notes: notes.trim() || undefined,
        });
        toast.success("Expense updated");
      } else {
        await createExpense({
          title: title.trim(),
          category,
          amount: amountNum,
          dueDate: dueDateTs,
          notes: notes.trim() || undefined,
        });
        toast.success("Expense created");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg h-full bg-surface-container shadow-2xl flex flex-col border-l border-white/40"
      >
        <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start bg-white/40 backdrop-blur-md">
          <h2 className="font-headline-md text-2xl text-primary">{isEdit ? "Edit Expense" : "New Expense"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full text-outline transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div>
            <label className="font-label-caps text-[10px] text-outline block mb-2">TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Shop rent - August"
              className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="font-label-caps text-[10px] text-outline block mb-2">CATEGORY</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-[10px] text-outline block mb-2">AMOUNT (Mt)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-data-tabular"
              />
            </div>
            <div>
              <label className="font-label-caps text-[10px] text-outline block mb-2">DUE DATE</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-data-tabular"
              />
            </div>
          </div>

          <div>
            <label className="font-label-caps text-[10px] text-outline block mb-2">NOTES (OPTIONAL)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="p-8 border-t border-outline-variant/30 bg-white/40 backdrop-blur-md sticky bottom-0">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            <Save size={16} /> {isSubmitting ? "SAVING..." : isEdit ? "SAVE CHANGES" : "CREATE EXPENSE"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
