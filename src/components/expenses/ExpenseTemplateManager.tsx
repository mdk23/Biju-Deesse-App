import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Pencil, Trash2, Repeat, ArrowLeft, Save, Zap } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { useAuth } from "../AuthProvider";
import { EXPENSE_CATEGORIES } from "./ExpenseFilters";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toDateInputValue = (ts?: number) => {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface ExpenseTemplateManagerProps {
  onClose: () => void;
  formatCurrency: (v: number) => string;
}

export const ExpenseTemplateManager = ({ onClose, formatCurrency }: ExpenseTemplateManagerProps) => {
  const { user } = useAuth();
  const templates = useQuery(api.expenseTemplates.list, {}) || [];
  const createTemplate = useMutation(api.expenseTemplates.createRecurringTemplate);
  const updateTemplate = useMutation(api.expenseTemplates.updateTemplate);
  const setTemplateActive = useMutation(api.expenseTemplates.setTemplateActive);
  const deleteTemplate = useMutation(api.expenseTemplates.deleteTemplate);
  const runGenerationNow = useMutation(api.expenseTemplates.runRecurringGenerationNow);
  const [isGenerating, setIsGenerating] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"Daily" | "Weekly" | "Monthly">("Monthly");
  const [dueDay, setDueDay] = useState("1");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startDate, setStartDate] = useState(() => toDateInputValue(Date.now()));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const canManage = user?.role === "admin" || user?.role === "manager";
  const canDelete = user?.role === "admin";

  const openCreateForm = () => {
    setEditingTemplate(null);
    setName("");
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount("");
    setFrequency("Monthly");
    setDueDay("1");
    setDayOfWeek("1");
    setStartDate(toDateInputValue(Date.now()));
    setEndDate("");
    setNotes("");
    setShowForm(true);
  };

  const openEditForm = (template: any) => {
    setEditingTemplate(template);
    setName(template.name);
    setCategory(template.category);
    setAmount(String(template.amount));
    setFrequency(template.frequency);
    setDueDay(String(template.dueDay ?? 1));
    setDayOfWeek(String(template.dayOfWeek ?? 1));
    setStartDate(toDateInputValue(template.startDate));
    setEndDate(toDateInputValue(template.endDate));
    setNotes(template.notes || "");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (!name.trim()) return toast.error("Name is required.");
    if (!amountNum || amountNum <= 0) return toast.error("Amount must be greater than zero.");
    if (!startDate) return toast.error("Start date is required.");

    const payload = {
      name: name.trim(),
      category,
      amount: amountNum,
      frequency,
      dueDay: frequency === "Monthly" ? parseInt(dueDay, 10) : undefined,
      dayOfWeek: frequency === "Weekly" ? parseInt(dayOfWeek, 10) : undefined,
      startDate: new Date(`${startDate}T00:00:00`).getTime(),
      endDate: endDate ? new Date(`${endDate}T00:00:00`).getTime() : undefined,
      notes: notes.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate._id, ...payload });
        toast.success("Template updated");
      } else {
        await createTemplate(payload);
        toast.success("Recurring template created");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (template: any) => {
    try {
      await setTemplateActive({ id: template._id, active: !template.active });
      toast.success(template.active ? "Template disabled" : "Template enabled");
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to update template");
    }
  };

  const handleDelete = (template: any) => {
    toast.warning(`Delete "${template.name}"?`, {
      description: "This stops future generation permanently. Expenses already generated from it are kept.",
      action: {
        label: "Confirm Delete",
        onClick: async () => {
          try {
            await deleteTemplate({ id: template._id });
            toast.success("Template deleted");
          } catch (err: any) {
            toast.error(err.data || err.message || "Failed to delete template");
          }
        },
      },
    });
  };

  const handleGenerateNow = async () => {
    setIsGenerating(true);
    try {
      const result = await runGenerationNow({});
      if (result.generated > 0) {
        toast.success(`Generated ${result.generated} expense${result.generated === 1 ? "" : "s"} for the current period.`);
      } else {
        toast.info("Nothing to generate — every active template is already up to date for its current period.");
      }
    } catch (err: any) {
      toast.error(err.data || err.message || "Failed to run generation");
    } finally {
      setIsGenerating(false);
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
        <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start bg-white/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {showForm && (
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-primary/5 rounded-full text-outline">
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="font-headline-md text-2xl text-primary flex items-center gap-2">
              <Repeat size={20} /> {showForm ? (editingTemplate ? "Edit Template" : "New Template") : "Recurring Templates"}
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
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={openCreateForm}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-lg hover:scale-[1.01] transition-all"
                  >
                    <Plus size={16} /> NEW TEMPLATE
                  </button>
                  <button
                    onClick={handleGenerateNow}
                    disabled={isGenerating}
                    title="Runs the same logic as tonight's cron, right now — safe to click even if it already ran today."
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-secondary/20 text-secondary rounded-2xl font-label-caps text-[11px] shadow-sm hover:bg-secondary/5 transition-all disabled:opacity-60"
                  >
                    <Zap size={16} /> {isGenerating ? "GENERATING..." : "GENERATE NOW"}
                  </button>
                </div>
              )}

              {templates.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-primary/5 text-outline text-sm">
                  No recurring templates yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((t) => (
                    <div key={t._id} className="p-4 bg-white/50 rounded-2xl border border-white/60">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-body-md text-sm font-bold text-on-surface">{t.name}</p>
                          <p className="font-label-caps text-[9px] text-outline">
                            {t.category} • {t.frequency}
                            {t.frequency === "Monthly" && ` (day ${t.dueDay})`}
                            {t.frequency === "Weekly" && ` (${WEEKDAYS[t.dayOfWeek ?? 0]})`}
                          </p>
                        </div>
                        <p className="font-data-tabular text-sm font-bold text-primary">{formatCurrency(t.amount)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/20">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${t.active ? "bg-secondary-container/20 text-secondary" : "bg-surface-container-highest text-outline"}`}>
                          {t.active ? "ACTIVE" : "DISABLED"}
                        </span>
                        <div className="flex items-center gap-1">
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleToggleActive(t)}
                                className="px-3 py-1.5 text-[9px] font-label-caps rounded-lg bg-white border border-outline-variant/30 hover:bg-primary/5 text-primary"
                              >
                                {t.active ? "DISABLE" : "ENABLE"}
                              </button>
                              <button onClick={() => openEditForm(t)} className="p-1.5 hover:bg-primary/10 rounded-full text-primary">
                                <Pencil size={14} />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(t)} className="p-1.5 hover:bg-error/10 rounded-full text-error">
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
            <div className="space-y-5">
              <div>
                <label className="font-label-caps text-[10px] text-outline block mb-2">NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly shop rent"
                  className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="font-label-caps text-[10px] text-outline block mb-2">CATEGORY</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
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
                    className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-data-tabular"
                  />
                </div>
                <div>
                  <label className="font-label-caps text-[10px] text-outline block mb-2">FREQUENCY</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as "Daily" | "Weekly" | "Monthly")}
                    className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {frequency === "Monthly" && (
                <div>
                  <label className="font-label-caps text-[10px] text-outline block mb-2">DUE DAY OF MONTH (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-data-tabular"
                  />
                </div>
              )}

              {frequency === "Weekly" && (
                <div>
                  <label className="font-label-caps text-[10px] text-outline block mb-2">DAY OF WEEK</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  >
                    {WEEKDAYS.map((day, idx) => (
                      <option key={day} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-[10px] text-outline block mb-2">START DATE</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-data-tabular"
                  />
                </div>
                <div>
                  <label className="font-label-caps text-[10px] text-outline block mb-2">END DATE (OPTIONAL)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-data-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-caps text-[10px] text-outline block mb-2">NOTES (OPTIONAL)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-white/60 border border-primary/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-on-primary rounded-2xl font-label-caps text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <Save size={16} /> {isSubmitting ? "SAVING..." : editingTemplate ? "SAVE CHANGES" : "CREATE TEMPLATE"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
