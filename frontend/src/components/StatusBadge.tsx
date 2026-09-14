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
            className={`inline-flex items-center font-semibold rounded-full bg-hazard-p0-light text-hazard-p0 border border-hazard-p0-border ${padding}`}
          >
            🚨 P0 EMERGENCY
          </span>
        );
      case "P1":
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-hazard-p1-light text-hazard-p1 border border-hazard-p1-border ${padding}`}
          >
            ⚠️ P1 MAJOR
          </span>
        );
      case "P2":
      default:
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-hazard-p2-light text-hazard-p2 border border-hazard-p2-border ${padding}`}
          >
            ℹ️ P2 ROUTINE
          </span>
        );
    }
  }

  if (status) {
    switch (status) {
      case "PENDING":
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-hazard-p1-light text-status-pending border border-hazard-p1-border ${padding}`}
          >
            ⏳ PENDING
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-sky-50 text-status-inProgress border border-sky-200 ${padding}`}
          >
            🔄 IN PROGRESS
          </span>
        );
      case "RESOLVED":
        return (
          <span
            className={`inline-flex items-center font-semibold rounded-full bg-green-50 text-status-resolved border border-green-200 ${padding}`}
          >
            ✅ RESOLVED
          </span>
        );
    }
  }

  return null;
};
