import React from "react";

interface CustomerBalanceBadgeProps {
  creditBalance?: number;
  debitBalance?: number;
  formatCurrency: (v: number) => string;
  variant?: "compact" | "card";
}

/**
 * Single source of truth for the debit/credit/neutral decision + colors,
 * shared by CustomerTable, CustomerProfileDrawer, and POS's selected-customer
 * card, which previously each implemented this 3-state logic independently.
 */
export const CustomerBalanceBadge = ({
  creditBalance,
  debitBalance,
  formatCurrency,
  variant = "compact",
}: CustomerBalanceBadgeProps) => {
  const debit = debitBalance || 0;
  const credit = creditBalance || 0;
  const state = debit > 0 ? "debit" : credit > 0 ? "credit" : "neutral";

  if (variant === "card") {
    return (
      <div
        className={`col-span-2 p-4 rounded-2xl border flex justify-between items-center ${
          state === "debit"
            ? "bg-error/5 border-error/10"
            : state === "credit"
              ? "bg-primary/5 border-primary/10"
              : "bg-emerald-50 border-emerald-100"
        }`}
      >
        <div>
          <p
            className={`font-label-caps text-[9px] mb-1 ${
              state === "debit" ? "text-error" : state === "credit" ? "text-primary" : "text-emerald-700"
            }`}
          >
            CREDIT STATUS
          </p>
          <p
            className={`font-headline-md text-xl font-bold ${
              state === "debit" ? "text-error" : state === "credit" ? "text-primary" : "text-emerald-700"
            }`}
          >
            {formatCurrency(state === "debit" ? debit : state === "credit" ? credit : 0)}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              state === "debit"
                ? "bg-rose-100 text-rose-700"
                : state === "credit"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {state === "debit" ? "OUTSTANDING DEBT" : state === "credit" ? "STORE CREDIT" : "GOOD STANDING"}
          </span>
        </div>
      </div>
    );
  }

  if (state === "neutral") {
    return <span className="font-data-tabular text-sm text-outline opacity-50">No balance</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-data-tabular text-sm font-bold ${state === "debit" ? "text-error" : "text-emerald-600"}`}>
        {state === "debit" ? `Owes ${formatCurrency(debit)}` : formatCurrency(credit)}
      </span>
      <span className={`text-[9px] font-bold uppercase tracking-wider ${state === "debit" ? "text-error" : "text-emerald-600"}`}>
        {state === "debit" ? "DEBIT" : "STORE CREDIT"}
      </span>
    </div>
  );
};
