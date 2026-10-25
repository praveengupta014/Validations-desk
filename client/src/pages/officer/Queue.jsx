import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Inbox, ChevronRight } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../auth.jsx';
import { PageHeader, Spinner, StatusBadge, RiskRing, Empty, fmtDate } from '../../components/ui.jsx';

export default function Queue() {
  const { user, socket } = useAuth();
  const [apps, setApps] = useState(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const prefix = user.role === 'admin' ? '/admin' : '/officer';

  const load = () => api.get('/applications').then((r) => setApps(r.data));
  useEffect(() => {
    load();
    const s = socket.current;
    s?.on('alert', load);
    return () => s?.off('alert', load);
  }, []); // eslint-disable-line

  const list = useMemo(() => {
    if (!apps) return [];
    return apps
      .filter((a) => (tab === 'all' ? true : tab === 'judgment' ? a.route === 'judgment' && !['Approved', 'Rejected'].includes(a.status) : tab === 'clean' ? a.route === 'clean' && !['Approved', 'Rejected'].includes(a.status) : ['Approved', 'Rejected', 'Inspection Recommended'].includes(a.status)))
      .filter((a) => !q || `${a.refNo} ${a.instituteName} ${a.category}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [apps, q, tab]);

  if (!apps) return <Spinner />;
  const tabs = [['all', 'All'], ['judgment', 'Needs judgment'], ['clean', 'Clean · light check'], ['done', 'Decided']];

  return (
    <>
      <PageHeader title="Review queue" sub="Sorted by risk score — the cases that need your judgment come first." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
          {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${tab === k ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</button>)}
        </div>
        <div className="relative w-full sm:w-72"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className="input !pl-9" placeholder="Search institute or reference…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      {list.length === 0 ? <Empty icon={Inbox} title="Nothing here" sub="No applications match this view." /> : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {list.map((a) => (
            <Link key={a._id} to={`${prefix}/applications/${a._id}`} className="flex items-center gap-4 p-4 transition hover:bg-slate-50 sm:p-5">
              <RiskRing value={a.riskScore} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{a.instituteName}</span><StatusBadge s={a.status} /></div>
                <div className="mt-0.5 truncate text-xs text-slate-500">{a.refNo} · {a.category} · {a.programmes}</div>
              </div>
              <div className="hidden text-right text-xs md:block">
                <div className={`font-semibold ${a.route === 'clean' ? 'text-emerald-600' : 'text-amber-600'}`}>{a.route === 'clean' ? 'Clean · light check' : `${a.openFindings} to review`}</div>
                <div className="text-slate-400">{fmtDate(a.createdAt)}</div>
              </div>
              <ChevronRight className="text-slate-300" size={18} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
