import { createContext } from "react";
import type { AuthResponse, CurrentUser, RegisterPayload } from "../api/types";

export interface AuthContextType {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  mockMode: boolean;
  toggleMockMode: () => void;
  login: (cnic: string, password?: string) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
