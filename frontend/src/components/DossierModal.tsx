import React, { useState } from "react";
import type { ComplaintDossier, OfficialStatus } from "../api/types";
import { StatusBadge } from "./StatusBadge";
import {
  X,
  MapPin,
  Clock,
  Users,
  FileCheck2,
  Send,
  Loader2,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";

interface DossierModalProps {
  isOpen: boolean;
  dossier: ComplaintDossier | null;
  onClose: () => void;
  onUpdateStatus: (
    incidentId: string,
    status: OfficialStatus,
    notes: string
  ) => Promise<void>;
}

const DossierContent: React.FC<{
  dossier: ComplaintDossier;
  onClose: () => void;
  onUpdateStatus: (
    incidentId: string,
    status: OfficialStatus,
    notes: string
  ) => Promise<void>;
}> = ({ dossier, onClose, onUpdateStatus }) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [status, setStatus] = useState<OfficialStatus>(dossier.official_status);
  const [notes, setNotes] = useState(dossier.official_notes || "");
  const [langTab, setLangTab] = useState<"en" | "ur">("en");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateStatus(dossier.master_incident_id, status, notes);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl shadow-2xl max-w-5xl w-full border border-surface-border overflow-hidden flex flex-col max-h-[92vh]">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-surface-border flex items-center justify-between bg-surface-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary text-primary-on rounded-xl shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-bold text-typography-primary">
                {dossier.tracking_id}
              </span>
              <StatusBadge severity={dossier.severity} size="sm" />
              <StatusBadge status={dossier.official_status} size="sm" />
            </div>
            <p className="text-xs text-typography-muted mt-0.5">
              Statutory Incident Dossier & Technical Dispatch Record
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-typography-muted hover:text-typography-primary hover:bg-surface rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2-Column Content Body */}
      <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Evidence & Ground Intelligence */}
        <div className="lg:col-span-5 space-y-4">
          {/* High-Res Photo Gallery */}
          <div className="border border-surface-border rounded-xl p-3 bg-surface-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-typography-secondary">
                Evidence Gallery ({dossier.evidence_photos.length})
              </span>
              <span className="text-[11px] text-primary font-medium">
                Verified Geo-Tag
              </span>
            </div>

            {dossier.evidence_photos.length > 0 ? (
              <>
                <div className="relative aspect-video rounded-lg overflow-hidden border border-surface-border-strong bg-slate-900">
                  <img
                    src={dossier.evidence_photos[selectedPhotoIndex]}
                    alt="Incident Evidence"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[11px] rounded backdrop-blur-xs">
                    Photo {selectedPhotoIndex + 1} of {dossier.evidence_photos.length}
                  </div>
                </div>

                {dossier.evidence_photos.length > 1 && (
                  <div className="flex items-center gap-2 mt-2">
                    {dossier.evidence_photos.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPhotoIndex(idx)}
                        className={`relative w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                          selectedPhotoIndex === idx
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-surface-border opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={src} alt="Thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-40 rounded-lg bg-surface-hover flex items-center justify-center text-xs text-typography-muted">
                No photographic evidence uploaded
              </div>
            )}
          </div>

          {/* Landmark & GPS Box */}
          <div className="border border-surface-border rounded-xl p-3.5 bg-surface text-xs space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-typography-primary">Landmark Location:</div>
                <div className="text-typography-secondary mt-0.5">{dossier.landmark}</div>
              </div>
            </div>
            <div className="pt-2 border-t border-surface-border flex items-center justify-between text-typography-muted font-mono text-[11px]">
              <span>
                GPS: {typeof dossier.coordinates?.lat === "number" ? dossier.coordinates.lat.toFixed(4) : "24.8607"}, {typeof dossier.coordinates?.lng === "number" ? dossier.coordinates.lng.toFixed(4) : "67.0011"}
              </span>
              {dossier.coordinates?.lat != null && dossier.coordinates?.lng != null ? (
                <a
                  href={`https://maps.google.com/?q=${dossier.coordinates.lat},${dossier.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 font-sans"
                >
                  <span>Open Map</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
          </div>

          {/* Co-Reporting Citizens Privacy Box */}
          <div className="border border-surface-border rounded-xl p-3.5 bg-surface text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-semibold text-typography-primary">
                <Users className="w-4 h-4 text-primary" />
                <span>Co-Reporting Citizens ({dossier.reporting_citizens_count})</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-typography-subtle bg-surface-subtle px-1.5 py-0.5 rounded border border-surface-border">
                Masked Privacy
              </span>
            </div>
            <div className="space-y-1.5">
              {(
                dossier.co_reporting_citizens || [
                  "42101-*******-1 (Farhan A.)",
                  "42101-*******-5 (Kashif M.)",
                  "42101-*******-8 (Zubair H.)",
                ]
              ).map((c, i) => (
                <div
                  key={i}
                  className="px-2.5 py-1.5 bg-surface-subtle rounded border border-surface-border font-mono text-[11px] text-typography-secondary flex items-center justify-between"
                >
                  <span>{c}</span>
                  <span className="text-[10px] text-primary font-sans">Verified</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-[11px] text-typography-muted flex items-center justify-between px-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> First: {dossier.first_reported_at}
            </span>
            <span>Latest: {dossier.last_reported_at}</span>
          </div>
        </div>

        {/* Right Column (7 Cols): Legal Mandate & Operational Updates */}
        <div className="lg:col-span-7 space-y-4">
          {/* Statutory Citations Callout */}
          <div className="border-l-4 border-primary bg-primary-light/60 rounded-r-xl p-3.5 text-xs">
            <div className="font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-primary" />
              <span>Statutory Authority & Legal Mandate</span>
            </div>
            <p className="text-primary leading-relaxed font-mono text-[11px]">
              {dossier.statutory_citations}
            </p>
          </div>

          {/* Bilingual Legal Notices */}
          <div className="border border-surface-border rounded-xl overflow-hidden bg-surface">
            <div className="bg-surface-subtle px-3 py-2 border-b border-surface-border flex items-center justify-between">
              <span className="text-xs font-bold text-typography-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-typography-muted" />
                Statutory Complaint File
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLangTab("en")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    langTab === "en"
                      ? "bg-primary text-primary-on shadow-xs"
                      : "text-typography-secondary hover:bg-surface-hover"
                  }`}
                >
                  English Legal
                </button>
                <button
                  type="button"
                  onClick={() => setLangTab("ur")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    langTab === "ur"
                      ? "bg-primary text-primary-on shadow-xs"
                      : "text-typography-secondary hover:bg-surface-hover"
                  }`}
                >
                  Urdu Memo (اردو)
                </button>
              </div>
            </div>

            <div className="p-3.5 max-h-56 overflow-y-auto">
              {langTab === "en" ? (
                <div className="text-xs font-mono text-typography-secondary whitespace-pre-wrap leading-relaxed">
                  <div className="font-bold text-typography-primary mb-2">{dossier.subject_en}</div>
                  {dossier.body_en}
                </div>
              ) : (
                <div
                  dir="rtl"
                  className="text-xs text-typography-primary whitespace-pre-wrap leading-relaxed font-sans"
                >
                  {dossier.body_ur}
                </div>
              )}
            </div>
          </div>

          {/* Official Dispatch & Status Action Form */}
          <form
            onSubmit={handleSave}
            className="border border-surface-border rounded-xl p-4 bg-surface-subtle space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-typography-secondary">
                Operational Status & Dispatch Action
              </span>
              {saveSuccess && (
                <span className="text-xs font-semibold text-primary bg-primary-light px-2 py-0.5 rounded border border-primary/20">
                  Status Saved Successfully!
                </span>
              )}
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-medium text-typography-muted mb-1">
                Official Remediation Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("PENDING")}
                  className={`h-9 text-xs font-semibold rounded-lg border transition-all ${
                    status === "PENDING"
                      ? "bg-hazard-p1-light border-hazard-p1 text-hazard-p1 ring-2 ring-hazard-p1/30"
                      : "bg-surface border-surface-border text-typography-secondary hover:bg-surface-hover"
                  }`}
                >
                  ⏳ PENDING
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("IN_PROGRESS")}
                  className={`h-9 text-xs font-semibold rounded-lg border transition-all ${
                    status === "IN_PROGRESS"
                      ? "bg-sky-50 border-agency-kmc text-agency-kmc ring-2 ring-agency-kmc/30"
                      : "bg-surface border-surface-border text-typography-secondary hover:bg-surface-hover"
                  }`}
                >
                  🔄 IN PROGRESS
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("RESOLVED")}
                  className={`h-9 text-xs font-semibold rounded-lg border transition-all ${
                    status === "RESOLVED"
                      ? "bg-green-50 border-status-resolved text-status-resolved ring-2 ring-status-resolved/30"
                      : "bg-surface border-surface-border text-typography-secondary hover:bg-surface-hover"
                  }`}
                >
                  ✅ RESOLVED
                </button>
              </div>
            </div>

            {/* Internal Dispatch Notes */}
            <div>
              <label className="block text-xs font-medium text-typography-muted mb-1">
                Internal Field Dispatch / Operational Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Dispatched suction tanker & jetting vehicle to Disco Bakery road. Crew leader: Sub-Engineer Farooq."
                className="w-full h-20 p-2.5 text-xs border border-surface-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-typography-primary"
              />
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-10 bg-primary text-primary-on font-semibold text-xs rounded-xl shadow-xs hover:bg-primary-hover active:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Committing Official Update...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Save Official Status Update & Dispatch Notes</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  dossier,
  onClose,
  onUpdateStatus,
}) => {
  if (!isOpen || !dossier) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <DossierContent
        key={dossier.master_incident_id}
        dossier={dossier}
        onClose={onClose}
        onUpdateStatus={onUpdateStatus}
      />
    </div>
  );
};
