import { useState } from "react";
import { api } from "../api/client";
import type { ReviewPackage, SubmitReportPayload } from "../api/types";

export interface ComplaintReviewState {
  isSubmitting: boolean;
  analysisStatusText: string;
  reviewPackage: ReviewPackage | null;
  isReviewModalOpen: boolean;
  isConfirming: boolean;
  confirmedTrackingId: string | null;
  submitAndPollReview: (payload: SubmitReportPayload) => Promise<void>;
  confirmGrievance: (onConfirmed?: () => void) => Promise<void>;
  closeReviewModal: () => void;
  resetReview: () => void;
}

export const useComplaintReview = (): ComplaintReviewState => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>("");
  const [reviewPackage, setReviewPackage] = useState<ReviewPackage | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedTrackingId, setConfirmedTrackingId] = useState<string | null>(null);

  const submitAndPollReview = async (payload: SubmitReportPayload) => {
    setIsSubmitting(true);
    setAnalysisStatusText("Submitting report to Karachi Civic AI Engine...");

    try {
      const { job_id } = await api.submitGrievance(payload);

      setAnalysisStatusText("Identifying responsible municipal department (KW&SC / KMC / SSWMB)...");
      await new Promise((r) => setTimeout(r, 600));

      setAnalysisStatusText("Checking nearby community reports for deduplication...");
      await new Promise((r) => setTimeout(r, 500));

      setAnalysisStatusText("Drafting statutory notice and plain-language summary...");
      const reviewPkg = await api.pollReviewPackage(job_id);

      setReviewPackage(reviewPkg);
      setIsReviewModalOpen(true);
    } catch (err: any) {
      alert(err?.message || "Failed to analyze grievance. Please try again.");
    } finally {
      setIsSubmitting(false);
      setAnalysisStatusText("");
    }
  };

  const confirmGrievance = async (onConfirmed?: () => void) => {
    if (!reviewPackage) return;
    setIsConfirming(true);
    try {
      const res = await api.confirmGrievance(reviewPackage.job_id, reviewPackage);
      setConfirmedTrackingId(res.tracking_id);
      setIsReviewModalOpen(false);
      if (onConfirmed) {
        onConfirmed();
      }
    } catch (err: any) {
      alert(err?.message || "Failed to confirm grievance.");
    } finally {
      setIsConfirming(false);
    }
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
  };

  const resetReview = () => {
    setConfirmedTrackingId(null);
    setReviewPackage(null);
    setIsReviewModalOpen(false);
  };

  return {
    isSubmitting,
    analysisStatusText,
    reviewPackage,
    isReviewModalOpen,
    isConfirming,
    confirmedTrackingId,
    submitAndPollReview,
    confirmGrievance,
    closeReviewModal,
    resetReview,
  };
};
