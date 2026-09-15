import React, { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowRight, ShieldAlert, CheckCircle2, Phone, User, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";

export const RegisterPage: React.FC = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [cnic, setCnic] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    setCnic(formatCnic(e.target.value));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full legal name.");
      return;
    }
    if (!cnic.trim()) {
      setErrorMsg("Please enter your CNIC (National ID).");
      return;
    }
    const cnicPattern = /^\d{5}-\d{7}-\d$/;
    if (!cnicPattern.test(cnic)) {
      setErrorMsg("Invalid CNIC format. Must be 13 digits: 42XXX-XXXXXXX-X.");
      return;
    }
    if (!primaryPhone.trim()) {
      setErrorMsg("Please enter your primary mobile phone number.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      const resp = await register({
        cnic: cnic.trim(),
        full_name: fullName.trim(),
        primary_phone: primaryPhone.trim(),
        password,
      });
      setSuccessMsg("Account registered successfully! Redirecting to Citizen Portal...");
      setTimeout(() => {
        navigate(resp.dashboard_route || "/citizen/portal");
      }, 500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Registration failed. Please check your details.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-bg-app">
      <div className="max-w-lg w-full bg-surface border border-surface-border rounded-2xl shadow-lg overflow-hidden animate-in fade-in duration-150">
        {/* Primary accent strip */}
        <div className="h-1 bg-primary" />
        
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6 flex flex-col items-center">
            <BrandLogo size="lg" showTagline={false} />
            <h2 className="text-base font-bold text-typography-primary mt-3">
              Citizen Registration
            </h2>
            <p className="text-xs text-typography-muted mt-1">
              Create your official account to file civic grievances and track statutory notices.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-hazard-p0-light border border-hazard-p0-border text-hazard-p0 text-xs rounded-xl flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="mb-4 p-3 bg-primary-light border border-primary/20 text-primary text-xs rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-typography-secondary mb-1">
                Full Name (As per CNIC) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. Muhammad Ali"
                  required
                  className="w-full h-11 px-3.5 pl-9 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface text-typography-primary"
                />
                <User className="w-4 h-4 absolute left-3 top-3.5 text-typography-subtle" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-typography-secondary mb-1">
                National CNIC Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cnic}
                  onChange={handleCnicChange}
                  placeholder="42101-XXXXXXX-X"
                  maxLength={15}
                  required
                  className="w-full h-11 px-3.5 pl-9 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface text-typography-primary"
                />
                <ShieldCheck className="w-4 h-4 absolute left-3 top-3.5 text-typography-subtle" />
              </div>
              <span className="text-[11px] text-typography-subtle mt-1 block">
                Format: 42XXX-XXXXXXX-X (13-digit NADRA format)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-typography-secondary mb-1">
                Primary Mobile Phone *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={primaryPhone}
                  onChange={(e) => {
                    setPrimaryPhone(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="+92 300 1234567 or 03001234567"
                  required
                  className="w-full h-11 px-3.5 pl-9 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface text-typography-primary"
                />
                <Phone className="w-4 h-4 absolute left-3 top-3.5 text-typography-subtle" />
              </div>
              <span className="text-[11px] text-typography-subtle mt-1 block">
                Used for instant WhatsApp progress alerts &amp; tracking ID delivery
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-typography-secondary mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-11 px-3.5 pr-9 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface text-typography-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-3 text-typography-subtle hover:text-typography-secondary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-typography-secondary mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 px-3.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all bg-surface text-typography-primary"
                />
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
                  <span>Registering Citizen Account...</span>
                </>
              ) : (
                <>
                  <span>Create Citizen Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 border-t border-surface-border text-center">
            <p className="text-xs text-typography-secondary">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-primary hover:underline"
              >
                Sign In to Citizen Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
