import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Trash2, AlertCircle, Wallet, PiggyBank } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "../AuthProvider";
import { RecordPaymentModal } from "./RecordPaymentModal";

interface SaleDetailDrawerProps {
  selectedSale: any;
  onClose: () => void;
  onRemoveSale: (id: string) => void;
  formatCurrency: (v: number) => string;
}

export const SaleDetailDrawer = ({
  selectedSale,
  onClose,
  onRemoveSale,
  formatCurrency,
}: SaleDetailDrawerProps) => {
  const { user } = useAuth();
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isAddingToAccount, setIsAddingToAccount] = useState(false);
  const addRemainingToCustomerAccount = useMutation(api.transactions.addRemainingToCustomerAccount);
  const payments = useQuery(
    api.payments.getForTransaction,
    selectedSale?._id ? { transactionId: selectedSale._id as Id<"transactions"> } : "skip"
  );

  const canManagePayment =
    (user?.role === "admin" || user?.role === "manager") &&
    selectedSale.customerId &&
    (selectedSale.balance || 0) > 0;
  const debtAddedToAccount = !!selectedSale.debtAddedToAccount;

  const handleAddToAccount = async () => {
    setIsAddingToAccount(true);
    try {
      await addRemainingToCustomerAccount({ transactionId: selectedSale._id as Id<"transactions"> });
      toast.success("Outstanding balance added to the customer's account.");
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to add balance to account");
    } finally {
      setIsAddingToAccount(false);
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
        className="relative w-full max-w-xl h-full bg-surface-container shadow-2xl flex flex-col border-l border-white/40"
      >
        {/* Drawer Header */}
        <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start bg-white/40 backdrop-blur-md">
          <div>
            <h2 className="font-headline-md text-2xl text-primary">
              {selectedSale.receiptNumber?.replace("INV-", "ORD-")}
            </h2>
            <p className="font-label-caps text-[10px] text-outline tracking-widest mt-1">
              TRANSACTION COMPLETED ON {new Date(selectedSale._creationTime).toLocaleDateString()} AT{" "}
              {new Date(selectedSale._creationTime).toLocaleTimeString()} BY{" "}
              {selectedSale.cashierName?.toUpperCase() || "SYSTEM"}
            </p>
            <div className="mt-3 flex gap-2">
              <span
                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                  selectedSale.status === "Paid" ? "bg-secondary-container/20 text-secondary" : "bg-primary/10 text-primary"
                }`}
              >
                {selectedSale.status.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-surface-container-highest text-outline text-[9px] font-bold">
                {selectedSale.paymentMethod?.toUpperCase() || "UNKNOWN"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full text-outline transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Customer Section */}
          <section>
            <h4 className="font-label-caps text-[11px] text-outline mb-4">CUSTOMER INSIGHT</h4>
            <div className="bg-atelier-gradient p-6 rounded-3xl border border-primary/10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-primary font-bold text-xl">
                {(selectedSale.customerName || "Walk-in")[0]}
              </div>
              <div>
                <p className="font-headline-md text-lg text-primary">{selectedSale.customerName || "Walk-in"}</p>
                <p className="font-label-caps text-[10px] text-primary/70">
                  {selectedSale.customerTier || "Regular"} CLIENT • PREVIOUS PURCHASES: 12
                </p>
              </div>
            </div>
          </section>

          {/* Line Items */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-label-caps text-[11px] text-outline">LINE ITEMS</h4>
              <span className="font-label-caps text-[11px] text-primary">
                {(selectedSale.items || []).length} ITEMS
              </span>
            </div>
            <div className="space-y-4">
              {(selectedSale.items || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/40 rounded-2xl border border-white/60">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md">
                    <img src={item.photo || undefined} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-body-md text-sm font-bold text-on-surface">{item.name}</p>
                    <p className="font-data-tabular text-xs text-outline">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-data-tabular text-sm font-bold text-primary">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Financial Breakdown */}
          <section>
            <h4 className="font-label-caps text-[11px] text-outline mb-4">PAYMENT BREAKDOWN</h4>
            <div className="bg-surface-container-highest p-6 rounded-3xl space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-body-md">Subtotal</span>
                <span className="font-data-tabular font-bold">{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant font-body-md">Discount</span>
                  <span className="font-data-tabular font-bold text-error">
                    -{formatCurrency(selectedSale.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-outline-variant/30 pt-3">
                <span className="text-on-surface font-bold font-headline-md">Invoice Total</span>
                <span className="font-data-tabular font-bold text-xl text-primary">
                  {formatCurrency(selectedSale.total)}
                </span>
              </div>

              {/* Change Given */}
              {(selectedSale.changeGiven || 0) > 0 && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-on-surface-variant font-body-md">
                    Change Given {selectedSale.changeHandling ? `(${selectedSale.changeHandling})` : ""}
                  </span>
                  <span className="font-data-tabular font-bold text-amber-600">
                    {formatCurrency(selectedSale.changeGiven || 0)}
                  </span>
                </div>
              )}

              {selectedSale.balance > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-error/5 border border-error/10 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-error font-bold flex items-center gap-1">
                      <AlertCircle size={14} /> Outstanding Balance
                    </span>
                    <span className="font-data-tabular font-bold text-error">
                      {formatCurrency(selectedSale.balance)}
                    </span>
                  </div>
                  {canManagePayment && (
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => setIsRecordingPayment(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-error/20 text-error rounded-xl font-label-caps text-[10px] hover:bg-error/5 transition-all"
                      >
                        <Wallet size={14} /> RECORD PAYMENT
                      </button>
                      {!debtAddedToAccount && (
                        <button
                          onClick={handleAddToAccount}
                          disabled={isAddingToAccount}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-primary/20 text-primary rounded-xl font-label-caps text-[10px] hover:bg-primary/5 transition-all disabled:opacity-60"
                        >
                          <PiggyBank size={14} /> {isAddingToAccount ? "ADDING..." : "ADD TO ACCOUNT"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Payment History */}
          <section>
            <h4 className="font-label-caps text-[11px] text-outline mb-4">PAYMENT HISTORY</h4>
            {payments === undefined ? (
              <p className="font-body-md text-xs text-outline">Loading…</p>
            ) : payments.length === 0 ? (
              <p className="font-body-md text-xs text-outline">No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/60">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-white/60">
                    <tr className="font-label-caps text-[9px] text-outline">
                      <th className="px-4 py-3">DATE</th>
                      <th className="px-4 py-3">METHOD</th>
                      <th className="px-4 py-3">AMOUNT</th>
                      <th className="px-4 py-3">STATUS</th>
                      <th className="px-4 py-3">REFERENCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 bg-white/30">
                    {[...payments]
                      .sort((a: any, b: any) => a.paymentDate - b.paymentDate)
                      .map((p: any) => (
                        <tr key={p._id}>
                          <td className="px-4 py-3 font-data-tabular text-xs text-on-surface-variant">
                            {new Date(p.paymentDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-body-md text-xs">{p.paymentMethod}</td>
                          <td className="px-4 py-3 font-data-tabular font-bold text-emerald-600">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-4 py-3 text-xs text-on-surface-variant">{p.status}</td>
                          <td className="px-4 py-3 text-xs text-outline">{p.reference || "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-8 border-t border-outline-variant/30 bg-white/40 backdrop-blur-md sticky bottom-0">
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center gap-2 p-3 bg-white border border-outline-variant/30 rounded-2xl text-primary hover:bg-primary/5 transition-all">
              <Printer size={18} />
              <span className="font-label-caps text-[8px]">PRINT</span>
            </button>
            <button
              onClick={() => onRemoveSale(selectedSale._id)}
              className="flex flex-col items-center gap-2 p-3 bg-white border border-error/20 rounded-2xl text-error hover:bg-error/5 transition-all"
            >
              <Trash2 size={18} />
              <span className="font-label-caps text-[8px]">PURGE</span>
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isRecordingPayment && (
          <RecordPaymentModal
            mode={debtAddedToAccount ? "account" : "sale"}
            transactionId={selectedSale._id}
            customerId={selectedSale.customerId}
            receiptNumber={selectedSale.receiptNumber?.replace("INV-", "ORD-") || selectedSale._id}
            remaining={selectedSale.balance}
            onClose={() => setIsRecordingPayment(false)}
            formatCurrency={formatCurrency}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
