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
    <div className="max-w-md w-full bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm mx-auto animate-in fade-in zoom-in-95 duration-150">
      {/* Success Badge Icon */}
      <div className="h-16 w-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 mb-2">
        <ShieldCheck className="w-3.5 h-3.5" />
        Verified Civic Redressal
      </span>

      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        Grievance Formally Filed
      </h2>
      <p className="text-sm text-slate-600 mt-1">
        Your complaint is entered into the official statutory registry.
      </p>

      {/* Tracking ID Badge Container */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-6 text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
          Official Tracking ID
        </span>
        <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-wider">
          {trackingId}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-medium hover:text-emerald-950 mt-2 px-3 py-1 rounded-md hover:bg-emerald-50 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-emerald-700 font-semibold">Copied to Clipboard!</span>
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
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-left text-xs space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700">Assigned Department:</span>
          <span className="font-bold text-emerald-900">{targetAuthority}</span>
        </div>
        <div className="text-slate-600 font-medium leading-tight">
          {getAuthorityFullName(targetAuthority)}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60">
          <span className="font-semibold text-slate-700">Initial Status:</span>
          <StatusBadge status="PENDING" size="sm" />
        </div>
        <div className="pt-2 border-t border-emerald-200/60 text-emerald-900 font-medium">
          👥 Clustered with {communityCount} neighboring reports to elevate dispatch priority.
        </div>
      </div>

      {/* Reset CTA */}
      <button
        type="button"
        onClick={onReset}
        className="w-full h-11 bg-emerald-900 text-white rounded-xl font-semibold text-sm hover:bg-emerald-950 active:bg-black transition-colors flex items-center justify-center gap-2 shadow-xs focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
      >
        <span>Report Another Grievance</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
