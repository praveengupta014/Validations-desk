import { useState } from 'react';
import { CheckCircle2, ShieldQuestion, Upload, Loader2 } from 'lucide-react';
import api from '../api';
import { SeverityBadge, StatusBadge } from './ui.jsx';

/** Institute view: a deficiency list with a one-click re-upload path. */
export function DeficiencyList({ app, onChange }) {
  const [busy, setBusy] = useState(null);
  const [open, setOpen] = useState(null);
  const [fields, setFields] = useState({});
  const [file, setFile] = useState(null);
  const items = app.findings.filter((f) => f.severity !== 'info' && f.docKey);
  const closed = ['Approved', 'Rejected'].includes(app.status);

  const resubmit = async (key, existing) => {
    setBusy(key);
    try {
      const fd = new FormData();
      fd.append('fields', JSON.stringify({ ...(existing?.fields || {}), ...fields }));
      if (file) fd.append('file', file);
      const { data } = await api.post(`/applications/${app._id}/documents/${key}`, fd);
      setOpen(null); setFields({}); setFile(null);
      onChange(data);
    } catch (e) { alert(e.friendly); } finally { setBusy(null); }
  };

  if (!items.length) return (
    <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-800 ring-1 ring-emerald-200"><CheckCircle2 /> No deficiencies found in the automated first-pass checks.</div>
  );

  return (
    <div className="space-y-3">
      {items.map((f) => {
        const doc = app.docs.find((d) => d.key === f.docKey);
        const isOpen = open === f.fid;
        return (
          <div key={f.fid} className="rounded-2xl p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><SeverityBadge s={f.severity} /><span className="font-semibold text-slate-900">{f.title}</span></div>
                <p className="mt-1 text-sm text-slate-500">{f.detail}</p>
                {f.status !== 'open' && <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><StatusBadge s={f.status} /> by {f.reviewedBy}{f.officerNote && <> — “{f.officerNote}”</>}</div>}
              </div>
              {!closed && <button className="btn-ghost shrink-0 !py-1.5 text-xs" onClick={() => { setOpen(isOpen ? null : f.fid); setFields({}); setFile(null); }}><Upload size={14} /> {doc ? 'Replace / correct' : 'Upload'}</button>}
            </div>
            {isOpen && (
              <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div><label className="label">Name</label><input className="input" defaultValue={doc?.fields?.holderName} onChange={(e) => setFields({ ...fields, holderName: e.target.value })} /></div>
                <div><label className="label">Reference no.</label><input className="input" defaultValue={doc?.fields?.referenceNo} onChange={(e) => setFields({ ...fields, referenceNo: e.target.value })} /></div>
                <div><label className="label">Issue date</label><input type="date" className="input" defaultValue={doc?.fields?.issueDate} onChange={(e) => setFields({ ...fields, issueDate: e.target.value })} /></div>
                <div><label className="label">Valid till</label><input type="date" className="input" defaultValue={doc?.fields?.expiryDate} onChange={(e) => setFields({ ...fields, expiryDate: e.target.value })} /></div>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500 sm:col-span-2 lg:col-span-3"><Upload size={16} className="text-brand-600" /><span className="truncate">{file ? file.name : 'Attach new file (PDF, PNG, JPG)'}</span><input type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0])} /></label>
                <button className="btn-primary" disabled={busy === f.docKey} onClick={() => resubmit(f.docKey, doc)}>{busy === f.docKey && <Loader2 size={14} className="animate-spin" />} Re-check</button>
              </div>
            )}
          </div>
        );
      })}
      <p className="flex items-center gap-2 text-xs text-slate-400"><ShieldQuestion size={14} /> Findings are preliminary indicators. An AICTE officer reviews every flagged item before any decision.</p>
    </div>
  );
}
