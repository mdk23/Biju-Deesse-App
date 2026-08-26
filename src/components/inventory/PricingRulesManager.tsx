import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Pencil, Trash2, Tag, ArrowLeft, Save, Search } from "lucide-react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useAuth } from "../AuthProvider";

interface TierRow {
  quantityThreshold: string;
  unitPrice: string;
}

interface PricingRulesManagerProps {
  onClose: () => void;
  formatCurrency: (v: number) => string;
}

const tierSummary = (tiers: { quantityThreshold: number; unitPrice: number }[], formatCurrency: (v: number) => string) =>
  [...tiers]
    .sort((a, b) => a.quantityThreshold - b.quantityThreshold)
    .map((t) => `${t.quantityThreshold}+ → ${formatCurrency(t.unitPrice)}`)
    .join(", ");

export const PricingRulesManager = ({ onClose, formatCurrency }: PricingRulesManagerProps) => {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";
  const canDelete = user?.role === "admin";

  const convex = useConvex();
  const data = useQuery(api.pricingRules.list, {});
  const rules = data?.rules || [];
  const claimedProductNames: Record<string, string> = data?.claimedProductNames || {};
  const products = useQuery(api.products.list, { archived: false }) || [];

  const createRule = useMutation(api.pricingRules.create);
  const updateRule = useMutation(api.pricingRules.update);
  const setActive = useMutation(api.pricingRules.setActive);
  const deleteRule = useMutation(api.pricingRules.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [tiers, setTiers] = useState<TierRow[]>([{ quantityThreshold: "", unitPrice: "" }]);
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, boolean>>({});
  const [productSearch, setProductSearch] = useState("");

  const openCreateForm = () => {
    setEditingRule(null);
    setName("");
    setTiers([{ quantityThreshold: "", unitPrice: "" }]);
    setSelectedProductIds({});
    setProductSearch("");
    setShowForm(true);
  };

  const openEditForm = async (rule: any) => {
    setEditingRule(rule);
    setName(rule.name);
    setTiers(
      [...rule.tiers]
        .sort((a: any, b: any) => a.quantityThreshold - b.quantityThreshold)
        .map((t: any) => ({ quantityThreshold: String(t.quantityThreshold), unitPrice: String(t.unitPrice) }))
    );
    setProductSearch("");
    setShowForm(true);
    // One-off fetch (not a live query) of this rule's current products, same
    // pattern as Inventory.tsx's on-demand export query via useConvex().
    const productIds = await convex.query(api.pricingRules.getProductIdsForRule, { pricingRuleId: rule._id });
    setSelectedProductIds(Object.fromEntries(productIds.map((id: string) => [id, true])));
  };

  const addTierRow = () => setTiers((prev) => [...prev, { quantityThreshold: "", unitPrice: "" }]);
  const removeTierRow = (index: number) => setTiers((prev) => prev.filter((_, i) => i !== index));
  const updateTierRow = (index: number, field: keyof TierRow, value: string) =>
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));

  const toggleProduct = (productId: string, checked: boolean) =>
    setSelectedProductIds((prev) => ({ ...prev, [productId]: checked }));

  const filteredProducts = products.filter((p: any) =>
    !productSearch ||
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.code || "").toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectableIds = filteredProducts
    .filter((p: any) => !claimedProductNames[p._id] || claimedProductNames[p._id] === editingRule?.name)
    .map((p: any) => p._id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id: string) => selectedProductIds[id]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedProductIds((prev) => {
        const next = { ...prev };
        for (const id of selectableIds) delete next[id];
        return next;
      });
    } else {
      setSelectedProductIds((prev) => ({ ...prev, ...Object.fromEntries(selectableIds.map((id: string) => [id, true])) }));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Rule name is required.");
    if (tiers.length === 0) return toast.error("Add at least one quantity tier.");

    const parsedTiers: { quantityThreshold: number; unitPrice: number }[] = [];
    const seen = new Set<number>();
    for (const t of tiers) {
      const qty = parseInt(t.quantityThreshold, 10);
      const price = parseFloat(t.unitPrice);
      if (!Number.isInteger(qty) || qty < 1) return toast.error("Each quantity must be a whole number of 1 or more.");
      if (isNaN(price) || price < 0) return toast.error("Each price must be zero or more.");
      if (seen.has(qty)) return toast.error(`Duplicate threshold: ${qty}+ is used more than once.`);
      seen.add(qty);
      parsedTiers.push({ quantityThreshold: qty, unitPrice: price });
    }

    const productIds = Object.keys(selectedProductIds).filter((id) => selectedProductIds[id]) as Id<"products">[];

    setIsSubmitting(true);
    try {
      if (editingRule) {
        await updateRule({ id: editingRule._id, name: name.trim(), tiers: parsedTiers, productIds });
        toast.success("Pricing rule updated");
      } else {
        await createRule({ name: name.trim(), tiers: parsedTiers, productIds });
        toast.success("Pricing rule created");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to save pricing rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (rule: any) => {
    try {
      await setActive({ id: rule._id, active: !rule.active });
      toast.success(rule.active ? "Rule disabled" : "Rule enabled");
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to update rule");
    }
  };

  const handleDelete = (rule: any) => {
    toast.warning(`Delete "${rule.name}"?`, {
      description: "Past sales already using this rule's prices are unaffected. This cannot be undone.",
      action: {
        label: "Confirm Delete",
        onClick: async () => {
          try {
            await deleteRule({ id: rule._id });
            toast.success("Pricing rule deleted");
          } catch (err: any) {
            toast.error(err.data || err.message || "Failed to delete pricing rule");
          }
        },
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
        <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start bg-white/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {showForm && (
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-primary/5 rounded-full text-outline">
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="font-headline-md text-2xl text-primary flex items-center gap-2">
              <Tag size={20} /> {showForm ? (editingRule ? "Edit Pricing Rule" : "New Pricing Rule") : "Pricing Rules"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full text-outline transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {!showForm ? (
            <>
              {canManage && (
                <button
                  onClick={openCreateForm}
                  className="w-full flex items-center justify-center gap-2 py-3 mb-6 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-lg hover:scale-[1.01] transition-all"
                >
                  <Plus size={16} /> NEW RULE
                </button>
              )}

              {rules.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-primary/5 text-outline text-sm">
                  No pricing rules yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((r: any) => (
                    <div key={r._id} className="p-4 bg-white/50 rounded-2xl border border-white/60">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <p className="font-body-md text-sm font-bold text-on-surface truncate">{r.name}</p>
                          <p className="font-data-tabular text-[11px] text-outline mt-1">{tierSummary(r.tiers, formatCurrency)}</p>
                          <p className="font-label-caps text-[9px] text-outline mt-1">
                            {r.productCount} PRODUCT{r.productCount === 1 ? "" : "S"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/20">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${r.active ? "bg-secondary-container/20 text-secondary" : "bg-surface-container-highest text-outline"}`}>
                          {r.active ? "ACTIVE" : "DISABLED"}
                        </span>
                        <div className="flex items-center gap-1">
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleToggleActive(r)}
                                className="px-3 py-1.5 text-[9px] font-label-caps rounded-lg bg-white border border-outline-variant/30 hover:bg-primary/5 text-primary"
                              >
                                {r.active ? "DISABLE" : "ENABLE"}
                              </button>
                              <button onClick={() => openEditForm(r)} className="p-1.5 hover:bg-primary/10 rounded-full text-primary">
                                <Pencil size={14} />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(r)} className="p-1.5 hover:bg-error/10 rounded-full text-error">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="font-label-caps text-[10px] text-outline block mb-2">RULE NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bulk Bracelet Pricing"
                  className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="font-label-caps text-[10px] text-outline block mb-2">PRICING TIERS</label>
                <div className="space-y-2">
                  {tiers.map((tier, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Quantity"
                          value={tier.quantityThreshold}
                          onChange={(e) => updateTierRow(i, "quantityThreshold", e.target.value)}
                          className="w-full pl-4 pr-8 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-data-tabular"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline text-xs">+</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit price"
                        value={tier.unitPrice}
                        onChange={(e) => updateTierRow(i, "unitPrice", e.target.value)}
                        className="flex-1 px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-data-tabular"
                      />
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTierRow(i)}
                          className="p-2 text-outline/50 hover:text-error transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addTierRow}
                  className="mt-3 text-xs font-label-caps text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> ADD TIER
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-label-caps text-[10px] text-outline">APPLY TO PRODUCTS</label>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[10px] font-label-caps text-primary hover:underline"
                  >
                    {allSelected ? "CLEAR ALL" : "SELECT ALL"}
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/60 border border-primary/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-primary/10 divide-y divide-primary/5">
                  {filteredProducts.length === 0 ? (
                    <p className="p-4 text-center text-xs text-outline">No products match.</p>
                  ) : (
                    filteredProducts.map((p: any) => {
                      const claimedBy = claimedProductNames[p._id];
                      const disabled = !!claimedBy && claimedBy !== editingRule?.name;
                      const checked = !!selectedProductIds[p._id];
                      return (
                        <label
                          key={p._id}
                          className={`flex justify-between items-center px-4 py-2.5 ${
                            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white/60"
                          } ${checked ? "bg-primary/5" : "bg-white/30"}`}
                        >
                          <span className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) => toggleProduct(p._id, e.target.checked)}
                              className="accent-primary"
                            />
                            <span className="text-xs">
                              <span className="font-body-md text-on-surface">{p.name}</span>
                              {p.code && <span className="text-outline"> · {p.code}</span>}
                            </span>
                          </span>
                          {disabled ? (
                            <span className="text-[9px] font-label-caps text-outline">CLAIMED BY: {claimedBy}</span>
                          ) : (
                            <span className="text-[10px] font-data-tabular text-outline">{formatCurrency(p.sellingPrice)}</span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <Save size={16} /> {isSubmitting ? "SAVING..." : editingRule ? "SAVE CHANGES" : "CREATE RULE"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
