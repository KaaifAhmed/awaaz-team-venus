import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { Navbar } from "./components/Navbar";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CitizenPortal } from "./pages/CitizenPortal";
import { OfficialDashboard } from "./pages/OfficialDashboard";
import { SuperAdminPage } from "./pages/SuperAdminPage";
import { LandingPage } from "./pages/LandingPage";

// Route Guard for Authenticated Users
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ("CITIZEN" | "GOVT_OFFICIAL" | "SUPER_ADMIN")[];
}> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as any)) {
    return <Navigate to={user.dashboardRoute || "/login"} replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Technical Landing Page */}
              <Route path="/" element={<LandingPage />} />

              {/* Login Page */}
              <Route path="/login" element={<LoginPage />} />

              {/* Citizen Registration Page */}
              <Route path="/register" element={<RegisterPage />} />

              {/* Citizen Portal */}
              <Route
                path="/citizen/portal"
                element={
                  <ProtectedRoute allowedRoles={["CITIZEN", "GOVT_OFFICIAL", "SUPER_ADMIN"]}>
                    <CitizenPortal />
                  </ProtectedRoute>
                }
              />

              {/* Official Department Command Dashboard */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["GOVT_OFFICIAL", "SUPER_ADMIN"]}>
                    <OfficialDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Super Admin City-Wide Overview */}
              <Route
                path="/admin/super"
                element={
                  <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                    <SuperAdminPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
