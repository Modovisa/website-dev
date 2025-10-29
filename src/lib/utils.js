import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const API_BASE_URL = 'https://api.modovisa.com';

export async function secureFetch(url, options = {}) {
  const token = window.__mvAccess?.token;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
  };

  const response = await fetch(
    url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
    { ...defaultOptions, ...options }
  );

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
}

export function decodeJwtExp(token) {
  try {
    const base = (token || '').split('.')[1] || '';
    const norm = base.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (norm.length % 4)) % 4);
    const p = JSON.parse(atob(norm + pad));
    return p?.exp || null;
  } catch {
    return null;
  }
}
