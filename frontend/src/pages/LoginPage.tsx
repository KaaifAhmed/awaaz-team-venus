import React, { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowRight, UserCheck, ShieldAlert, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { BrandLogo, AwaazIcon } from "../components/BrandLogo";

export const LoginPage: React.FC = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [portalTab, setPortalTab] = useState<"citizen" | "official">("citizen");
  const [cnic, setCnic] = useState("42101-1234567-1");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-hyphenated CNIC masking: 42XXX-XXXXXXX-X (13 digits + 2 hyphens = 15 chars)
  const formatCnic = (val: string) => {
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
      setErrorMsg("Please enter your CNIC or authorized ID.");
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-bg-app">
      <div className="max-w-md w-full bg-surface border border-surface-border rounded-2xl shadow-lg overflow-hidden animate-in fade-in duration-150">
        {/* Primary accent strip */}
        <div className="h-1 bg-primary" />
        
        <div className="p-6 sm:p-8">
          {/* Crest & Title Header */}
          <div className="text-center mb-6 flex flex-col items-center">
            <BrandLogo size="lg" showTagline={false} />
            <p className="text-xs text-typography-muted mt-2">
              Your Civic Voice, Legally Heard!
            </p>
          </div>

          {/* Dual-Portal Segmented Switcher */}
          <div className="bg-surface-subtle p-1 rounded-xl flex items-center mb-5 border border-surface-border">
            <button
              type="button"
              onClick={() => {
                setPortalTab("citizen");
                setCnic("42101-1234567-1");
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                portalTab === "citizen"
                  ? "bg-primary text-primary-on shadow-xs"
                  : "text-typography-secondary hover:text-typography-primary"
              }`}
            >
              <span>🏛️ Citizen Access</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalTab("official");
                setCnic("42201-1111111-1");
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                portalTab === "official"
                  ? "bg-primary text-primary-on shadow-xs"
                  : "text-typography-secondary hover:text-typography-primary"
              }`}
            >
              <span>🛡️ Official Portal</span>
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-hazard-p0-light border border-hazard-p0-border text-hazard-p0 text-xs rounded-xl flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-typography-secondary mb-1">
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
                className="w-full h-11 px-3.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface text-typography-primary"
              />
              <span className="text-[11px] text-typography-subtle mt-1 block">
                Format: 42XXX-XXXXXXX-X (13 Digits)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-typography-secondary mb-1">
                Secure Password / Passcode
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 pr-10 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface text-typography-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-typography-subtle hover:text-typography-secondary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-primary-on font-semibold text-sm rounded-xl shadow-md hover:bg-primary-hover active:opacity-90 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating with Awaaz...</span>
                </>
              ) : (
                <>
                  <span>Sign In to {portalTab === "citizen" ? "Citizen Portal" : "Command Center"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Citizen Registration Link */}
          {portalTab === "citizen" && (
            <div className="mt-5 pt-4 border-t border-surface-border text-center">
              <p className="text-xs text-typography-secondary">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-primary hover:underline"
                >
                  Register as a Citizen
                </Link>
              </p>
            </div>
          )}

          {/* Clean Collapsible Demo Personas Accordion */}
          <div className="mt-6 pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
              className="w-full flex items-center justify-between text-left text-typography-muted hover:text-typography-primary transition-colors py-1 cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Demo Personas (Evaluation 1-Tap Fill)</span>
              </div>
              {showDemoDrawer ? (
                <ChevronUp className="w-4 h-4 text-typography-subtle" />
              ) : (
                <ChevronDown className="w-4 h-4 text-typography-subtle" />
              )}
            </button>

            {showDemoDrawer && (
              <div className="mt-3 grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={() => applyDemoPersona("42101-1234567-1", "citizen")}
                  className={`p-2 text-left rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                    cnic === "42101-1234567-1"
                      ? "border-primary bg-primary-light text-primary"
                      : "border-surface-border bg-surface-subtle text-typography-secondary hover:bg-surface-hover"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <div className="truncate">
                    <div className="font-semibold truncate">Citizen Demo</div>
                    <div className="text-[10px] text-typography-muted font-mono">Farhan (Gulshan)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => applyDemoPersona("42201-1111111-1", "official")}
                  className={`p-2 text-left rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                    cnic === "42201-1111111-1"
                      ? "border-agency-kwsc bg-primary-light text-agency-kwsc"
                      : "border-surface-border bg-surface-subtle text-typography-secondary hover:bg-surface-hover"
                  }`}
                >
                  <AwaazIcon className="w-3.5 h-3.5 shrink-0 text-agency-kwsc" />
                  <div className="truncate">
                    <div className="font-semibold truncate">KW&SC SDO</div>
                    <div className="text-[10px] text-typography-muted font-mono">Engr. Tariq Aziz</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => applyDemoPersona("42201-2222222-2", "official")}
                  className={`p-2 text-left rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                    cnic === "42201-2222222-2"
                      ? "border-agency-kmc bg-sky-50 text-agency-kmc"
                      : "border-surface-border bg-surface-subtle text-typography-secondary hover:bg-surface-hover"
                  }`}
                >
                  <AwaazIcon className="w-3.5 h-3.5 shrink-0 text-agency-kmc" />
                  <div className="truncate">
                    <div className="font-semibold truncate">KMC Officer</div>
                    <div className="text-[10px] text-typography-muted font-mono">Syed Zafar Abbas</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => applyDemoPersona("42000-0000000-0", "official")}
                  className={`p-2 text-left rounded-lg border text-xs transition-colors flex items-center gap-2 ${
                    cnic === "42000-0000000-0"
                      ? "border-agency-cantonment bg-rose-50 text-agency-cantonment"
                      : "border-surface-border bg-surface-subtle text-typography-secondary hover:bg-surface-hover"
                  }`}
                >
                  <AwaazIcon className="w-3.5 h-3.5 shrink-0 text-agency-cantonment" />
                  <div className="truncate">
                    <div className="font-semibold truncate">Super Admin</div>
                    <div className="text-[10px] text-typography-muted font-mono">Commissioner HQ</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
