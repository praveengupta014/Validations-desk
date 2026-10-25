import { useEffect, useState } from 'react';
import api from '../../api';
import { PageHeader, Spinner, fmtDate } from '../../components/ui.jsx';

const tone = { admin: 'bg-emerald-50 text-emerald-700 ring-emerald-200', officer: 'bg-violet-50 text-violet-700 ring-violet-200', institute: 'bg-sky-50 text-sky-700 ring-sky-200' };

export default function Users() {
  const [users, setUsers] = useState(null);
  useEffect(() => { api.get('/users').then((r) => setUsers(r.data)); }, []);
  if (!users) return <Spinner />;
  return (
    <>
      <PageHeader title="Users" sub="Role-based access: institutes see only their own applications; officers and admins see all." />
      <div className="card divide-y divide-slate-100 overflow-hidden">
        {users.map((u) => (
          <div key={u._id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 font-bold text-white">{u.name[0]}</div>
            <div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{u.name}</div><div className="truncate text-xs text-slate-500">{u.email}{u.instituteName ? ` · ${u.instituteName}` : ''}</div></div>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${tone[u.role]}`}>{u.role}</span>
            <span className="text-xs text-slate-400">Joined {fmtDate(u.createdAt)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
