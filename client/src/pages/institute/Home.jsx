import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, FolderOpen, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../auth.jsx';
import { PageHeader, Stat, StatusBadge, Spinner, Empty, fmtDate } from '../../components/ui.jsx';

export default function InstituteHome() {
  const { user } = useAuth();
  const [apps, setApps] = useState(null);
  useEffect(() => { api.get('/applications').then((r) => setApps(r.data)); }, []);
  if (!apps) return <Spinner />;

  const needAction = apps.filter((a) => a.status === 'Clarification Requested').length;
  const decided = apps.filter((a) => ['Approved', 'Rejected'].includes(a.status)).length;

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ').slice(-1)[0]}`} sub={user.instituteName}>
        <Link to="/institute/new" className="btn-primary"><FilePlus2 size={16} /> New application</Link>
      </PageHeader>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={FolderOpen} label="Applications" value={apps.length} />
        <Stat icon={AlertTriangle} tone="amber" label="Need your action" value={needAction} hint="Clarification requested" />
        <Stat icon={CheckCircle2} tone="green" label="Decided" value={decided} />
      </div>

      {apps.length === 0 ? (
        <Empty icon={FilePlus2} title="No applications yet" sub="Start an Extension of Approval application. Missing or expired documents are flagged the moment you submit.">
          <Link to="/institute/new" className="btn-primary mt-3">Start application</Link>
        </Empty>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {apps.map((a) => (
            <Link key={a._id} to={`/institute/applications/${a._id}`} className="flex items-center gap-4 p-5 transition hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{a.refNo}</span><StatusBadge s={a.status} />
                </div>
                <div className="mt-1 truncate text-sm text-slate-500">{a.category} · {a.academicYear} · {a.programmes}</div>
              </div>
              <div className="hidden text-right text-sm sm:block">
                <div className={a.openFindings ? 'font-semibold text-amber-600' : 'text-emerald-600'}>
                  {a.openFindings ? `${a.openFindings} item(s) to review` : 'No open items'}
                </div>
                <div className="flex items-center justify-end gap-1 text-xs text-slate-400"><Clock size={12} /> {fmtDate(a.createdAt)}</div>
              </div>
              <ChevronRight className="text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
