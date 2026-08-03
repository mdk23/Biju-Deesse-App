import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Pencil, Wallet, Ban, Trash2, History, Repeat } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "Paid":
      return "bg-secondary-container/20 text-secondary";
    case "Pending":
      return "bg-primary/10 text-primary";
    case "Overdue":
      return "bg-error-container/20 text-error";
    default:
      return "bg-surface-container-highest text-outline";
  }
};

interface ExpenseDetailDrawerProps {
  expenseId: string;
  userRole: string | undefined;
  onClose: () => void;
  onEdit: (expense: any) => void;
  onPay: (expense: any) => void;
  formatCurrency: (v: number) => string;
}

export const ExpenseDetailDrawer = ({ expenseId, userRole, onClose, onEdit, onPay, formatCurrency }: ExpenseDetailDrawerProps) => {
  const data = useQuery(api.expenses.get, { id: expenseId as any });
  const auditTrail = useQuery(api.expenses.getAuditTrail, { referenceId: expenseId });
  const cancelExpense = useMutation(api.expenses.cancelExpense);
  const deleteExpense = useMutation(api.expenses.deleteExpense);

  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!data) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-end">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-xl h-full bg-surface-container shadow-2xl flex items-center justify-center">
          <span className="font-label-caps text-xs text-outline animate-pulse">LOADING...</span>
        </div>
      </div>
    );
  }

  const { expense, template } = data;
  const canEdit = (userRole === "admin" || userRole === "manager") && (expense.status === "Pending" || expense.status === "Overdue");
  const canPay = canEdit;
  const canCancelPending = (userRole === "admin" || userRole === "manager") && (expense.status === "Pending" || expense.status === "Overdue");
  const canReversePaid = userRole === "admin" && expense.status === "Paid";
  const canDelete = userRole === "admin" && expense.status !== "Paid";

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await cancelExpense({ id: expenseId as any, reason: cancelReason.trim() });
      toast.success(expense.status === "Paid" ? "Expense payment reversed" : "Expense cancelled");
      setShowCancelForm(false);
      setCancelReason("");
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to cancel expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const doDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteExpense({ id: expenseId as any });
      toast.success("Expense deleted");
      onClose();
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to delete expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    toast.warning(`Delete "${expense.title}"?`, {
      description:
        expense.origin === "Recurring"
          ? "This is a recurring-generated expense. The next generation run will recreate it for this period unless you also disable or delete its template."
          : "This permanently removes the expense record.",
      action: {
        label: "Confirm Delete",
        onClick: doDelete,
      },
    });
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
        className="relative w-full max-w-xl h-full bg-surface-container shadow-2xl flex flex-col border-l border-white/40"
      >
        {/* Header */}
        <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start bg-white/40 backdrop-blur-md">
          <div>
            <h2 className="font-headline-md text-2xl text-primary">{expense.title}</h2>
            <p className="font-label-caps text-[10px] text-outline tracking-widest mt-1">
              DUE {new Date(expense.dueDate).toLocaleDateString()} • {expense.category.toUpperCase()}
            </p>
            <div className="mt-3 flex gap-2">
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${statusBadgeClass(expense.status)}`}>
                {expense.status.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-surface-container-highest text-outline text-[9px] font-bold flex items-center gap-1">
                {expense.origin === "Recurring" && <Repeat size={10} />}
                {expense.origin.toUpperCase()}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full text-outline transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* General Info */}
          <section>
            <h4 className="font-label-caps text-[11px] text-outline mb-4">GENERAL INFORMATION</h4>
            <div className="bg-surface-container-highest p-6 rounded-3xl space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-body-md">Amount</span>
                <span className="font-data-tabular font-bold text-xl text-primary">{formatCurrency(expense.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-body-md">Due Date</span>
                <span className="font-data-tabular font-bold">{new Date(expense.dueDate).toLocaleDateString()}</span>
              </div>
              {expense.notes && (
                <div className="pt-3 border-t border-outline-variant/30">
                  <span className="text-on-surface-variant font-body-md text-xs">Notes</span>
                  <p className="text-sm mt-1 text-on-surface">{expense.notes}</p>
                </div>
              )}
            </div>
          </section>

          {/* Payment Info */}
          {expense.status === "Paid" && (
            <section>
              <h4 className="font-label-caps text-[11px] text-outline mb-4">PAYMENT INFORMATION</h4>
              <div className="bg-secondary-container/10 p-6 rounded-3xl space-y-3 border border-secondary/10">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant font-body-md">Payment Method</span>
                  <span className="font-data-tabular font-bold">{expense.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant font-body-md">Payment Date</span>
                  <span className="font-data-tabular font-bold">
                    {expense.paymentDate ? new Date(expense.paymentDate).toLocaleString() : "-"}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Template Info */}
          {template && (
            <section>
              <h4 className="font-label-caps text-[11px] text-outline mb-4">RECURRING TEMPLATE</h4>
              <div className="bg-primary/5 p-6 rounded-3xl space-y-3 border border-primary/10">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant font-body-md">Template</span>
                  <span className="font-bold">{template.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant font-body-md">Frequency</span>
                  <span className="font-bold">{template.frequency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant font-body-md">Template Status</span>
                  <span className={`font-bold ${template.active ? "text-secondary" : "text-error"}`}>
                    {template.active ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Audit Timeline */}
          <section>
            <h4 className="font-label-caps text-[11px] text-outline mb-4 flex items-center gap-2">
              <History size={14} /> AUDIT TIMELINE
            </h4>
            {!auditTrail || auditTrail.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-primary/5 text-outline text-sm">
                No audit history for this expense.
              </div>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((log) => (
                  <div key={log._id} className="flex items-start gap-3 p-3 bg-white/40 rounded-xl border border-white/60">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-label-caps text-[10px] text-primary">{log.action.replace(/_/g, " ")}</p>
                      <p className="font-data-tabular text-[10px] text-outline">
                        {new Date(log.timestamp).toLocaleString()} • {log.userId}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Inline Cancel/Reverse Form */}
          {showCancelForm && (
            <section className="p-4 bg-error/5 border border-error/20 rounded-2xl space-y-3">
              <label className="font-label-caps text-[10px] text-error block">
                {expense.status === "Paid" ? "REASON FOR REVERSAL" : "REASON FOR CANCELLATION"}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-white border border-error/20 rounded-xl text-xs outline-none focus:ring-2 focus:ring-error/20"
                placeholder="Explain why this expense is being cancelled..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-error text-white rounded-xl font-label-caps text-[10px] disabled:opacity-60"
                >
                  CONFIRM
                </button>
                <button
                  onClick={() => setShowCancelForm(false)}
                  className="flex-1 py-2 bg-white border border-outline-variant/30 rounded-xl font-label-caps text-[10px]"
                >
                  DISMISS
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-outline-variant/30 bg-white/40 backdrop-blur-md sticky bottom-0">
          <div className="grid grid-cols-4 gap-3">
            <button
              disabled={!canEdit}
              onClick={() => onEdit(expense)}
              className="flex flex-col items-center gap-2 p-3 bg-white border border-outline-variant/30 rounded-2xl text-primary hover:bg-primary/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <Pencil size={18} />
              <span className="font-label-caps text-[8px]">EDIT</span>
            </button>
            <button
              disabled={!canPay}
              onClick={() => onPay(expense)}
              className="flex flex-col items-center gap-2 p-3 bg-white border border-secondary/20 rounded-2xl text-secondary hover:bg-secondary/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <Wallet size={18} />
              <span className="font-label-caps text-[8px]">PAY</span>
            </button>
            <button
              disabled={!canCancelPending && !canReversePaid}
              onClick={() => setShowCancelForm(true)}
              className="flex flex-col items-center gap-2 p-3 bg-white border border-error/20 rounded-2xl text-error hover:bg-error/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <Ban size={18} />
              <span className="font-label-caps text-[8px]">{expense.status === "Paid" ? "REVERSE" : "CANCEL"}</span>
            </button>
            <button
              disabled={!canDelete || isSubmitting}
              onClick={handleDelete}
              className="flex flex-col items-center gap-2 p-3 bg-white border border-error/20 rounded-2xl text-error hover:bg-error/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <Trash2 size={18} />
              <span className="font-label-caps text-[8px]">DELETE</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
