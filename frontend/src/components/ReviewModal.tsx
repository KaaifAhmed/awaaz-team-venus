import React, { useState } from "react";
import type { ReviewPackage } from "../api/types";
import { StatusBadge } from "./StatusBadge";
import {
  ChevronDown,
  ChevronUp,
  Users,
  CheckCircle2,
  Edit3,
  FileText,
  Landmark,
  Building2,
  Trash2,
  ShieldAlert,
  Loader2,
} from "lucide-react";

interface ReviewModalProps {
  isOpen: boolean;
  reviewData: ReviewPackage | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isConfirming: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  reviewData,
  onConfirm,
  onClose,
  isConfirming,
}) => {
  const [showLegalDraft, setShowLegalDraft] = useState(false);
  const [legalTab, setLegalTab] = useState<"en" | "ur">("en");

  if (!isOpen || !reviewData) return null;

  const getAuthorityBadge = (org?: string) => {
    switch (org) {
      case "KWSC":
        return {
          icon: <Landmark className="w-4 h-4 text-agency-kwsc" />,
          name: "KW&SC (Water & Sewerage Corporation)",
          bg: "bg-primary-light text-primary border-primary/30",
        };
      case "KMC":
        return {
          icon: <Building2 className="w-4 h-4 text-agency-kmc" />,
          name: "KMC (Metropolitan Corporation - Roads)",
          bg: "bg-sky-50 text-agency-kmc border-agency-kmc/30",
        };
      case "SSWMB":
        return {
          icon: <Trash2 className="w-4 h-4 text-agency-sswmb" />,
          name: "SSWMB (Sindh Solid Waste Management)",
          bg: "bg-amber-50 text-agency-sswmb border-agency-sswmb/30",
        };
      case "CANTONMENT":
        return {
          icon: <ShieldAlert className="w-4 h-4 text-agency-cantonment" />,
          name: "Cantonment Boards Administration",
          bg: "bg-purple-50 text-agency-cantonment border-agency-cantonment/30",
        };
      default:
        return {
          icon: <Landmark className="w-4 h-4 text-primary" />,
          name: org || "Municipal Authority",
          bg: "bg-surface-subtle text-typography-primary border-surface-border",
        };
    }
  };

  const authInfo = getAuthorityBadge(reviewData.target_authority);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-surface rounded-2xl shadow-xl max-w-xl w-full border border-surface-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-surface-border pb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${authInfo.bg}`}
            >
              {authInfo.icon}
              <span>{authInfo.name}</span>
            </span>
            <StatusBadge severity={reviewData.severity || "P0"} />
          </div>

          <h2 className="text-xl font-bold text-typography-primary tracking-tight">
            Human-in-the-Loop AI Review
          </h2>
          <p className="text-xs text-typography-muted mt-0.5">
            Review the plain-language summary before legal filing with the government.
          </p>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm">
          {/* Community Clout Banner */}
          <div className="bg-primary-light border border-primary/20 rounded-xl p-3.5 flex items-start gap-3 text-primary">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs uppercase tracking-wider text-primary">
                Collective Community Clout
              </div>
              <p className="text-xs mt-0.5 text-primary leading-relaxed">
                👥 <strong>{reviewData.community_reports_count || 3} neighbors</strong> in{" "}
                {reviewData.landmark || "your vicinity"} have also reported this issue.
                Your complaint is stacked to increase collective dispatch urgency!
              </p>
            </div>
          </div>

          {/* Citizen Layman Summary Hero Box */}
          <div className="bg-surface-subtle border-l-4 border-primary rounded-r-xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
              <span>Layman Summary (آسان خلاصہ)</span>
            </div>
            <p className="text-typography-primary text-sm leading-relaxed">
              {reviewData.layman_summary ||
                "Humne aapki shikayat ka jaiza lia hai. Yeh masla KW&SC ke daera-e-ikhtiyar me ata hai. Gutter ke gande pani se bimariyan phailne ka khatra hai, is liye ise P0 Emergency ke tor par mark kia gaya hai."}
            </p>
          </div>

          {/* Location & Landmark Reference */}
          <div className="bg-surface-subtle rounded-xl p-3 border border-surface-border text-xs flex items-center justify-between">
            <span className="text-typography-muted font-medium">Identified Location:</span>
            <span className="text-typography-primary font-semibold">{reviewData.landmark}</span>
          </div>

          {/* Progressive Disclosure Accordion: Legal Draft */}
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLegalDraft(!showLegalDraft)}
              className="w-full px-4 py-3 bg-surface-subtle hover:bg-surface-hover flex items-center justify-between text-xs font-semibold text-typography-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>View Generated Statutory Legal Draft (قانونی مسودہ)</span>
              </div>
              {showLegalDraft ? (
                <ChevronUp className="w-4 h-4 text-typography-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-typography-muted" />
              )}
            </button>

            {showLegalDraft && (
              <div className="p-4 bg-surface border-t border-surface-border">
                {/* Legal Language Tabs */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLegalTab("en")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      legalTab === "en"
                        ? "bg-primary text-primary-on border-primary"
                        : "bg-surface-hover text-typography-secondary border-surface-border hover:bg-surface-subtle"
                    }`}
                  >
                    English Statutory Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalTab("ur")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      legalTab === "ur"
                        ? "bg-primary text-primary-on border-primary"
                        : "bg-surface-hover text-typography-secondary border-surface-border hover:bg-surface-subtle"
                    }`}
                  >
                    Urdu Official Notice (اردو)
                  </button>
                </div>

                {legalTab === "en" ? (
                  <div className="bg-surface-subtle p-3 rounded-lg border border-surface-border text-xs font-mono text-typography-secondary max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    <p className="font-bold text-typography-primary mb-2">
                      {reviewData.draft_complaint?.subject_en ||
                        "STATUTORY CITIZEN GRIEVANCE UNDER SINDH LOCAL GOVERNANCE ACTS"}
                    </p>
                    {reviewData.draft_complaint?.body_en ||
                      "Pursuant to official statutory obligations, this grievance formally requests immediate departmental repair and field deployment."}
                  </div>
                ) : (
                  <div
                    dir="rtl"
                    className="bg-surface-subtle p-3 rounded-lg border border-surface-border text-xs text-typography-primary max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed font-sans"
                  >
                    {reviewData.draft_complaint?.body_ur ||
                      "بخدمت جناب مجاز اتھارٹی: قانونی نوٹس برائے فوری کارروائی و ازالہ عوامی شکایت بموجب سندھ لوکل گورنمنٹ ایکٹ۔"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:p-6 bg-surface-subtle border-t border-surface-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="h-11 px-4 text-xs sm:text-sm font-medium text-typography-secondary bg-surface border border-surface-border rounded-xl hover:bg-surface-hover active:bg-surface-subtle disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-4 h-4" />
            <span>Make Changes</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="h-11 px-6 text-xs sm:text-sm font-semibold text-primary-on bg-primary hover:bg-primary-hover active:opacity-90 rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Complaint...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & File Grievance</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
