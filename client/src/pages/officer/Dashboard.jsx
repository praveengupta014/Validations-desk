import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Zap, UserCheck, AlertOctagon, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../auth.jsx';
import { PageHeader, Stat, StatusBadge, Spinner, RiskRing, fmtDate } from '../../components/ui.jsx';

const sevColor = { critical: 'bg-rose-500', warning: 'bg-amber-500', info: 'bg-sky-500' };
const typeLabel = { missing: 'Missing', expired: 'Expired / stale', inconsistent: 'Inconsistent', anomaly: 'Anomaly', authority: 'Issuer check', infra: 'Infrastructure' };

function Bars({ data, labels = {}, color = 'bg-brand-500' }) {
  const max = Math.max(1, ...Object.values(data));
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-600">{labels[k] || k}</span><span className="font-bold text-slate-800">{v}</span></div>
          <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${typeof color === 'function' ? color(k) : color} transition-all duration-700`} style={{ width: `${(v / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function OfficerDashboard({ admin }) {
  const { user } = useAuth();
  const base = admin ? '/admin' : '/officer';
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState(null);
  const [chain, setChain] = useState(null);

  useEffect(() => {
    api.get('/stats').then((r) => setStats(r.data));
    api.get('/applications').then((r) => setApps(r.data));
    api.get('/audit/verify').then((r) => setChain(r.data));
  }, []);
  if (!stats || !apps) return <Spinner />;

  const priority = apps.filter((a) => !['Approved', 'Rejected'].includes(a.status)).sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return (
    <>
      <PageHeader title={admin ? 'Administration overview' : `Good day, ${user.name.replace('Officer ', '')}`} sub="First-pass scrutiny results across all Extension of Approval applications">
        <Link to={`${base}/queue`.replace('/admin/queue', '/officer/queue')} className="btn-primary"><Inbox size={16} /> Open review queue</Link>
      </PageHeader>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Inbox} label="Applications" value={stats.total} hint={`${stats.decided} decided · ${stats.pending} pending`} />
        <Stat icon={Zap} tone="green" label="Clean cases" value={stats.clean} hint="Light check only" />
        <Stat icon={UserCheck} tone="amber" label="Need judgment" value={stats.judgment} hint="Routed to officer" />
        <Stat icon={AlertOctagon} tone="rose" label="Open findings" value={stats.openFindings} hint={`Avg. risk score ${stats.avgRisk}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-bold">Priority queue</h2>
          {priority.length === 0 ? <p className="text-sm text-slate-500">Nothing pending.</p> : (
            <div className="divide-y divide-slate-100">
              {priority.map((a) => (
                <Link key={a._id} to={`/officer/applications/${a._id}`} className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-3.5 transition hover:bg-slate-50">
                  <RiskRing value={a.riskScore} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900">{a.instituteName}</div>
                    <div className="truncate text-xs text-slate-500">{a.refNo} · {a.category} · {fmtDate(a.createdAt)}</div>
                  </div>
                  <div className="hidden sm:block"><StatusBadge s={a.status} /></div>
                  <ChevronRight className="text-slate-300" size={18} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Audit-trail integrity</h2>
          {chain && (
            <div className={`rounded-xl p-4 ring-1 ${chain.ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
              <div className={`flex items-center gap-2 font-semibold ${chain.ok ? 'text-emerald-800' : 'text-rose-800'}`}>{chain.ok ? <ShieldCheck /> : <ShieldAlert />}{chain.ok ? 'Chain intact' : `Broken at entry #${chain.brokenAt}`}</div>
              <div className="mt-1 text-xs text-slate-600">{chain.total} entries verified with SHA-256 hash links.</div>
              {chain.head && <div className="mt-2 truncate font-mono text-[10px] text-slate-400">head {chain.head}</div>}
            </div>
          )}
          <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Findings by severity</h3>
          <Bars data={stats.sevCount} color={(k) => sevColor[k]} />
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-bold">What the Desk is catching</h2>
          <Bars data={stats.typeCount} labels={typeLabel} color="bg-gradient-to-r from-brand-500 to-violet-500" />
        </section>
        <section className="card p-6">
          <h2 className="mb-4 font-display text-lg font-bold">By status</h2>
          <Bars data={stats.byStatus} color="bg-brand-400" />
        </section>
      </div>
    </>
  );
}
