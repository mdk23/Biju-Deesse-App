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

export default crons;
