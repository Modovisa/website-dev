// src/hooks/useAuthGuard.ts

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AccessToken {
  token: string;
  exp: number;
}

declare global {
  interface Window {
    __mvAccess?: AccessToken;
  }
}

// Decode JWT to get expiration
function decodeJwtExp(token: string): number | null {
  try {
    const base = (token || '').split('.')[1] || '';
    const norm = base.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (norm.length % 4)) % 4);
    const payload = JSON.parse(atob(norm + pad));
    return payload?.exp || null;
  } catch {
    return null;
  }
}

export const useAuthGuard = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('https://api.modovisa.com/api/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store'
        });

        if (!res.ok) {
          throw new Error('Not authenticated');
        }

        const data = await res.json();

        // Store access token globally for secureFetch
        if (data?.token) {
          const exp = decodeJwtExp(data.token);
          if (exp) {
            window.__mvAccess = { token: data.token, exp };
          }
        }

        setIsAuthenticated(true);
      } catch (err) {
        console.warn('Authentication check failed, redirecting to login');
        navigate('/login', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  return { isAuthenticated, isLoading };
};