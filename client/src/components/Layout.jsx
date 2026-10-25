import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus2, FolderOpen, Inbox, SlidersHorizontal, ScrollText, LogOut, Users } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { Logo } from './ui.jsx';

const NAV = {
  institute: [
    { to: '/institute', label: 'My applications', icon: FolderOpen, end: true },
    { to: '/institute/new', label: 'New application', icon: FilePlus2 },
  ],
  officer: [
    { to: '/officer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/officer/queue', label: 'Review queue', icon: Inbox },
    { to: '/officer/audit', label: 'Audit trail', icon: ScrollText },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/rules', label: 'Rules & checklists', icon: SlidersHorizontal },
    { to: '/admin/audit', label: 'Audit trail', icon: ScrollText },
    { to: '/admin/users', label: 'Users', icon: Users },
  ],
};
const roleLabel = { institute: 'Institute', officer: 'AICTE Officer', admin: 'Administrator' };

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = NAV[user.role];
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink-900 p-4 md:flex">
        <div className="px-2 pb-6 pt-2"><Logo light /></div>
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{roleLabel[user.role]}</div>
        <nav className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-600 text-white shadow-glow' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto mb-3 rounded-xl bg-gradient-to-r from-brand-900/60 to-violet-950/60 p-3 ring-1 ring-brand-500/30">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold tracking-wide uppercase text-brand-300">AI Microservice</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-300">
            PaddleOCR · OpenCV · ML Active
          </div>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <div className="truncate text-sm font-semibold text-white">{user.name}</div>
          <div className="truncate text-xs text-slate-400">{user.instituteName || user.email}</div>
          <button onClick={() => { logout(); nav('/'); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/20">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobile top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-ink-900 px-4 py-3 md:hidden">
          <Logo light />
          <button onClick={() => { logout(); nav('/'); }} className="rounded-lg bg-white/10 p-2 text-white"><LogOut size={16} /></button>
        </div>
        <div className="flex gap-1 overflow-x-auto bg-white px-3 py-2 shadow-sm md:hidden">
          {items.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${isActive ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>{label}</NavLink>
          ))}
        </div>
        <main className="mx-auto max-w-6xl p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
