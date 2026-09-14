import React, { useState } from "react";
import { CheckCircle2, Copy, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { AuthorityOrg } from "../api/types";

interface SuccessCardProps {
  trackingId: string;
  targetAuthority: AuthorityOrg;
  onReset: () => void;
  communityCount?: number;
}

export const SuccessCard: React.FC<SuccessCardProps> = ({
  trackingId,
  targetAuthority,
  onReset,
  communityCount = 3,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAuthorityFullName = (org: AuthorityOrg) => {
    switch (org) {
      case "KWSC":
        return "Karachi Water & Sewerage Corporation (KW&SC)";
      case "KMC":
        return "Karachi Metropolitan Corporation (KMC)";
      case "SSWMB":
        return "Sindh Solid Waste Management Board (SSWMB)";
      case "CANTONMENT":
        return "Cantonment Boards Administration (CBC/MOC)";
      default:
        return org;
    }
  };

  return (
    <div className="max-w-md w-full bg-surface border border-surface-border rounded-2xl shadow-lg overflow-hidden text-center mx-auto animate-in fade-in zoom-in-95 duration-150">
      {/* Accent top bar */}
      <div className="h-1 bg-primary" />
      <div className="p-6 sm:p-8">
      {/* Success Badge Icon */}
      <div className="h-16 w-16 bg-primary text-primary-on rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-primary-light shadow-md">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary bg-primary-light px-2.5 py-1 rounded-full border border-primary/20 mb-2">
        <ShieldCheck className="w-3.5 h-3.5" />
        Verified Civic Redressal
      </span>

      <h2 className="text-2xl font-extrabold text-typography-primary tracking-tight mt-1">
        Grievance Formally Filed
      </h2>
      <p className="text-sm text-typography-muted mt-1">
        Your complaint is entered into the official statutory registry.
      </p>

      {/* Tracking ID Badge Container */}
      <div className="bg-surface-subtle border border-surface-border rounded-xl p-4 my-6 text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-typography-subtle block mb-1">
          Official Tracking ID
        </span>
        <div className="text-2xl sm:text-3xl font-mono font-extrabold text-typography-primary tracking-wider">
          {trackingId}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary-hover mt-2 px-3 py-1 rounded-md hover:bg-primary-light transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-status-resolved" />
              <span className="text-status-resolved font-semibold">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Tap to Copy Tracking ID</span>
            </>
          )}
        </button>
      </div>

      {/* Routing & Cluster Confirmation Box */}
      <div className="bg-primary-light/60 border border-primary/20 rounded-xl p-4 text-left text-xs space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-typography-secondary">Assigned Department:</span>
          <span className="font-bold text-primary">{targetAuthority}</span>
        </div>
        <div className="text-typography-muted font-medium leading-tight">
          {getAuthorityFullName(targetAuthority)}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-primary/10">
          <span className="font-semibold text-typography-secondary">Initial Status:</span>
          <StatusBadge status="PENDING" size="sm" />
        </div>
        <div className="pt-2 border-t border-primary/10 text-primary font-medium">
          👥 Clustered with {communityCount} neighboring reports to elevate dispatch priority.
        </div>
      </div>

      {/* Reset CTA */}
      <button
        type="button"
        onClick={onReset}
        className="w-full h-11 bg-primary text-primary-on rounded-xl font-semibold text-sm hover:bg-primary-hover active:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <span>Report Another Grievance</span>
        <ArrowRight className="w-4 h-4" />
      </button>
      </div>
    </div>
  );
};
