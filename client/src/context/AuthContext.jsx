import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// Uses Railway backend URL in production, relative path in dev (Vite proxy)
const API_BASE = (typeof __API_URL__ !== 'undefined' && __API_URL__) ? __API_URL__ : '';

const PERMISSIONS = {
  admin: {
    leads: { create: true, read: true, update: true, delete: true },
    projects: { create: true, read: true, update: true, delete: true },
    pipeline: { read: true, update: true },
    tasks: { create: true, read: true, update: true, delete: true },
    partners: { create: true, read: true, update: true, delete: true },
    calls: { create: true, read: true, update: true, delete: true },
    whatsapp: { create: true, read: true, update: true, delete: true },
    reports: { read: true },
    analytics: { read: true },
    settings: { read: true, update: true },
    users: { create: true, read: true, update: true, delete: true },
  },
  manager: {
    leads: { create: true, read: true, update: true, delete: true },
    projects: { create: true, read: true, update: true, delete: true },
    pipeline: { read: true, update: true },
    tasks: { create: true, read: true, update: true, delete: true },
    partners: { create: true, read: true, update: true, delete: true },
    calls: { create: true, read: true, update: true, delete: true },
    whatsapp: { create: true, read: true, update: true, delete: true },
    reports: { read: true },
    analytics: { read: true },
    settings: { read: true, update: true },
    users: { create: false, read: false, update: false, delete: false }, // No user management
  },
  agent: {
    leads: { create: true, read: true, update: true, delete: false }, // Only own assigned leads
    projects: { create: false, read: true, update: false, delete: false },
    pipeline: { read: true, update: true }, // Only own assigned leads
    tasks: { create: true, read: true, update: true, delete: false },
    partners: { create: false, read: true, update: false, delete: false },
    calls: { create: true, read: true, update: false, delete: false },
    whatsapp: { create: false, read: true, update: false, delete: false },
    reports: { read: false }, // No reports
    analytics: { read: false }, // No analytics
    settings: { read: false, update: false }, // No settings
    users: { create: false, read: false, update: false, delete: false }, // No users
  },
  viewer: {
    // Read-only access. Cannot create/update/delete anything.
    leads: { create: false, read: true, update: false, delete: false },
    projects: { create: false, read: true, update: false, delete: false },
    pipeline: { read: true, update: false },
    tasks: { create: false, read: true, update: false, delete: false },
    partners: { create: false, read: true, update: false, delete: false },
    calls: { create: false, read: true, update: false, delete: false },
    whatsapp: { create: false, read: true, update: false, delete: false },
    reports: { read: true },
    analytics: { read: true },
    settings: { read: false, update: false },
    users: { create: false, read: false, update: false, delete: false },
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('crm_token'));
  const [authLoading, setAuthLoading] = useState(true);

  // On mount, if token exists, verify with /api/auth/me
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          if (r.status === 401) {
            logout();
            return null;
          }
          return r.json();
        })
        .then((data) => {
          if (data && data.success) {
            setUser(data.data);
          } else if (data) {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (identifier, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('crm_token', data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
      return { success: true };
    }
    return { success: false, message: data.message || 'Login failed' };
  }, []);

  const register = useCallback(async (regData) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('crm_token', data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
      return { success: true };
    }
    return { success: false, message: data.message || 'Registration failed' };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('crm_token');
    setToken(null);
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (resource, action) => {
      if (!user) return false;
      const role = (user.role || '').toLowerCase();
      if (role === 'admin') return true; // Admin has full access to everything
      if (user.permissions && user.permissions[resource]) {
        if (user.permissions[resource][action] !== undefined) {
          return Boolean(user.permissions[resource][action]);
        }
      }
      const rolePerms = PERMISSIONS[role];
      if (!rolePerms || !rolePerms[resource]) return false;
      return Boolean(rolePerms[resource][action]);
    },
    [user]
  );

  const updateUser = useCallback(
    (updatedUser) => {
      setUser((prev) => ({ ...prev, ...updatedUser }));
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authLoading,
        login,
        register,
        logout,
        hasPermission,
        can: hasPermission,
        updateUser,
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
