import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import type { ComplaintCard } from "../api/types";
import { ReviewModal } from "../components/ReviewModal";
import { SuccessCard } from "../components/SuccessCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useGeolocation } from "../hooks/useGeolocation";
import { useComplaintReview } from "../hooks/useComplaintReview";
import {
  Mic,
  Square,
  Upload,
  MapPin,
  Compass,
  Sparkles,
  Loader2,
  X,
  Play,
  Pause,
  AlertCircle,
  Clock,
  Users,
} from "lucide-react";

export const CitizenPortal: React.FC = () => {
  // Form State
  const [complaintText, setComplaintText] = useState("");
  const [landmark, setLandmark] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Custom Hooks
  const { coordinates, gpsLoading, detectGps, setCoordinates } = useGeolocation();
  const {
    isRecording,
    recordingDuration,
    audioBlob,
    audioUrl,
    isPlayingAudio,
    audioElementRef,
    startRecording,
    stopRecording,
    removeAudio,
    togglePlayAudio,
    setIsPlayingAudio,
  } = useAudioRecorder();

  const {
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
  } = useComplaintReview();

  // My Grievances Feed
  const [myComplaints, setMyComplaints] = useState<ComplaintCard[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const loadMyComplaints = useCallback(async () => {
    try {
      const data = await api.getMyComplaints();
      setMyComplaints(data);
    } catch (err) {
      console.error("Failed to load complaints", err);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    loadMyComplaints();
  }, [loadMyComplaints]);

  // Landmark Quick Hints
  const landmarkHints = [
    "Near Disco Bakery, Gulshan",
    "Opp. NIPA Chowrangi",
    "Water Pump Chowrangi, FB Area",
    "Liaquatabad Super Market",
    "Baloch Colony Flyover",
  ];

  // Photo Handling
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit Grievance & Poll Civic AI Pipeline via hook
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim() && !audioBlob && !selectedPhoto) {
      alert("Please describe your issue, record a voice note, or upload a photo.");
      return;
    }

    await submitAndPollReview({
      text: complaintText || "Civic infrastructure issue recorded via multimodal intake.",
      landmark: landmark || "Karachi Vicinity",
      lat: coordinates?.lat,
      lng: coordinates?.lng,
      image: selectedPhoto,
      audio: audioBlob,
    });
  };

  const handleDetectGps = () => {
    detectGps((_coords, label) => {
      if (!landmark) {
        setLandmark(label);
      }
    });
  };

  const handleConfirmGrievance = async () => {
    await confirmGrievance(loadMyComplaints);
  };

  const handleResetForm = () => {
    resetReview();
    setComplaintText("");
    setLandmark("");
    setCoordinates(null);
    removePhoto();
    removeAudio();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-light text-primary mb-3 border border-primary/20 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Karachi Civic AI Multi-Modal Intake
        </span>
        <h1 className="text-3xl font-extrabold text-typography-primary tracking-tight">
          Report a Civic Grievance
        </h1>
        <p className="text-sm text-typography-muted mt-2 leading-relaxed">
          Speak in Roman Urdu, Urdu, or English. Our legal perception engine determines
          jurisdiction, clusters neighborhood complaints, and demands accountability.
        </p>
      </div>

      {/* Main Container: Intake Card OR Success Card */}
      {confirmedTrackingId ? (
        <SuccessCard
          trackingId={confirmedTrackingId}
          targetAuthority={reviewPackage?.target_authority || "KWSC"}
          communityCount={reviewPackage?.community_reports_count || 3}
          onReset={handleResetForm}
        />
      ) : (
        <div className="max-w-2xl mx-auto bg-surface border border-surface-border rounded-2xl p-6 sm:p-8 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Problem Description (Text) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-typography-secondary mb-2">
                1. Describe the Issue (Roman Urdu, Urdu, or English)
              </label>
              <textarea
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Apna masla bayan karein (English, اردو, ya Roman Urdu me)... maslan: Gulshan Block 4 me Disco Bakery ke samnay sewer line ubal rahi hai aur badbu arhi hai..."
                rows={4}
                className="w-full p-3.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none leading-relaxed bg-surface text-typography-primary"
              />
            </div>

            {/* Section 2: Multimodal Media Uploader Grid */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-typography-secondary mb-2">
                2. Add Evidence (Photo & Voice Note)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Photo Dropzone / Selector */}
                <div className="border-2 border-dashed border-surface-border rounded-xl p-4 text-center hover:border-primary hover:bg-primary-light/20 transition-all flex flex-col items-center justify-center min-h-[140px] relative">
                  {photoPreview ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <img
                        src={photoPreview}
                        alt="Evidence Preview"
                        className="h-24 w-auto object-cover rounded-lg border border-surface-border"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 p-1 bg-hazard-p0 text-white rounded-full hover:opacity-90 shadow-sm"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] text-typography-muted mt-1 truncate max-w-[180px]">
                        {selectedPhoto?.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="cursor-pointer flex flex-col items-center gap-1.5 w-full"
                      >
                        <div className="p-2 bg-surface-subtle rounded-full text-typography-muted">
                          <Upload className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-typography-secondary">
                          Snap or Upload Photo
                        </span>
                        <span className="text-[11px] text-typography-subtle">
                          PNG, JPG up to 10MB
                        </span>
                      </label>
                    </>
                  )}
                </div>

                {/* 1-Tap Mic Voice Note Recorder */}
                <div className="border border-surface-border rounded-xl p-4 bg-surface-subtle flex flex-col items-center justify-center min-h-[140px] text-center">
                  {audioUrl ? (
                    <div className="w-full flex flex-col items-center justify-center space-y-2">
                      <div className="flex items-center gap-2">
                        {audioUrl !== "mock-audio-recording" && (
                          <audio
                            ref={audioElementRef}
                            src={audioUrl}
                            onEnded={() => setIsPlayingAudio(false)}
                            className="hidden"
                          />
                        )}
                        <button
                          type="button"
                          onClick={togglePlayAudio}
                          className="h-10 w-10 rounded-full bg-primary text-primary-on flex items-center justify-center hover:bg-primary-hover transition-colors"
                        >
                          {isPlayingAudio ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                        <span className="text-xs font-semibold text-typography-primary">
                          Voice Note ({recordingDuration}s)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={removeAudio}
                        className="text-[11px] text-hazard-p0 hover:underline inline-flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Delete Voice Note</span>
                      </button>
                    </div>
                  ) : isRecording ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <span className="absolute -inset-1 rounded-full bg-hazard-p0/40 animate-ping opacity-75"></span>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="relative h-12 w-12 rounded-full bg-hazard-p0 text-white flex items-center justify-center hover:opacity-90 transition-colors shadow-xs"
                        >
                          <Square className="w-5 h-5" />
                        </button>
                      </div>
                      <span className="text-xs font-mono font-bold text-hazard-p0">
                        Recording: 00:{recordingDuration < 10 ? `0${recordingDuration}` : recordingDuration}
                      </span>
                      <span className="text-[11px] text-typography-muted">Tap square to finish</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="h-12 w-12 rounded-full bg-primary-light text-primary flex items-center justify-center hover:bg-primary/20 active:scale-95 transition-all shadow-xs"
                      >
                        <Mic className="w-6 h-6 text-primary" />
                      </button>
                      <span className="text-xs font-semibold text-typography-primary">
                        Record Voice Note (Urdu/English)
                      </span>
                      <span className="text-[11px] text-typography-subtle">
                        1-tap WhatsApp-style voice record
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Location & Landmark */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-typography-secondary">
                  3. Location / Landmark (Mashhoor Jagah)
                </label>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary-light px-2.5 py-1 rounded-lg border border-primary/20 hover:bg-primary-light/80 transition-colors"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Compass className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span>Auto-Detect GPS</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Disco Bakery, Main University Road, Behind Dolmen Mall..."
                  className="w-full h-11 px-3.5 pl-9 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-surface text-typography-primary"
                />
                <MapPin className="w-4 h-4 text-typography-subtle absolute left-3 top-3.5" />
              </div>

              {/* Landmark quick suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[11px] text-typography-subtle">Suggestions:</span>
                {landmarkHints.map((hint, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLandmark(hint)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-surface-subtle text-typography-secondary hover:bg-primary-light hover:text-primary border border-surface-border transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Submit CTA */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-primary text-primary-on font-semibold text-sm sm:text-base rounded-xl shadow-md hover:bg-primary-hover active:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{analysisStatusText || "Analyzing Grievance with Civic AI..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Analyze Grievance with Civic AI</span>
                  </>
                )}
              </button>

              {isSubmitting && (
                <div className="mt-3 p-3 bg-primary-light rounded-xl border border-primary/20 text-xs text-primary text-center animate-pulse">
                  {analysisStatusText}
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Human-in-the-Loop Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        reviewData={reviewPackage}
        onConfirm={handleConfirmGrievance}
        onClose={closeReviewModal}
        isConfirming={isConfirming}
      />

      {/* Section: My Grievances Tracker */}
      <div className="mt-12 pt-8 border-t border-surface-border">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-typography-primary tracking-tight">
              My Active Grievances <span className="text-primary">({myComplaints.length})</span>
            </h2>
            <p className="text-xs text-typography-subtle mt-0.5">
              Live updates on reported incidents and municipal actions
            </p>
          </div>
          <button
            type="button"
            onClick={loadMyComplaints}
            className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
          >
            Refresh Feed
          </button>
        </div>

        {loadingFeed ? (
          <div className="p-8 text-center bg-surface border border-surface-border rounded-xl shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <span className="text-xs text-typography-muted">Loading civic records...</span>
          </div>
        ) : myComplaints.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-surface-border rounded-xl shadow-xs">
            <AlertCircle className="w-8 h-8 text-typography-subtle mx-auto mb-2" />
            <div className="font-semibold text-sm text-typography-secondary">
              No active grievances filed yet
            </div>
            <p className="text-xs text-typography-subtle mt-1 max-w-sm mx-auto">
              Notice a broken sewer line, road crater, or uncollected garbage? Report it above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myComplaints.map((item) => (
              <div
                key={item.master_incident_id || item.tracking_id}
                className="bg-surface border border-surface-border rounded-xl p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-typography-primary bg-surface-subtle px-2 py-0.5 rounded border border-surface-border">
                      {item.tracking_id}
                    </span>
                    <h3 className="font-semibold text-sm text-typography-primary mt-1">
                      {item.issue_category}
                    </h3>
                  </div>
                  <StatusBadge status={item.official_status} size="sm" />
                </div>

                <div className="text-xs text-typography-muted flex items-center gap-1.5 my-2">
                  <MapPin className="w-3.5 h-3.5 text-typography-subtle shrink-0 mt-0.5" />
                  <span className="truncate">{item.landmark}</span>
                </div>

                <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full border border-primary/20">
                    <Users className="w-3 h-3" />
                    {item.community_reports_count} Citizens Affected
                  </span>
                  <span className="text-typography-subtle text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.last_reported_at}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
