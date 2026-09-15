import React from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Database, Landmark, Building2, Trash2, ShieldAlert, LogIn } from "lucide-react";
import { BrandLogo, AwaazIcon } from "./BrandLogo";

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
        return <Landmark className="w-4 h-4 text-agency-kwsc" />;
      case "KMC":
        return <Building2 className="w-4 h-4 text-agency-kmc" />;
      case "SSWMB":
        return <Trash2 className="w-4 h-4 text-agency-sswmb" />;
      case "CANTONMENT":
        return <ShieldAlert className="w-4 h-4 text-agency-cantonment" />;
      default:
        return <AwaazIcon className="w-4 h-4 text-primary" />;
    }
  };

  const getRoleLabel = () => {
    if (!user) return null;
    if (user.role === "SUPER_ADMIN") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-900 text-white shadow-xs">
          ⚡ Super Admin HQ
        </span>
      );
    }
    if (user.role === "GOVT_OFFICIAL") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-primary-light text-primary border border-primary/20 shadow-xs">
          {getOrgIcon(user.assignedOrg)}
          {user.assignedOrg} Official
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-surface-hover text-typography-primary border border-surface-border">
        🏛️ Citizen Portal
      </span>
    );
  };

  return (
    <header className="bg-surface/95 backdrop-blur-xs border-b border-surface-border sticky top-0 z-40 shadow-xs">
      {/* Accent strip */}
      <div className="h-0.5 bg-primary" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between" style={{height: '3.75rem'}}>
        {/* Brand / Logo */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <BrandLogo size="sm" showTagline={true} showBadge={true} tagline="Provincial Statutory Redressal &amp; Inter-Agency Coordination" />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Mock Mode Switch */}
          <button
            type="button"
            onClick={toggleMockMode}
            title={mockMode ? "Running in Offline Mock Mode" : "Connected to Live Backend API"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              mockMode
                ? "bg-primary-light text-primary border-primary/20 hover:bg-primary-light/80 shadow-xs"
                : "bg-surface-hover text-typography-muted border-surface-border hover:bg-surface-subtle"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {mockMode ? "Mock Demo" : "Live API"}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${mockMode ? 'bg-primary' : 'bg-status-resolved'}`}></span>
          </button>

          {!user ? (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-on hover:bg-primary-hover shadow-xs transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : (
            <>
              {/* Dashboard Link */}
              <button
                type="button"
                onClick={() => navigate(user.dashboardRoute)}
                className="hidden sm:inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold rounded-lg bg-surface-hover text-typography-primary border border-surface-border hover:bg-surface-subtle transition-all"
              >
                <span>My Portal</span>
              </button>

              {/* Role Badge */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-typography-muted font-medium">
                  {user.fullName}
                </span>
                {getRoleLabel()}
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-surface-border text-typography-muted hover:bg-hazard-p0-light hover:text-hazard-p0 hover:border-hazard-p0-border transition-all"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
