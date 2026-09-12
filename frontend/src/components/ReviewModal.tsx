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
          icon: <Landmark className="w-4 h-4 text-emerald-800" />,
          name: "KW&SC (Water & Sewerage Corporation)",
          bg: "bg-emerald-50 text-emerald-900 border-emerald-300",
        };
      case "KMC":
        return {
          icon: <Building2 className="w-4 h-4 text-sky-800" />,
          name: "KMC (Metropolitan Corporation - Roads)",
          bg: "bg-sky-50 text-sky-900 border-sky-300",
        };
      case "SSWMB":
        return {
          icon: <Trash2 className="w-4 h-4 text-amber-800" />,
          name: "SSWMB (Sindh Solid Waste Management)",
          bg: "bg-amber-50 text-amber-900 border-amber-300",
        };
      case "CANTONMENT":
        return {
          icon: <ShieldAlert className="w-4 h-4 text-purple-800" />,
          name: "Cantonment Boards Administration",
          bg: "bg-purple-50 text-purple-900 border-purple-300",
        };
      default:
        return {
          icon: <Landmark className="w-4 h-4 text-emerald-800" />,
          name: org || "Municipal Authority",
          bg: "bg-slate-100 text-slate-800 border-slate-300",
        };
    }
  };

  const authInfo = getAuthorityBadge(reviewData.target_authority);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${authInfo.bg}`}
            >
              {authInfo.icon}
              <span>{authInfo.name}</span>
            </span>
            <StatusBadge severity={reviewData.severity || "P0"} />
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Human-in-the-Loop AI Review
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review the plain-language summary before legal filing with the government.
          </p>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm">
          {/* Community Clout Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 text-emerald-950">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs uppercase tracking-wider text-emerald-900">
                Collective Community Clout
              </div>
              <p className="text-xs mt-0.5 text-emerald-900 leading-relaxed">
                👥 <strong>{reviewData.community_reports_count || 3} neighbors</strong> in{" "}
                {reviewData.landmark || "your vicinity"} have also reported this issue.
                Your complaint is stacked to increase collective dispatch urgency!
              </p>
            </div>
          </div>

          {/* Citizen Layman Summary Hero Box */}
          <div className="bg-slate-50 border-l-4 border-emerald-800 rounded-r-xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1 flex items-center gap-1.5">
              <span>Layman Summary (آسان خلاصہ)</span>
            </div>
            <p className="text-slate-800 text-sm leading-relaxed">
              {reviewData.layman_summary ||
                "Humne aapki shikayat ka jaiza lia hai. Yeh masla KW&SC ke daera-e-ikhtiyar me ata hai. Gutter ke gande pani se bimariyan phailne ka khatra hai, is liye ise P0 Emergency ke tor par mark kia gaya hai."}
            </p>
          </div>

          {/* Location & Landmark Reference */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs flex items-center justify-between">
            <span className="text-slate-500 font-medium">Identified Location:</span>
            <span className="text-slate-900 font-semibold">{reviewData.landmark}</span>
          </div>

          {/* Progressive Disclosure Accordion: Legal Draft */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLegalDraft(!showLegalDraft)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-800" />
                <span>View Generated Statutory Legal Draft (قانونی مسودہ)</span>
              </div>
              {showLegalDraft ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showLegalDraft && (
              <div className="p-4 bg-white border-t border-slate-200">
                {/* Legal Language Tabs */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLegalTab("en")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      legalTab === "en"
                        ? "bg-emerald-900 text-white border-emerald-900"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    English Statutory Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalTab("ur")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      legalTab === "ur"
                        ? "bg-emerald-900 text-white border-emerald-900"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    Urdu Official Notice (اردو)
                  </button>
                </div>

                {legalTab === "en" ? (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    <p className="font-bold text-slate-900 mb-2">
                      {reviewData.draft_complaint?.subject_en ||
                        "STATUTORY CITIZEN GRIEVANCE UNDER SINDH LOCAL GOVERNANCE ACTS"}
                    </p>
                    {reviewData.draft_complaint?.body_en ||
                      "Pursuant to official statutory obligations, this grievance formally requests immediate departmental repair and field deployment."}
                  </div>
                ) : (
                  <div
                    dir="rtl"
                    className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed font-sans"
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
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="h-11 px-4 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-4 h-4" />
            <span>Make Changes</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="h-11 px-6 text-xs sm:text-sm font-semibold text-white bg-emerald-900 hover:bg-emerald-950 active:bg-black rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
