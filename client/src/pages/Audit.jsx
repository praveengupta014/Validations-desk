import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, Link2 } from 'lucide-react';
import api from '../api';
import { PageHeader, Spinner, fmtTime } from '../components/ui.jsx';

export default function Audit() {
  const [logs, setLogs] = useState(null);
  const [chain, setChain] = useState(null);
  const [checking, setChecking] = useState(false);

  const load = async () => {
    setChecking(true);
    const [l, c] = await Promise.all([api.get('/audit?limit=200'), api.get('/audit/verify')]);
    setLogs(l.data); setChain(c.data); setChecking(false);
  };
  useEffect(() => { load(); }, []);
  if (!logs) return <Spinner />;

  return (
    <>
      <PageHeader title="Audit trail" sub="Every action is written to a SHA-256 hash-chained log. Altering any entry breaks every link after it.">
        <button onClick={load} disabled={checking} className="btn-primary"><RefreshCw size={16} className={checking ? 'animate-spin' : ''} /> Verify integrity</button>
      </PageHeader>

      {chain && (
        <div className={`mb-6 flex items-center gap-4 rounded-2xl p-5 ring-1 ${chain.ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
          <div className={`grid h-12 w-12 place-items-center rounded-xl text-white ${chain.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}>{chain.ok ? <ShieldCheck /> : <ShieldAlert />}</div>
          <div>
            <div className={`font-display text-lg font-bold ${chain.ok ? 'text-emerald-900' : 'text-rose-900'}`}>{chain.ok ? 'Integrity verified' : `Tampering detected at entry #${chain.brokenAt}`}</div>
            <div className="text-sm text-slate-600">{chain.ok ? `${chain.total} entries, every hash link matches.` : chain.reason}</div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Details</th><th className="px-4 py-3">Hash</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.seq} className="align-top hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{l.seq}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtTime(l.at)}</td>
                  <td className="px-4 py-3"><div className="font-medium text-slate-800">{l.actorName}</div><div className="text-[11px] capitalize text-slate-400">{l.role}</div></td>
                  <td className="px-4 py-3"><span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{l.action}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{l.entityId}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-slate-600">{l.details}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-400"><span className="inline-flex items-center gap-1"><Link2 size={10} />{l.hash.slice(0, 10)}…</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
