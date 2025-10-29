import React, { createContext, useContext, useState, useEffect } from 'react';
import { decodeJwtExp, secureFetch } from '../lib/utils';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('https://api.modovisa.com/api/me', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data?.token) {
          const exp = decodeJwtExp(data.token);
          if (exp) {
            window.__mvAccess = { token: data.token, exp };
            setUser(data.user || {});
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const response = await secureFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data?.token) {
      window.__mvAccess = { token: data.token, exp: decodeJwtExp(data.token) };
      setUser(data.user);
    }
    return data;
  }

  async function logout() {
    await secureFetch('/api/auth/logout', { method: 'POST' });
    window.__mvAccess = null;
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
