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
  login: (credentials: LoginInput) => Promise<AuthTokensResponse>;
  registerOwner: (data: RegisterOwnerInput) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  impersonateTenant: (token: string, tenant: AuthTenantResponse, user: AuthUserResponse) => void;
  stopImpersonating: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'fitnexa_access_token';
const REFRESH_TOKEN_KEY = 'fitnexa_refresh_token';
const ORIGINAL_TOKEN_KEY = 'fitnexa_original_admin_token';
const ORIGINAL_USER_KEY = 'fitnexa_original_admin_user';

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
        const payload = data?.data || data;
        setUser(payload.user);
        setTenant(payload.tenant);
        setToken(storedToken);
      } catch {
        // Try refresh token before clearing session
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        let recovered = false;
        if (storedRefreshToken) {
          try {
            const refreshRes = await apiClient.post('/auth/refresh', {
              refreshToken: storedRefreshToken,
            });
            const refreshPayload = refreshRes.data?.data || refreshRes.data;
            if (refreshPayload?.accessToken) {
              localStorage.setItem(TOKEN_KEY, refreshPayload.accessToken);
              if (refreshPayload.refreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, refreshPayload.refreshToken);
              }
              setToken(refreshPayload.accessToken);
              apiClient.defaults.headers.common['Authorization'] = `Bearer ${refreshPayload.accessToken}`;
              const meRes = await apiClient.get('/auth/me');
              const mePayload = meRes.data?.data || meRes.data;
              setUser(mePayload.user);
              setTenant(mePayload.tenant);
              recovered = true;
            }
          } catch {
            recovered = false;
          }
        }

        if (!recovered) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          setToken(null);
          setUser(null);
          setTenant(null);
          delete apiClient.defaults.headers.common['Authorization'];
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleAuthSuccess = (rawTokens: AuthTokensResponse | { data: AuthTokensResponse }) => {
    const tokens = ('data' in rawTokens ? rawTokens.data : rawTokens) as AuthTokensResponse;
    if (!tokens || !tokens.accessToken) {
      throw new Error('Invalid authentication response from server');
    }
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    setToken(tokens.accessToken);
    setUser(tokens.user);
    setTenant(tokens.tenant);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
  };

  const login = async (credentials: LoginInput) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    const tokens = ('data' in data ? data.data : data) as AuthTokensResponse;
    handleAuthSuccess(data);
    return tokens;
  };

  const registerOwner = async (input: RegisterOwnerInput) => {
    const { data } = await apiClient.post('/auth/register-owner', input);
    handleAuthSuccess(data);
  };

  const [isImpersonating, setIsImpersonating] = useState<boolean>(
    () => !!localStorage.getItem(ORIGINAL_TOKEN_KEY),
  );

  const reloadProfile = async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      const payload = data?.data || data;
      setUser(payload.user);
      setTenant(payload.tenant);
    } catch {
      // Ignore
    }
  };

  const clearMustChangePassword = () => {
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
  };

  const impersonateTenant = (
    clientToken: string,
    clientTenant: AuthTenantResponse,
    clientUser: AuthUserResponse,
  ) => {
    // Preserve original super admin credentials
    if (!localStorage.getItem(ORIGINAL_TOKEN_KEY) && token && user) {
      localStorage.setItem(ORIGINAL_TOKEN_KEY, token);
      localStorage.setItem(ORIGINAL_USER_KEY, JSON.stringify(user));
    }
    localStorage.setItem(TOKEN_KEY, clientToken);
    setToken(clientToken);
    setUser(clientUser);
    setTenant(clientTenant);
    setIsImpersonating(true);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${clientToken}`;
  };

  const stopImpersonating = async () => {
    const originalToken = localStorage.getItem(ORIGINAL_TOKEN_KEY);
    const originalUserStr = localStorage.getItem(ORIGINAL_USER_KEY);

    localStorage.removeItem(ORIGINAL_TOKEN_KEY);
    localStorage.removeItem(ORIGINAL_USER_KEY);
    setIsImpersonating(false);

    if (originalToken) {
      localStorage.setItem(TOKEN_KEY, originalToken);
      setToken(originalToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${originalToken}`;
      if (originalUserStr) {
        try {
          setUser(JSON.parse(originalUserStr));
        } catch {
          // Fallback
        }
      }
      await reloadProfile();
    } else {
      await logout();
    }
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
      localStorage.removeItem(ORIGINAL_TOKEN_KEY);
      localStorage.removeItem(ORIGINAL_USER_KEY);
      setToken(null);
      setUser(null);
      setTenant(null);
      setIsImpersonating(false);
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
        isImpersonating,
        impersonateTenant,
        stopImpersonating,
        reloadProfile,
        clearMustChangePassword,
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



