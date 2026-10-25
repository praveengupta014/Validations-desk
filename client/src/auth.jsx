import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vd_user')); } catch { return null; }
  });
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  const toast = useCallback((text, level = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, level }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  // live alerts for officers / admins
  useEffect(() => {
    const token = localStorage.getItem('vd_token');
    if (!user || !token) return;

    // On Vercel without custom socket server, skip socket polling to avoid 404 console errors
    const isVercel = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
    if (isVercel && !import.meta.env.VITE_SOCKET_URL) {
      return;
    }

    const socketEndpoint = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') : undefined);
    const s = io(socketEndpoint, {
      auth: { token },
      reconnectionAttempts: 2,
      timeout: 5000,
    });
    socketRef.current = s;
    s.on('alert', (a) => toast(a.text, a.level));
    s.on('connect_error', () => {
      // Silently handle if socket server is unavailable
    });
    return () => s.disconnect();
  }, [user, toast]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('vd_token', data.token);
    localStorage.setItem('vd_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('vd_token', data.token);
    localStorage.setItem('vd_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };
  const logout = () => {
    localStorage.removeItem('vd_token');
    localStorage.removeItem('vd_user');
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, login, register, logout, toast, socket: socketRef }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`animate-slidein rounded-xl border-l-4 bg-white p-3 text-sm shadow-soft ring-1 ring-slate-100 ${t.level === 'critical' ? 'border-rose-500' : t.level === 'success' ? 'border-emerald-500' : 'border-brand-500'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
