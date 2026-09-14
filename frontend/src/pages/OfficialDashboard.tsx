import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { api } from "../api/client";
import type {
  AuthorityOrg,
  ComplaintCard,
  ComplaintDossier,
  OfficialStatus,
} from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { DossierModal } from "../components/DossierModal";
import {
  ShieldAlert,
  Clock,
  Wrench,
  CheckCircle2,
  Users,
  MapPin,
  Filter,
  Eye,
  Building2,
  Landmark,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

export const OfficialDashboard: React.FC = () => {
  const { user } = useAuth();
  const currentOrg = (user?.assignedOrg || "KWSC") as AuthorityOrg;

  const [activeOrg, setActiveOrg] = useState<AuthorityOrg>(currentOrg);
  const [complaints, setComplaints] = useState<ComplaintCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Dossier Modal
  const [selectedDossier, setSelectedDossier] = useState<ComplaintDossier | null>(
    null
  );
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [loadingDossier, setLoadingDossier] = useState(false);

  const loadComplaints = useCallback(async () => {
    try {
      const data = await api.getOfficialComplaints(activeOrg);
      setComplaints(data);
    } catch (err) {
      console.error("Failed to load official complaints", err);
    } finally {
      setLoading(false);
    }
  }, [activeOrg]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const getDepartmentDetails = (org: AuthorityOrg) => {
    switch (org) {
      case "KWSC":
        return {
          name: "Karachi Water & Sewerage Corporation (KW&SC)",
          sub: "Central Operational Command — Water & Sewerage Sub-Divisions",
          icon: <Landmark className="w-5 h-5 text-agency-kwsc" />,
          accent: "border-agency-kwsc",
        };
      case "KMC":
        return {
          name: "Karachi Metropolitan Corporation (KMC)",
          sub: "Engineering Services & Arterial Road Maintenance Directorate",
          icon: <Building2 className="w-5 h-5 text-agency-kmc" />,
          accent: "border-agency-kmc",
        };
      case "SSWMB":
        return {
          name: "Sindh Solid Waste Management Board (SSWMB)",
          sub: "Municipal Solid Waste Collection & Stormwater Nullah Operations",
          icon: <Trash2 className="w-5 h-5 text-agency-sswmb" />,
          accent: "border-agency-sswmb",
        };
      case "CANTONMENT":
        return {
          name: "Cantonment Boards Administration (CBC/MOC)",
          sub: "Station Headquarters & Military Lands Municipal Services",
          icon: <ShieldAlert className="w-5 h-5 text-agency-cantonment" />,
          accent: "border-agency-cantonment",
        };
      default:
        return {
          name: org,
          sub: "Municipal Command",
          icon: <Landmark className="w-5 h-5" />,
          accent: "border-surface-border",
        };
    }
  };

  const dept = getDepartmentDetails(activeOrg);

  // Triage KPI Metrics Calculation
  const kpis = useMemo(() => {
    const list = Array.isArray(complaints) ? complaints : [];
    const totalActive = list.filter((c) => c.official_status !== "RESOLVED").length;
    const pendingCount = list.filter((c) => c.official_status === "PENDING").length;
    const inProgressCount = list.filter((c) => c.official_status === "IN_PROGRESS").length;
    const p0Emergencies = list.filter((c) => c.severity === "P0" && c.official_status !== "RESOLVED").length;
    return { totalActive, pendingCount, inProgressCount, p0Emergencies };
  }, [complaints]);

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    const list = Array.isArray(complaints) ? complaints : [];
    return list.filter((item) => {
      if (statusFilter !== "ALL" && item.official_status !== statusFilter) {
        return false;
      }
      if (severityFilter !== "ALL" && item.severity !== severityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTracking = item.tracking_id.toLowerCase().includes(q);
        const matchLandmark = item.landmark.toLowerCase().includes(q);
        const matchCat = item.issue_category.toLowerCase().includes(q);
        if (!matchTracking && !matchLandmark && !matchCat) return false;
      }
      return true;
    });
  }, [complaints, statusFilter, severityFilter, searchQuery]);

  // Open Dossier
  const handleOpenDossier = async (incidentId: string) => {
    setLoadingDossier(true);
    try {
      const dossier = await api.getComplaintDossier(incidentId);
      setSelectedDossier(dossier);
      setIsDossierOpen(true);
    } catch (err: any) {
      alert("Failed to load incident dossier: " + err?.message);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Update Status & Dispatch notes
  const handleUpdateStatus = async (
    incidentId: string,
    newStatus: OfficialStatus,
    notes: string
  ) => {
    await api.updateComplaintStatus(incidentId, newStatus, notes);
    // Refresh local state
    setComplaints((prev) =>
      prev.map((c) =>
        c.master_incident_id === incidentId || c.tracking_id === incidentId
          ? { ...c, official_status: newStatus }
          : c
      )
    );
    if (selectedDossier) {
      setSelectedDossier({
        ...selectedDossier,
        official_status: newStatus,
        official_notes: notes,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Scoped Department Banner */}
      <div className={`bg-surface border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-l-4 ${dept.accent}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-subtle flex items-center justify-center shrink-0 border border-surface-border shadow-xs">
            {dept.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-typography-primary tracking-tight">
                {dept.name}
              </h1>
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 bg-primary-light text-primary rounded-md tracking-wider">
                Official Jurisdiction
              </span>
            </div>
            <p className="text-xs text-typography-muted mt-0.5">{dept.sub}</p>
          </div>
        </div>

        {/* Agency Switcher (convenience for demo & super admin evaluation) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-typography-muted font-medium">Department:</span>
          <select
            value={activeOrg}
            onChange={(e) => setActiveOrg(e.target.value as AuthorityOrg)}
            className="h-9 px-3 text-xs font-semibold border border-surface-border rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none text-typography-primary shadow-xs"
          >
            <option value="KWSC">KW&amp;SC (Water &amp; Sewerage)</option>
            <option value="KMC">KMC (Arterial Roads)</option>
            <option value="SSWMB">SSWMB (Solid Waste)</option>
            <option value="CANTONMENT">Cantonment Boards (CBC)</option>
          </select>

          <button
            type="button"
            onClick={loadComplaints}
            className="p-2 text-typography-muted hover:text-typography-primary hover:bg-surface-subtle rounded-xl transition-all border border-surface-border"
            title="Refresh Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Triage KPI Metrics Row (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Clusters */}
        <div className="bg-surface border border-surface-border border-l-4 border-l-slate-400 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-typography-secondary uppercase tracking-wider">
              Active Clusters
            </span>
            <Users className="w-4 h-4 text-typography-subtle" />
          </div>
          <div className="text-3xl font-extrabold text-typography-primary mt-2">
            {kpis.totalActive}
          </div>
          <div className="text-[11px] text-typography-muted mt-0.5">
            Stacked neighborhood reports
          </div>
        </div>

        {/* KPI 2: Pending Action */}
        <div className="bg-surface border border-surface-border border-l-4 border-l-hazard-p1 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-hazard-p1 uppercase tracking-wider">
              Pending Action
            </span>
            <Clock className="w-4 h-4 text-hazard-p1" />
          </div>
          <div className="text-3xl font-extrabold text-typography-primary mt-2">
            {kpis.pendingCount}
          </div>
          <div className="text-[11px] text-hazard-p1 font-medium mt-0.5">
            Awaiting field crew assignment
          </div>
        </div>

        {/* KPI 3: In Progress */}
        <div className="bg-surface border border-surface-border border-l-4 border-l-agency-kmc rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-agency-kmc uppercase tracking-wider">
              Crews Dispatched
            </span>
            <Wrench className="w-4 h-4 text-agency-kmc" />
          </div>
          <div className="text-3xl font-extrabold text-typography-primary mt-2">
            {kpis.inProgressCount}
          </div>
          <div className="text-[11px] text-agency-kmc font-medium mt-0.5">
            Technical remediation active
          </div>
        </div>

        {/* KPI 4: Emergency P0 (Highlighted) */}
        <div className="bg-hazard-p0-light border border-hazard-p0-border border-l-4 border-l-hazard-p0 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-hazard-p0 uppercase tracking-wider">
              🚨 P0 Emergency
            </span>
            <AlertTriangle className="w-4 h-4 text-hazard-p0 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-hazard-p0 mt-2">
            {kpis.p0Emergencies}
          </div>
          <div className="text-[11px] text-hazard-p0 font-medium mt-0.5">
            Critical public hazard priority
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface border border-surface-border rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Tracking ID, Landmark (e.g. Disco Bakery), or Keyword..."
            className="w-full max-w-md h-9 px-3 text-xs border border-surface-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-surface text-typography-primary"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-typography-secondary">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 text-xs border border-surface-border rounded-md bg-surface text-typography-primary outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs text-typography-secondary">
            <span className="font-semibold">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-8 px-2 text-xs border border-surface-border rounded-md bg-surface text-typography-primary outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="P0">P0 Hazard Only</option>
              <option value="P1">P1 Major</option>
              <option value="P2">P2 Routine</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scoped Complaints Table */}
      <div className="bg-surface border border-surface-border rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <span className="text-xs text-typography-muted font-medium">
              Fetching departmental complaint queue...
            </span>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
            <h3 className="font-bold text-sm text-typography-primary">
              No matching departmental complaints
            </h3>
            <p className="text-xs text-typography-muted mt-1">
              All grievances in this view have been resolved or filtered out.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-subtle border-b border-surface-border text-[11px] font-bold uppercase tracking-wider text-typography-muted">
                  <th className="py-3 px-4">Tracking ID</th>
                  <th className="py-3 px-4">Category & Severity</th>
                  <th className="py-3 px-4">Landmark / Location</th>
                  <th className="py-3 px-4">Community Weight</th>
                  <th className="py-3 px-4">Evidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Operational Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-xs text-typography-secondary">
                {filteredComplaints.map((item) => (
                  <tr
                    key={item.master_incident_id}
                    className="hover:bg-surface-subtle/80 transition-colors"
                  >
                    {/* Tracking ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-typography-primary whitespace-nowrap">
                      {item.tracking_id}
                    </td>

                    {/* Category & Severity */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-typography-primary">
                        {item.issue_category}
                      </div>
                      <div className="mt-1">
                        <StatusBadge severity={item.severity} size="sm" />
                      </div>
                    </td>

                    {/* Landmark */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-typography-subtle shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{item.landmark}</span>
                      </div>
                    </td>

                    {/* Community Impact */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full border border-primary/20 text-[11px]">
                        <Users className="w-3 h-3 text-primary" />
                        {item.community_reports_count} reports stacked
                      </span>
                    </td>

                    {/* Evidence Thumbnail */}
                    <td className="py-3.5 px-4">
                      {item.evidence_photos && item.evidence_photos.length > 0 ? (
                        <div
                          onClick={() => handleOpenDossier(item.master_incident_id)}
                          className="relative h-10 w-10 rounded-lg overflow-hidden border border-surface-border cursor-pointer group shadow-2xs"
                        >
                          <img
                            src={item.evidence_photos[0]}
                            alt="Evidence"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-typography-subtle italic">None</span>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={item.official_status} size="sm" />
                    </td>

                    {/* Action CTA */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenDossier(item.master_incident_id)}
                        disabled={loadingDossier}
                        className="h-8 px-3 text-xs font-semibold bg-primary text-primary-on rounded-lg hover:bg-primary-hover active:opacity-90 transition-all shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open Dossier</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Dossier Modal */}
      <DossierModal
        isOpen={isDossierOpen}
        dossier={selectedDossier}
        onClose={() => setIsDossierOpen(false)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};
