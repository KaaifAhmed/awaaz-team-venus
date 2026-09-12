import React from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, Database, Landmark, Building2, Trash2, ShieldAlert } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout, mockMode, toggleMockMode } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getOrgIcon = (org?: string | null) => {
    switch (org) {
      case "KWSC":
        return <Landmark className="w-4 h-4 text-emerald-800" />;
      case "KMC":
        return <Building2 className="w-4 h-4 text-sky-800" />;
      case "SSWMB":
        return <Trash2 className="w-4 h-4 text-amber-800" />;
      case "CANTONMENT":
        return <ShieldAlert className="w-4 h-4 text-purple-800" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-emerald-800" />;
    }
  };

  const getRoleLabel = () => {
    if (!user) return null;
    if (user.role === "SUPER_ADMIN") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-900 text-white shadow-xs">
          ? Super Admin HQ
        </span>
      );
    }
    if (user.role === "GOVT_OFFICIAL") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300">
          {getOrgIcon(user.assignedOrg)}
          {user.assignedOrg} Official
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 border border-slate-300">
        ?? Citizen Portal
      </span>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={() => {
            if (user) {
              navigate(user.dashboardRoute);
            } else {
              navigate("/login");
            }
          }}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-bold shadow-xs">
            <span className="text-xl leading-none">???</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                Karachi Civic AI Engine
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-sm">
                CWA 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Provincial Statutory Redressal & Inter-Agency Coordination
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Mock Mode Switch */}
          <button
            type="button"
            onClick={toggleMockMode}
            title={mockMode ? "Running in Offline Mock Mode" : "Connected to Live Backend API"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              mockMode
                ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-800" />
            <span className="hidden md:inline">
              {mockMode ? "Mock Demo Mode" : "Live API"}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          </button>

          {user && (
            <>
              {/* Role Badge */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">
                  {user.fullName}
                </span>
                {getRoleLabel()}
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-red-700 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
