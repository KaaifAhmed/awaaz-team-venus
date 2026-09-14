import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { SuperAdminOverview } from "../api/types";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Activity,
  Server,
  Zap,
  Radio,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Database,
  Building2,
  Landmark,
  Trash2,
  Shield,
  Loader2,
} from "lucide-react";

export const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    try {
      const data = await api.getSuperAdminOverview();
      setOverview(data);
    } catch (err) {
      console.error("Failed to load super admin overview", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const getOrgIcon = (org: string) => {
    switch (org) {
      case "KWSC":
        return <Landmark className="w-5 h-5 text-agency-kwsc" />;
      case "KMC":
        return <Building2 className="w-5 h-5 text-agency-kmc" />;
      case "SSWMB":
        return <Trash2 className="w-5 h-5 text-agency-sswmb" />;
      case "CANTONMENT":
        return <ShieldAlert className="w-5 h-5 text-agency-cantonment" />;
      default:
        return <Building2 className="w-5 h-5 text-typography-secondary" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-primary text-primary-on rounded-xl shadow-xs">
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-typography-primary tracking-tight">
              City-Wide Civic Matrix &amp; Intelligence
            </h1>
          </div>
          <p className="text-xs text-typography-muted mt-1.5">
            Provincial Commissioner HQ — Cross-Agency Enforcement &amp; System Health Telemetry
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="self-start sm:self-auto h-9 px-4 text-xs font-semibold bg-primary text-primary-on rounded-xl hover:bg-primary-hover transition-all inline-flex items-center gap-1.5 shadow-xs"
        >
          <span>Switch to Department View</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {loading || !overview ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <span className="text-xs text-typography-muted">
            Gathering municipal matrix and worker telemetry...
          </span>
        </div>
      ) : (
        <>
          {/* Section 1: 4-Agency City-Wide Matrix Comparison */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-typography-secondary">
                4-Agency Municipal Jurisdiction Matrix
              </h2>
              <span className="text-xs text-typography-subtle">
                Synchronized via Sindh Civic Act Registry
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {overview.agencies.map((agency) => (
                <div
                  key={agency.org}
                  className="bg-surface border border-surface-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-surface-border-strong transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Agency Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-subtle flex items-center justify-center border border-surface-border shadow-xs">
                        {getOrgIcon(agency.org)}
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-surface-subtle text-typography-secondary tracking-wider border border-surface-border">
                        {agency.org}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-typography-primary line-clamp-1">
                      {agency.name}
                    </h3>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-surface-border">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-typography-subtle block">
                          Active Clusters
                        </span>
                        <span className="text-2xl font-extrabold text-typography-primary">
                          {agency.activeCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-primary block">
                          Resolved
                        </span>
                        <span className="text-2xl font-extrabold text-primary">
                          {agency.resolvedCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Metrics */}
                  <div className="mt-4 pt-3 border-t border-surface-border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-typography-muted">P0 Emergencies:</span>
                      <span className="font-bold text-hazard-p0 bg-hazard-p0-light px-2 py-0.5 rounded-md text-[11px] border border-hazard-p0-border">
                        🚨 {agency.p0EmergencyCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-typography-muted">Avg Resolution:</span>
                      <span className="font-semibold text-typography-secondary font-mono text-[11px]">
                        {agency.avgResolutionTimeHours} hrs
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: System Health & AI Engine Telemetry */}
          <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-typography-primary tracking-tight">
                  System Engine Health & Worker Telemetry
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-resolved animate-ping"></span>
                <span className="text-xs font-semibold text-primary">
                  {overview.systemHealth.lastTelemetrySync}
                </span>
              </div>
            </div>

            {/* Metric Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Queue Depth */}
              <div className="bg-surface-subtle border border-surface-border rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-typography-muted text-[11px] font-bold uppercase">
                  <Database className="w-3.5 h-3.5" />
                  <span>Redis Queue</span>
                </div>
                <div className="text-2xl font-bold font-mono text-typography-primary mt-1">
                  {overview.systemHealth.redisQueueDepth}
                </div>
                <div className="text-[10px] text-typography-subtle mt-0.5">Pending Jobs</div>
              </div>

              {/* AI Worker Status */}
              <div className="bg-surface-subtle border border-surface-border rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-typography-muted text-[11px] font-bold uppercase">
                  <Server className="w-3.5 h-3.5" />
                  <span>AI Worker</span>
                </div>
                <div className="text-sm font-bold text-primary mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-status-resolved" />
                  <span>{overview.systemHealth.aiWorkerStatus}</span>
                </div>
                <div className="text-[10px] text-typography-subtle mt-1">Ollama / Gemini</div>
              </div>

              {/* WhatsApp Webhook */}
              <div className="bg-surface-subtle border border-surface-border rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-typography-muted text-[11px] font-bold uppercase">
                  <Radio className="w-3.5 h-3.5" />
                  <span>WhatsApp Inbound</span>
                </div>
                <div className="text-sm font-bold text-primary mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-status-resolved" />
                  <span>{overview.systemHealth.whatsappWebhookStatus}</span>
                </div>
                <div className="text-[10px] text-typography-subtle mt-1">Meta Graph Hook</div>
              </div>

              {/* Active Workers */}
              <div className="bg-surface-subtle border border-surface-border rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-typography-muted text-[11px] font-bold uppercase">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Workers</span>
                </div>
                <div className="text-2xl font-bold font-mono text-typography-primary mt-1">
                  {overview.systemHealth.activeWorkersCount}
                </div>
                <div className="text-[10px] text-typography-subtle mt-0.5">Celery / Background</div>
              </div>

              {/* Avg Inference Latency */}
              <div className="bg-surface-subtle border border-surface-border rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-typography-muted text-[11px] font-bold uppercase">
                  <Clock className="w-3.5 h-3.5" />
                  <span>AI Latency</span>
                </div>
                <div className="text-2xl font-bold font-mono text-typography-primary mt-1">
                  {overview.systemHealth.avgInferenceLatencyMs}
                  <span className="text-xs font-normal text-typography-muted ml-1">ms</span>
                </div>
                <div className="text-[10px] text-typography-subtle mt-0.5">Avg Per Perception</div>
              </div>

              {/* DB Uptime */}
              <div className="bg-surface-subtle border border-surface-border rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-typography-muted text-[11px] font-bold uppercase">
                  <Shield className="w-3.5 h-3.5" />
                  <span>DB Uptime</span>
                </div>
                <div className="text-2xl font-bold font-mono text-typography-primary mt-1">
                  {overview.systemHealth.dbUptimePercentage}%
                </div>
                <div className="text-[10px] text-typography-subtle mt-0.5">PostgreSQL 16</div>
              </div>
            </div>

            {/* Architecture Governance Note */}
            <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border text-xs text-typography-secondary leading-relaxed">
              <strong className="text-typography-primary">Statutory Inter-Agency Routing Rule:</strong>{" "}
              Any grievance submitted within 500 meters of a cantonment boundary is cross-indexed with
              both the relevant Local Government Agency (KW&SC / KMC) and CBC to prevent jurisdictional ping-pong.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
