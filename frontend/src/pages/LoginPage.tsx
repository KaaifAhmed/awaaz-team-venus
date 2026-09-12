import React, { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, Loader2, ArrowRight, UserCheck, ShieldAlert } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [portalTab, setPortalTab] = useState<"citizen" | "official">("citizen");
  const [cnic, setCnic] = useState("");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-hyphenated CNIC masking: 42XXX-XXXXXXX-X (13 digits + 2 hyphens = 15 chars)
  const formatCnic = (val: string) => {
    // Remove non-digits
    const digits = val.replace(/\D/g, "").slice(0, 13);
    let formatted = "";
    if (digits.length <= 5) {
      formatted = digits;
    } else if (digits.length <= 12) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    } else {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
    }
    return formatted;
  };

  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCnic(formatCnic(raw));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnic.trim()) {
      setErrorMsg("Please enter your CNIC or demo ID.");
      return;
    }
    setErrorMsg(null);
    try {
      const resp = await login(cnic, password);
      navigate(resp.dashboard_route || "/citizen/portal");
    } catch (err: any) {
      setErrorMsg(err?.message || "Authentication failed. Please verify credentials.");
    }
  };

  const applyDemoPersona = (
    demoCnic: string,
    demoPortal: "citizen" | "official"
  ) => {
    setPortalTab(demoPortal);
    setCnic(demoCnic);
    setPassword("password123");
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 animate-in fade-in duration-150">
        {/* Crest & Title Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <span className="text-2xl">???</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Karachi Civic AI Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Government of Sindh � Inter-Agency Civic Redressal Portal
          </p>
        </div>

        {/* Dual-Portal Segmented Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center mb-6">
          <button
            type="button"
            onClick={() => {
              setPortalTab("citizen");
              setCnic("42101-1234567-1");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              portalTab === "citizen"
                ? "bg-emerald-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ?? Citizen Access
          </button>
          <button
            type="button"
            onClick={() => {
              setPortalTab("official");
              setCnic("42201-1111111-1");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              portalTab === "official"
                ? "bg-emerald-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ??? Official Portal
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              {portalTab === "citizen"
                ? "Citizen CNIC / National ID"
                : "Government Officer CNIC / ID"}
            </label>
            <input
              type="text"
              value={cnic}
              onChange={handleCnicChange}
              placeholder="42101-XXXXXXX-X"
              maxLength={15}
              className="w-full h-11 px-3.5 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all bg-white"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Format: 42XXX-XXXXXXX-X (13 Digits)
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Secure Password / Passcode
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="��������"
                className="w-full h-11 px-3.5 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-emerald-900 text-white font-semibold text-sm rounded-xl shadow-xs hover:bg-emerald-950 active:bg-black transition-colors flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Civic AI...</span>
              </>
            ) : (
              <>
                <span>Sign In to {portalTab === "citizen" ? "Citizen Portal" : "Command Center"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick-Switch Demo Persona Chips */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              ? Quick-Switch Demo Personas
            </span>
            <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              1-Tap Fill
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => applyDemoPersona("42101-1234567-1", "citizen")}
              className={`p-2 text-left rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                cnic === "42101-1234567-1"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-800" />
              <div className="truncate">
                <div className="font-semibold truncate">Citizen Demo</div>
                <div className="text-[10px] text-slate-500 font-mono">Farhan (Gulshan)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyDemoPersona("42201-1111111-1", "official")}
              className={`p-2 text-left rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                cnic === "42201-1111111-1"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-800" />
              <div className="truncate">
                <div className="font-semibold truncate">KW&SC SDO</div>
                <div className="text-[10px] text-slate-500 font-mono">Engr. Tariq Aziz</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyDemoPersona("42201-2222222-2", "official")}
              className={`p-2 text-left rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                cnic === "42201-2222222-2"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-sky-800" />
              <div className="truncate">
                <div className="font-semibold truncate">KMC Officer</div>
                <div className="text-[10px] text-slate-500 font-mono">Syed Zafar Abbas</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyDemoPersona("42000-0000000-0", "official")}
              className={`p-2 text-left rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                cnic === "42000-0000000-0"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-purple-800" />
              <div className="truncate">
                <div className="font-semibold truncate">Super Admin</div>
                <div className="text-[10px] text-slate-500 font-mono">Commissioner HQ</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
