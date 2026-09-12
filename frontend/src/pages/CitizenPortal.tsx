import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import type {
  ComplaintCard,
  ReviewPackage,
} from "../api/types";
import { ReviewModal } from "../components/ReviewModal";
import { SuccessCard } from "../components/SuccessCard";
import { StatusBadge } from "../components/StatusBadge";
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
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Audio Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Pipeline & Review State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>("");
  const [reviewPackage, setReviewPackage] = useState<ReviewPackage | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Success State
  const [confirmedTrackingId, setConfirmedTrackingId] = useState<string | null>(null);

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

  // GPS Auto-Detect
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsLoading(false);
        if (!landmark) {
          setLandmark(`Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)} (GPS Detected)`);
        }
      },
      (err) => {
        console.warn("GPS error:", err);
        setCoordinates({ lat: 24.9284, lng: 67.0982 });
        setGpsLoading(false);
        if (!landmark) {
          setLandmark("Gulshan-e-Iqbal, District East, Karachi (Estimated)");
        }
      },
      { timeout: 8000 }
    );
  };

  // 1-Tap Voice Note Recorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Mic access issue, falling back to simulated voice note", err);
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      const dummyBlob = new Blob(["mock-voice-recording-bytes"], { type: "audio/webm" });
      setAudioBlob(dummyBlob);
      setAudioUrl("mock-audio-recording");
    }
    clearInterval(timerIntervalRef.current);
    setIsRecording(false);
  };

  const removeAudio = () => {
    setAudioBlob(null);
    if (audioUrl && audioUrl !== "mock-audio-recording") {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setIsPlayingAudio(false);
  };

  const togglePlayAudio = () => {
    if (audioElementRef.current) {
      if (isPlayingAudio) {
        audioElementRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioElementRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  // Submit Grievance & Poll Civic AI Pipeline
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim() && !audioBlob && !selectedPhoto) {
      alert("Please describe your issue, record a voice note, or upload a photo.");
      return;
    }

    setIsSubmitting(true);
    setAnalysisStatusText("Submitting report to Karachi Civic AI Engine...");

    try {
      const { job_id } = await api.submitGrievance({
        text: complaintText || "Civic infrastructure issue recorded via multimodal intake.",
        landmark: landmark || "Karachi Vicinity",
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        image: selectedPhoto,
        audio: audioBlob,
      });

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

  const handleConfirmGrievance = async () => {
    if (!reviewPackage) return;
    setIsConfirming(true);
    try {
      const res = await api.confirmGrievance(reviewPackage.job_id, reviewPackage);
      setConfirmedTrackingId(res.tracking_id);
      setIsReviewModalOpen(false);
      loadMyComplaints();
    } catch (err: any) {
      alert(err?.message || "Failed to confirm grievance.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResetForm = () => {
    setConfirmedTrackingId(null);
    setReviewPackage(null);
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 mb-3 border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
          Karachi Civic AI Multi-Modal Intake
        </span>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Report a Civic Grievance
        </h1>
        <p className="text-sm text-slate-600 mt-1">
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
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Problem Description (Text) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                1. Describe the Issue (Roman Urdu, Urdu, or English)
              </label>
              <textarea
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Apna masla bayan karein (English, ????, ya Roman Urdu me)... maslan: Gulshan Block 4 me Disco Bakery ke samnay sewer line ubal rahi hai aur badbu arhi hai..."
                rows={4}
                className="w-full p-3.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none leading-relaxed bg-white"
              />
            </div>

            {/* Section 2: Multimodal Media Uploader Grid */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                2. Add Evidence (Photo & Voice Note)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Photo Dropzone / Selector */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-emerald-700 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center min-h-[140px] relative">
                  {photoPreview ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <img
                        src={photoPreview}
                        alt="Evidence Preview"
                        className="h-24 w-auto object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] text-slate-500 mt-1 truncate max-w-[180px]">
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
                        <div className="p-2 bg-slate-100 rounded-full text-slate-600">
                          <Upload className="w-5 h-5 text-emerald-800" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          Snap or Upload Photo
                        </span>
                        <span className="text-[11px] text-slate-400">
                          PNG, JPG up to 10MB
                        </span>
                      </label>
                    </>
                  )}
                </div>

                {/* 1-Tap Mic Voice Note Recorder */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center min-h-[140px] text-center">
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
                          className="h-10 w-10 rounded-full bg-emerald-900 text-white flex items-center justify-center hover:bg-emerald-950 transition-colors"
                        >
                          {isPlayingAudio ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                        <span className="text-xs font-semibold text-slate-800">
                          Voice Note ({recordingDuration}s)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={removeAudio}
                        className="text-[11px] text-red-600 hover:underline inline-flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Delete Voice Note</span>
                      </button>
                    </div>
                  ) : isRecording ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <span className="absolute -inset-1 rounded-full bg-red-400 animate-ping opacity-75"></span>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="relative h-12 w-12 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-xs"
                        >
                          <Square className="w-5 h-5" />
                        </button>
                      </div>
                      <span className="text-xs font-mono font-bold text-red-700">
                        Recording: 00:{recordingDuration < 10 ? `0${recordingDuration}` : recordingDuration}
                      </span>
                      <span className="text-[11px] text-slate-500">Tap square to finish</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center hover:bg-emerald-200 active:scale-95 transition-all shadow-xs"
                      >
                        <Mic className="w-6 h-6 text-emerald-800" />
                      </button>
                      <span className="text-xs font-semibold text-slate-800">
                        Record Voice Note (Urdu/English)
                      </span>
                      <span className="text-[11px] text-slate-400">
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
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Location / Landmark (Mashhoor Jagah)
                </label>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Compass className="w-3.5 h-3.5 text-emerald-800" />
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
                  className="w-full h-11 px-3.5 pl-9 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none bg-white"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>

              {/* Landmark quick suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[11px] text-slate-400">Suggestions:</span>
                {landmarkHints.map((hint, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLandmark(hint)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 transition-colors"
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
                className="w-full h-12 bg-emerald-900 text-white font-semibold text-sm sm:text-base rounded-xl shadow-xs hover:bg-emerald-950 active:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 text-center animate-pulse">
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
        onClose={() => setIsReviewModalOpen(false)}
        isConfirming={isConfirming}
      />

      {/* Section: My Grievances Tracker */}
      <div className="mt-12 pt-8 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              My Active Grievances ({myComplaints.length})
            </h2>
            <p className="text-xs text-slate-500">
              Live updates on reported incidents and municipal actions
            </p>
          </div>
          <button
            type="button"
            onClick={loadMyComplaints}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            Refresh Feed
          </button>
        </div>

        {loadingFeed ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-800 mx-auto mb-2" />
            <span className="text-xs text-slate-500">Loading civic records...</span>
          </div>
        ) : myComplaints.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="font-semibold text-sm text-slate-800">
              No active grievances filed yet
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Notice a broken sewer line, road crater, or uncollected garbage? Report it above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myComplaints.map((item) => (
              <div
                key={item.master_incident_id || item.tracking_id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {item.tracking_id}
                    </span>
                    <h3 className="font-semibold text-sm text-slate-900 mt-1">
                      {item.issue_category}
                    </h3>
                  </div>
                  <StatusBadge status={item.official_status} size="sm" />
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-1.5 my-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="truncate">{item.landmark}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Users className="w-3 h-3" />
                    {item.community_reports_count} Citizens Affected
                  </span>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
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
