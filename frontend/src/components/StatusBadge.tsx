import React from "react";
import type { IncidentSeverity, OfficialStatus } from "../api/types";

interface StatusBadgeProps {
  status?: OfficialStatus;
  severity?: IncidentSeverity;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  severity,
  size = "md",
}) => {
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  if (severity) {
    switch (severity) {
      case "P0":
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-red-100 text-red-800 border border-red-200 ${padding}`}
          >
            ?? P0 EMERGENCY
          </span>
        );
      case "P1":
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-200 ${padding}`}
          >
            ?? P1 MAJOR
          </span>
        );
      case "P2":
      default:
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${padding}`}
          >
            ?? P2 ROUTINE
          </span>
        );
    }
  }

  if (status) {
    switch (status) {
      case "PENDING":
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-300 ${padding}`}
          >
            ? PENDING
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-sky-100 text-sky-900 border border-sky-300 ${padding}`}
          >
            ??? IN PROGRESS
          </span>
        );
      case "RESOLVED":
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-green-100 text-green-900 border border-green-300 ${padding}`}
          >
            ? RESOLVED
          </span>
        );
    }
  }

  return null;
};
