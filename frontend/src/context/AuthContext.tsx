import React, { useState } from "react";
import type { AuthResponse, CurrentUser } from "../api/types";
import { api, isMockModeEnabled, setMockMode } from "../api/client";
import { AuthContext } from "./auth-context-def";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<CurrentUser | null>(() => api.getCurrentUser());
  const [mockMode, setMockModeState] = useState<boolean>(() => isMockModeEnabled());
  const [loading, setLoading] = useState<boolean>(false);

  const toggleMockMode = () => {
    const next = !mockMode;
    setMockMode(next);
    setMockModeState(next);
  };

  const login = async (cnic: string, password?: string): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const response = await api.login(cnic, password);
      const currentUser: CurrentUser = {
        userId: response.user_id,
        cnic: response.cnic,
        fullName: response.full_name,
        role: response.role,
        assignedOrg: response.assigned_org,
        dashboardRoute: response.dashboard_route,
        primaryPhone: response.primary_phone,
      };
      setUser(currentUser);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        mockMode,
        toggleMockMode,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
