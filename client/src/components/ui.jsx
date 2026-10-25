import { ShieldCheck, Loader2 } from 'lucide-react';

export function Logo({ light = false, size = 'md' }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`grid place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-glow ${size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'}`}>
        <ShieldCheck size={size === 'lg' ? 24 : 20} />
      </div>
      <div className="leading-tight">
        <div className={`font-display text-[15px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>AICTE Validation Desk</div>
        <div className={`text-[10px] font-medium uppercase tracking-widest ${light ? 'text-brand-200' : 'text-slate-400'}`}>Regulation Bureau</div>
      </div>
    </div>
  );
}

const sev = {
  critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
};
export const SeverityBadge = ({ s }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${sev[s]}`}>{s}</span>
);

const statusStyle = {
  Submitted: 'bg-slate-100 text-slate-700 ring-slate-200',
  'Under Review': 'bg-brand-50 text-brand-700 ring-brand-200',
  'Clarification Requested': 'bg-amber-50 text-amber-700 ring-amber-200',
  Escalated: 'bg-violet-50 text-violet-700 ring-violet-200',
  'Inspection Recommended': 'bg-orange-50 text-orange-700 ring-orange-200',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  // verification
  Verified: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Mismatch: 'bg-rose-50 text-rose-700 ring-rose-200',
  Expired: 'bg-rose-50 text-rose-700 ring-rose-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  'Source unavailable': 'bg-slate-100 text-slate-600 ring-slate-200',
  'Manual review': 'bg-violet-50 text-violet-700 ring-violet-200',
  // finding actions
  open: 'bg-slate-100 text-slate-600 ring-slate-200',
  confirmed: 'bg-rose-50 text-rose-700 ring-rose-200',
  dismissed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  clarify: 'bg-amber-50 text-amber-700 ring-amber-200',
  escalated: 'bg-violet-50 text-violet-700 ring-violet-200',
};
export const StatusBadge = ({ s }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${statusStyle[s] || statusStyle.open}`}>{s}</span>
);

export function Stat({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const tones = { brand: 'from-brand-500 to-violet-500', green: 'from-emerald-500 to-teal-500', amber: 'from-amber-500 to-orange-500', rose: 'from-rose-500 to-pink-500' };
  return (
    <div className="card animate-fadeup p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">{value}</div>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white ${tones[tone]}`}><Icon size={20} /></div>
      </div>
    </div>
  );
}

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="grid place-items-center gap-2 py-20 text-sm text-slate-500"><Loader2 className="animate-spin text-brand-500" />{label}</div>
);

export const PageHeader = ({ title, sub, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
    <div className="flex gap-2">{children}</div>
  </div>
);

export const Empty = ({ icon: Icon, title, sub, children }) => (
  <div className="card grid place-items-center gap-2 px-6 py-14 text-center">
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon /></div>
    <div className="font-semibold text-slate-800">{title}</div>
    <div className="max-w-sm text-sm text-slate-500">{sub}</div>
    {children}
  </div>
);

export function RiskRing({ value, size = 56 }) {
  const color = value >= 60 ? '#e11d48' : value >= 25 ? '#f59e0b' : '#10b981';
  const r = 22, c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 56 56" className="-rotate-90" width={size} height={size}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} />
      </svg>
      <span className="absolute text-[13px] font-bold text-slate-800">{value}</span>
    </div>
  );
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
