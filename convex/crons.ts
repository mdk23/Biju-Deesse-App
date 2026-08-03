import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run loyalty level decay and customer score sweeps weekly every Sunday at midnight
crons.cron(
  "weekly-customer-intelligence-decay-sweep",
  "0 0 * * 0", // weekly Sunday at 00:00
  internal.intelligence.runLoyaltyDecaySweep,
  {}
);

// Generate the current period's expense for every active recurring template
crons.cron(
  "daily-recurring-expense-generation",
  "0 0 * * *", // daily at 00:00 UTC
  internal.expenseTemplates.generateRecurringExpensesSweep,
  {}
);

// Flip stale Pending expenses whose due date has passed to Overdue
crons.cron(
  "daily-expense-overdue-sweep",
  "5 0 * * *", // daily at 00:05 UTC
  internal.expenses.sweepOverdueExpenses,
  {}
);

export default crons;
