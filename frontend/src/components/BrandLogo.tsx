import React from "react";

/**
 * BrandLogo — Single source of truth for Awaaz branding.
 * 
 * Renders the brand icon + wordmark. Used by Navbar, LoginPage, LandingPage, and Footer.
 * Never hardcode the brand name anywhere else — always use this component.
 */

interface BrandLogoProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show tagline below the brand name */
  showTagline?: boolean;
  /** Custom tagline override */
  tagline?: string;
  /** Show the CWA 2026 badge */
  showBadge?: boolean;
}

/** Awaaz megaphone-in-shield icon as inline SVG */
const AwaazIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Megaphone / voice symbol */}
    <path d="M18 8a6 6 0 0 1 0 8" />
    <path d="M21 5a10 10 0 0 1 0 14" />
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
  </svg>
);

export const BRAND = {
  name: "Awaaz",
  fullName: "Awaaz — Karachi Civic AI Platform",
  tagline: "Your civic voice, legally heard.",
  subtitle: "Provincial Statutory Redressal & Inter-Agency Coordination",
  trackingPrefix: "AWZ",
} as const;

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showTagline = false,
  tagline,
  showBadge = false,
}) => {
  const iconSize = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-14 h-14",
  }[size];

  const iconInner = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-8 h-8",
  }[size];

  const titleSize = {
    sm: "text-sm",
    md: "text-sm sm:text-base",
    lg: "text-2xl",
  }[size];

  const roundedSize = {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
  }[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${iconSize} ${roundedSize} bg-primary text-primary-on flex items-center justify-center shadow-xs ${
          size === "lg" ? "ring-4 ring-primary-light shadow-md" : ""
        }`}
      >
        <AwaazIcon className={iconInner} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span
            className={`font-extrabold text-typography-primary tracking-tight ${titleSize}`}
          >
            {BRAND.name}
          </span>
          {showBadge && (
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 bg-primary-light text-primary rounded tracking-wider">
              CWA 2026
            </span>
          )}
        </div>
        {showTagline && (
          <p className="text-[11px] text-typography-muted hidden sm:block leading-tight">
            {tagline || BRAND.tagline}
          </p>
        )}
      </div>
    </div>
  );
};

export { AwaazIcon };
export default BrandLogo;
