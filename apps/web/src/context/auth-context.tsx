import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import {
  AuthTokensResponse,
  AuthUserResponse,
  AuthTenantResponse,
  LoginInput,
  RegisterOwnerInput,
} from '@fitnexa/shared';

interface AuthContextType {
  user: AuthUserResponse | null;
  tenant: AuthTenantResponse | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  registerOwner: (data: RegisterOwnerInput) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'fitnexa_access_token';
const REFRESH_TOKEN_KEY = 'fitnexa_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [tenant, setTenant] = useState<AuthTenantResponse | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync token to Axios client headers
  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user profile on initial boot if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const { data } = await apiClient.get('/auth/me');
        setUser(data.data.user);
        setTenant(data.data.tenant);
        setToken(storedToken);
      } catch {
        // Token invalid or expired
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setToken(null);
        setUser(null);
        setTenant(null);
        delete apiClient.defaults.headers.common['Authorization'];
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleAuthSuccess = (tokens: AuthTokensResponse) => {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    setToken(tokens.accessToken);
    setUser(tokens.user);
    setTenant(tokens.tenant);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
  };

  const login = async (credentials: LoginInput) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    handleAuthSuccess(data.data);
  };

  const registerOwner = async (input: RegisterOwnerInput) => {
    const { data } = await apiClient.post('/auth/register-owner', input);
    handleAuthSuccess(data.data);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch {
      // Ignore network failures on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setToken(null);
      setUser(null);
      setTenant(null);
      delete apiClient.defaults.headers.common['Authorization'];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        isLoading,
        login,
        registerOwner,
        logout,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
