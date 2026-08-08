import React from "react";
import { motion } from "framer-motion";
import { X, Info } from "lucide-react";
import { HEALTH_COLORS } from "./CustomerHealthChart";

interface HealthTierInfo {
  tier: string;
  summary: string;
  rules: string[];
}

const TIER_INFO: HealthTierInfo[] = [
  {
    tier: "New Client",
    summary: "Enrolled but hasn't completed a purchase yet.",
    rules: ["orderCount is 0 — checked first, before anything else"],
  },
  {
    tier: "At Risk",
    summary: "Needs attention — either overdue on a debt, gone quiet, or too thin on activity to qualify higher.",
    rules: [
      "Credit status is Overdue — this always wins, even for a huge spender with many orders",
      "Or: no purchase in the last 90 days (inactive)",
      "Or: active, but doesn't meet the order/spend bar for Growing Client",
    ],
  },
  {
    tier: "Growing Client",
    summary: "Building purchase frequency or spend. No debt check — a client can be Growing while carrying an Outstanding (not yet overdue) balance.",
    rules: ["Active (purchased in the last 90 days)", "orderCount ≥ 5, or totalSpent ≥ Mt 100,000"],
  },
  {
    tier: "Valuable Client",
    summary: "Strong buyer on frequency or spend — either threshold qualifies. Requires a clean credit standing.",
    rules: [
      "Active (purchased in the last 90 days)",
      "orderCount ≥ 20, or totalSpent ≥ Mt 500,000",
      "Credit status is not Outstanding (no unpaid debt, even if not yet overdue)",
    ],
  },
  {
    tier: "Elite Client",
    summary: "Top tier — both frequency and spend thresholds together, with a clean credit standing.",
    rules: [
      "Active (purchased in the last 90 days)",
      "orderCount ≥ 20 AND totalSpent ≥ Mt 500,000 (both required, unlike Valuable)",
      "Credit status is not Outstanding",
    ],
  },
];

interface ClientHealthGuideModalProps {
  onClose: () => void;
}

export const ClientHealthGuideModal = ({ onClose }: ClientHealthGuideModalProps) => {
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
        className="relative w-full max-w-2xl max-h-[85vh] glass-panel bg-surface-container rounded-3xl shadow-2xl border border-white/50 overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-white/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Info size={18} />
            </div>
            <div>
              <h3 className="font-headline-md text-lg text-primary">Client Health Guide</h3>
              <p className="font-label-caps text-[9px] text-outline tracking-widest">HOW EACH TIER IS COMPUTED</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full text-outline hover:text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Health is a deterministic rule ladder, evaluated top-down — not a weighted score. Each tier below is a hard
            gate; the first one a client matches is assigned, so higher tiers implicitly require passing every check
            above them too.
          </p>
          {TIER_INFO.map((info) => (
            <div key={info.tier} className="p-4 rounded-2xl border border-white/60 bg-white/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: HEALTH_COLORS[info.tier] }}></span>
                <h4 className="font-headline-md text-sm text-on-surface">{info.tier}</h4>
              </div>
              <p className="text-xs text-on-surface-variant mb-3">{info.summary}</p>
              <ul className="space-y-1.5">
                {info.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-on-surface-variant">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-outline shrink-0"></span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
