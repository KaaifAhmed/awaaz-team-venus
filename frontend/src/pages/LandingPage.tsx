import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  Server,
  Cpu,
  Lock,
  Workflow,
  Database,
  Activity,
  FileText,
  ArrowRight,
  Sparkles,
  Zap,
  Landmark,
  Building2,
  Trash2,
  ShieldAlert,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { AwaazIcon } from "../components/BrandLogo";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, mockMode, toggleMockMode } = useAuth();

  // Tab state for the AI technical breakdown
  const [activeTab, setActiveTab] = useState<"perception" | "routing" | "security" | "workers">("perception");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-violet-100 selection:text-violet-900">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-16 pb-20 lg:pt-24 lg:pb-28">
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-b from-violet-100/70 via-slate-50 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-900 border border-violet-200/70 shadow-xs mb-8">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span>Awaaz • CWA 2026</span>
          </div>

          {/* Punchy, Shortened Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Awaaz —{" "}
            <span className="text-violet-700">Your Civic Voice, Legally Heard</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Converting WhatsApp voice notes, photos, and Urdu messages into legally binding municipal complaints—routed
            deterministically without the bureaucratic runaround.
          </p>

          {/* Active User Shortcut if logged in */}
          {isAuthenticated && user && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 shadow-xs">
              <span>Signed in as <strong>{user.fullName}</strong></span>
              <button
                onClick={() => navigate(user.dashboardRoute)}
                className="text-violet-700 font-bold hover:text-violet-900 ml-1"
              >
                Go to Dashboard &rarr;
              </button>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl text-white bg-violet-900 hover:bg-violet-950 shadow-sm transition-all"
            >
              <LogIn className="w-4 h-4 text-violet-200" />
              <span>{isAuthenticated ? "Switch Account / Portals" : "Sign In / Register"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate("/citizen/portal")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-xs transition-all"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>File a Grievance</span>
            </button>
          </div>

          {/* 3 Clean Portal Entry Cards */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
            {/* Citizen Card */}
            <div
              onClick={() => navigate("/citizen/portal")}
              className="group bg-slate-50 hover:bg-white border border-slate-200/90 rounded-2xl p-6 transition-all hover:border-violet-300 hover:shadow-md cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-100/70 text-violet-900 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-violet-900">
                Citizen Intake
              </h2>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Submit voice notes in Urdu/Roman Urdu, upload photos, and review plain-language AI summaries before filing.
              </p>
            </div>

            {/* Official Card */}
            <div
              onClick={() => navigate("/admin/dashboard")}
              className="group bg-slate-50 hover:bg-white border border-slate-200/90 rounded-2xl p-6 transition-all hover:border-sky-300 hover:shadow-md cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-100/70 text-sky-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Landmark className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-sky-800">
                Official Command
              </h2>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Role-protected dashboard scoped strictly to KW&amp;SC, KMC, SSWMB, or Cantonments with clustered proof.
              </p>
            </div>

            {/* Super Admin Card */}
            <div
              onClick={() => navigate("/admin/super")}
              className="group bg-slate-50 hover:bg-white border border-slate-200/90 rounded-2xl p-6 transition-all hover:border-purple-300 hover:shadow-md cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-purple-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-purple-800">
                Super Admin HQ
              </h2>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                City-wide cross-agency oversight, real-time telemetry, queue depths, and multi-gate prompt shield status.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THE PROBLEM: JURISDICTIONAL FRICTION IN KARACHI */}
      {/* ========================================================================= */}
      <section className="py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-50 px-3 py-1 rounded-md border border-violet-200/70">
              The Civic Bottleneck
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              Why Grievances Get Lost in Karachi
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              When a sewer overflows or road collapses, citizens don't know who owns the infrastructure.
              Complaints get bounced endlessly between competing authorities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KWSC */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-lg bg-violet-50 text-violet-900">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">KW&amp;SC</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Water supply mains, sewer trunk lines, and open manholes under the KW&amp;SC Act 2023.
              </p>
            </div>

            {/* KMC */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">KMC</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                26 major arterial corridors and primary stormwater nullahs under the Sindh Local Govt Act.
              </p>
            </div>

            {/* SSWMB */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">SSWMB</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Solid waste collection, municipal dumpsters, and landfill transit under the SSWMB Act 2014.
              </p>
            </div>

            {/* Cantonments */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">6 Cantonments</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Federal military and DHA territories governed independently under the Cantonments Act 1924.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SYSTEM ARCHITECTURE (SLEEK, CLEAN, HIGH-END) */}
      {/* ========================================================================= */}
      <section className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-50 px-3 py-1 rounded-md border border-violet-200/70">
              System Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              Clean Microservices &amp; Zero-Bloat Queue
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Designed so heavy media never bottlenecks the broker, and AI models operate in complete database isolation.
            </p>
          </div>

          {/* Clean Architecture Diagram Card */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-8 shadow-sm border border-slate-800 mb-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              {/* Step 1 */}
              <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/80 text-center">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Workflow className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">1. Intake</h4>
                <p className="text-xs text-slate-400 mt-1">Web &amp; WhatsApp</p>
                <div className="mt-3 inline-block text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                  Audio &bull; Photo &bull; Text
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-800/80 rounded-xl p-5 border border-violet-500/30 text-center relative">
                <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-300 flex items-center justify-center mx-auto mb-3">
                  <Server className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">2. Main Service</h4>
                <p className="text-xs text-slate-400 mt-1">Django 5 + PostgreSQL</p>
                <div className="mt-3 inline-block text-[10px] font-mono text-violet-300 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-500/20">
                  Stores Media &bull; Enqueues ID
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-800/80 rounded-xl p-5 border border-amber-500/30 text-center">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center mx-auto mb-3">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">3. Redis Broker</h4>
                <p className="text-xs text-slate-400 mt-1">Queue: <code className="text-amber-300">ai_queue</code></p>
                <div className="mt-3 inline-block text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/20">
                  64-byte Job Tokens
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-800/80 rounded-xl p-5 border border-purple-500/30 text-center">
                <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center mx-auto mb-3">
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">4. 3x AI Workers</h4>
                <p className="text-xs text-slate-400 mt-1">LangGraph + Gemini</p>
                <div className="mt-3 inline-block text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/20">
                  BLPOP Load Balanced
                </div>
              </div>
            </div>
          </div>

          {/* 2 Core Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-violet-900" />
                <h3 className="text-sm font-bold text-slate-900">Decoupled Job Buffer Pattern</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Large binary files (photos, audio notes) never touch Redis. The Main Service saves media to persistent storage
                and enqueues only a lightweight <code>job_id</code> string. Workers pull media on demand over authenticated internal HTTP.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Zero-Database-Access Principle</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                AI Workers operate with zero PostgreSQL credentials or network access to the database. They communicate strictly
                through scoped internal REST endpoints (<code>GET /api/internal/jobs</code> and <code>POST /api/internal/worker-callback</code>).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. AI SYSTEM & WORKFLOW (CORE FOCUS) */}
      {/* ========================================================================= */}
      <section className="py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-50 px-3 py-1 rounded-md border border-violet-200/70">
              The Intelligence Layer
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              Google Gemini 3.5 Flash &amp; LangGraph
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Unified multimodal perception, deterministic GIS jurisdiction routing, multi-gate security, and distributed task execution.
            </p>
          </div>

          {/* LangGraph Visual Pipeline Strip (Two Responsive Lines) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-10 shadow-xs max-w-4xl mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center sm:text-left">
              LangGraph State Graph Execution Sequence
            </div>

            {/* Line 1: Ingestion, Perception & Routing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200/70 font-medium text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>1. Gate 1: Input Shield</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-violet-50 text-violet-900 border border-violet-200/70 font-medium text-xs">
                <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
                <span>2. Gemini 3.5 Perception</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200/70 font-medium text-xs">
                <Landmark className="w-4 h-4 shrink-0" />
                <span>3. GIS Spatial Router</span>
              </div>
            </div>

            {/* Line 2: Deduplication, Dossier Generation & Security Output */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/70 font-medium text-xs">
                <Workflow className="w-4 h-4 shrink-0" />
                <span>4. 50m / 72h Deduplication</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200/70 font-medium text-xs">
                <FileText className="w-4 h-4 shrink-0" />
                <span>5. Dual Dossier Generator</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-medium text-xs">
                <Lock className="w-4 h-4 shrink-0" />
                <span>6. Gate 3: Output Guard</span>
              </div>
            </div>
          </div>

          {/* Clean Segment Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveTab("perception")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "perception"
                  ? "bg-violet-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Multimodal &amp; Citizen Review
            </button>
            <button
              onClick={() => setActiveTab("routing")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "routing"
                  ? "bg-violet-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Spatial Routing &amp; Dedup
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "security"
                  ? "bg-violet-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Multi-Gate Prompt Shield
            </button>
            <button
              onClick={() => setActiveTab("workers")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "workers"
                  ? "bg-violet-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Distributed 3-Worker Pool
            </button>
          </div>

          {/* Tab 1: Perception & Citizen Review */}
          {activeTab === "perception" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-1">Unified Perception</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Native Gemini 3.5 Flash</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Voice notes in Urdu / Roman Urdu, scene photographs, and text are processed in a single multimodal pass—eliminating external Whisper transcription pipelines.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-1">Dual-Audience Generation</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Layman vs. Statutory</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Crafts a conversational <em>Layman Summary</em> for resident clarity, alongside a formal <em>Statutory Dossier</em> citing the KW&amp;SC Act 2023, SLGA 2021, and Constitution Arts. 9 &amp; 14.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-1">Human-in-the-Loop</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Resident Approval Gate</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Zero complaints are submitted to the official government dashboard until the citizen explicitly confirms submission on Web or WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Routing */}
          {activeTab === "routing" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-1">Stage 1</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Cantonment Raycasting</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Point-in-polygon algorithm checks GPS against 6 Cantonment polygons (CBC, KCB, Faisal, Malir, Korangi Creek, Manora).
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-1">Stage 2</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">KMC Arterial Proximity</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Evaluates proximity to 26 major corridors (Shahrah-e-Faisal, University Road, etc.) and primary drainage nullahs.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-1">Stage 3</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">50m / 72h Deduplication</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Haversine formula groups duplicate neighbor complaints into one master incident, incrementing community clout and evidence.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Security */}
          {activeTab === "security" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Gate 1</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Input Filter</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Prompt Shield scans raw citizen inputs for jailbreaks and adversarial overrides before the model ever runs.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Gate 2</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Tool Sanitizer</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sanitizes deduplication results and GIS attributes to block indirect prompt injections from external sources.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-1">Gate 3 &amp; RBAC</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Output Guard &amp; RBAC</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Blocks API key leakage (<code>sk-...</code>, <code>AIza...</code>). Separated from Django native multi-tenant RBAC.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Workers */}
          {activeTab === "workers" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4 text-violet-900" />
                    <span>Redis Queue Load Balancing</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    3 independent Python worker processes consume from Redis via atomic <code>BLPOP</code>.
                    Any idle worker instantly consumes the next job. Completed results are cached with a 1-hour TTL for instant frontend polling.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-700" />
                    <span>LiteLLM Dynamic Fallback</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Primary inference runs on <strong>Google Gemini 3.5 Flash</strong>. If an upstream 429 rate limit or timeout occurs,
                    LiteLLM automatically fails over to Gemini 2.0 Flash or 1.5 Flash with zero downtime.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="py-20 bg-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Test the System?
          </h2>
          <p className="mt-4 text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
            Experience the citizen intake workflow, inspect the official command dashboard, or toggle between Live API and Mock Demo modes.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-all shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Launch Platform</span>
            </button>
            <button
              onClick={toggleMockMode}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700 hover:text-white transition-all"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Mode: {mockMode ? "Mock Demo" : "Live API"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FOOTER & TECHNOLOGY MATRIX */}
      {/* ========================================================================= */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                <AwaazIcon className="w-5 h-5 text-violet-400" />
                <span>Awaaz — Karachi Civic AI Platform (Team Venus)</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-md">
                Production-grade multi-agent architecture designed for municipal governance in Karachi.
                Developed for CWA Ship Karachi 2026.
              </p>
            </div>

            <div>
              <div className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">System Portals</div>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate("/citizen/portal")} className="hover:text-white transition-colors">
                    Citizen Intake &amp; Tracking
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/admin/dashboard")} className="hover:text-white transition-colors">
                    Government Official Command
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/admin/super")} className="hover:text-white transition-colors">
                    Super Admin City Overview
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/login")} className="hover:text-white transition-colors">
                    Authentication &amp; Role Switcher
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-white font-bold mb-3 uppercase tracking-wider text-[11px]">Technology Matrix</div>
              <p className="text-slate-400 leading-relaxed">
                React 19 &bull; Vite &bull; Tailwind CSS &bull; Django 5 &bull; PostgreSQL 16 (PGVector) &bull; Redis 7 &bull;
                LangGraph &bull; LiteLLM &bull; Google Gemini 3.5 Flash &bull; Express.js (Baileys)
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div>&copy; 2026 Team Venus &bull; Awaaz — Karachi Civic AI Platform. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <span className="text-slate-500">Autonomous Statutory Municipal Redressal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
