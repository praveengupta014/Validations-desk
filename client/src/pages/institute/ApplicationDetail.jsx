import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Building2, History } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../auth.jsx';
import { DeficiencyList } from '../../components/Findings.jsx';
import { PageHeader, Spinner, StatusBadge, fmtDate, fmtTime } from '../../components/ui.jsx';

export default function ApplicationDetail() {
  const { id } = useParams();
  const { toast } = useAuth();
  const [app, setApp] = useState(null);
  useEffect(() => { api.get(`/applications/${id}`).then((r) => setApp(r.data)); }, [id]);
  if (!app) return <Spinner />;

  const update = async (a) => { const { data } = await api.get(`/applications/${a._id}`); setApp(data); toast('Checks re-run on the updated document', 'success'); };

  return (
    <>
      <Link to="/institute" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> All applications</Link>
      <PageHeader title={app.refNo} sub={`${app.category} · ${app.academicYear} · submitted ${fmtDate(app.createdAt)}`}><StatusBadge s={app.status} /></PageHeader>

      {app.decision?.outcome && (
        <div className={`mb-6 rounded-2xl p-5 ring-1 ${app.decision.outcome === 'approve' ? 'bg-emerald-50 ring-emerald-200' : app.decision.outcome === 'reject' ? 'bg-rose-50 ring-rose-200' : 'bg-orange-50 ring-orange-200'}`}>
          <div className="font-display text-lg font-bold">{app.status}</div>
          <p className="mt-1 text-sm text-slate-700">{app.decision.remarks}</p>
          <div className="mt-2 text-xs text-slate-500">Decision by {app.decision.by} · {fmtTime(app.decision.at)}</div>
        </div>
      )}
      {app.status === 'Clarification Requested' && (
        <div className="mb-6 rounded-2xl bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200">An officer has asked for clarification. See the notes below and re-upload the relevant document.</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 font-display text-lg font-bold">Deficiency list</h2>
            <DeficiencyList app={app} onChange={update} />
          </section>
          <section className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><FileText size={18} /> Submitted documents</h2>
            <div className="divide-y divide-slate-100">
              {app.docs.map((d) => (
                <div key={d.key} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div><div className="font-semibold text-slate-800">{d.label}</div><div className="text-xs text-slate-500">{d.fields?.referenceNo || 'no reference'} · {d.originalName || 'details only (no file)'}</div></div>
                  <StatusBadge s={d.verification?.status || 'Pending'} />
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><Building2 size={18} /> Infrastructure</h2>
            <p className="text-sm text-slate-600">{app.infraAdvice}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              {[[app.builtUpAreaSqm, 'sqm'], [app.infraPhotos, 'photos'], [app.floorPlan ? 'Yes' : 'No', 'floor plan']].map(([v, l]) => <div key={l} className="rounded-xl bg-slate-50 p-2"><div className="font-bold text-slate-800">{v}</div><div className="text-slate-400">{l}</div></div>)}
            </div>
          </section>
          <section className="card p-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><History size={18} /> Timeline</h2>
            <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
              {[...app.timeline].reverse().map((t, i) => (
                <li key={i} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" /><div className="text-slate-700">{t.text}</div><div className="text-xs text-slate-400">{t.by} · {fmtTime(t.at)}</div></li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
