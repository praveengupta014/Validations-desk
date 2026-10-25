import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Upload, FileText, Loader2, Send, Info, Sparkles } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../auth.jsx';
import { PageHeader, Spinner } from '../../components/ui.jsx';

const STEPS = ['Basic details', 'Documents', 'Infrastructure', 'Review & submit'];

export default function NewApplication() {
  const { user, toast } = useAuth();
  const nav = useNavigate();
  const [rules, setRules] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState({});
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    category: '', academicYear: '2027-28', state: 'Maharashtra', programmes: '', proposedIntake: '',
    builtUpAreaSqm: '', infraPhotos: 0, floorPlan: false,
  });
  const [docs, setDocs] = useState({}); // key -> {fields, file, skip, aiMeta}

  useEffect(() => { api.get('/rules').then((r) => { setRules(r.data.filter((x) => x.active)); setForm((f) => ({ ...f, category: r.data[0]?.category || '' })); }); }, []);
  const rule = useMemo(() => rules?.find((r) => r.category === form.category), [rules, form.category]);
  if (!rules) return <Spinner />;

  const setF = (k, v) => setForm({ ...form, [k]: v });
  const setDoc = (key, patch) => setDocs((d) => ({ ...d, [key]: { ...d[key], ...patch, fields: { ...(d[key]?.fields || {}), ...(patch.fields || {}) } } }));

  const autoExtract = async (key, file) => {
    if (!file) return;
    setExtracting((s) => ({ ...s, [key]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('docKey', key);
      const { data } = await api.post('/applications/ai/extract-fields', fd);
      if (data && data.fields) {
        setDoc(key, {
          fields: {
            ...(data.fields.holderName ? { holderName: data.fields.holderName } : {}),
            ...(data.fields.referenceNo ? { referenceNo: data.fields.referenceNo } : {}),
            ...(data.fields.issueDate ? { issueDate: data.fields.issueDate } : {}),
            ...(data.fields.expiryDate ? { expiryDate: data.fields.expiryDate } : {}),
            ...(data.fields.area ? { area: data.fields.area } : {}),
          },
          aiMeta: {
            confidence: data.confidence,
            engine: data.engine || 'PaddleOCR',
          }
        });
        toast(`✨ AI extracted details with ${Math.round((data.confidence || 0.9) * 100)}% confidence`, 'success');
      }
    } catch {
      toast('File attached. Details can be entered or verified manually.', 'info');
    } finally {
      setExtracting((s) => ({ ...s, [key]: false }));
    }
  };

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const payload = {
        ...form, instituteName: user.instituteName, aicteId: user.aicteId,
        docs: rule.docs.filter((r) => docs[r.key] && (docs[r.key].file || Object.values(docs[r.key].fields || {}).some(Boolean)))
          .map((r) => ({ key: r.key, fields: docs[r.key].fields || {} })),
      };
      const fd = new FormData();
      fd.append('payload', JSON.stringify(payload));
      rule.docs.forEach((r) => docs[r.key]?.file && fd.append(`file_${r.key}`, docs[r.key].file));
      const { data } = await api.post('/applications', fd);
      toast(`Application ${data.refNo} submitted — ${data.findings.filter((f) => f.severity !== 'info').length} item(s) flagged`, 'success');
      nav(`/institute/applications/${data._id}`);
    } catch (e) { setErr(e.friendly); setBusy(false); }
  };

  const canNext = step === 0 ? form.category && form.programmes && form.academicYear : true;

  return (
    <>
      <PageHeader title="New Extension of Approval application" sub="Provide the key details from each document. Checks run the moment you submit." />

      {/* stepper */}
      <div className="mb-8 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <div className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white shadow-glow' : 'bg-slate-200 text-slate-500'}`}>{i < step ? <Check size={16} /> : i + 1}</div>
              <span className={`hidden text-sm font-semibold sm:block ${i === step ? 'text-slate-900' : 'text-slate-400'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-3 h-0.5 flex-1 rounded ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <div className="card animate-fadeup p-6 sm:p-8">
        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Application category</label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {rules.map((r) => (
                  <button key={r._id} type="button" onClick={() => { setF('category', r.category); setDocs({}); }} className={`rounded-xl p-4 text-left ring-1 transition ${form.category === r.category ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:bg-slate-50'}`}>
                    <div className="text-sm font-bold text-slate-900">{r.category}</div>
                    <div className="mt-1 text-xs text-slate-500">{r.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div><label className="label">Academic year</label><input className="input" value={form.academicYear} onChange={(e) => setF('academicYear', e.target.value)} /></div>
            <div><label className="label">State</label><input className="input" value={form.state} onChange={(e) => setF('state', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="label">Programmes applied for</label><input className="input" placeholder="e.g. B.Tech CSE, ECE, Mechanical" value={form.programmes} onChange={(e) => setF('programmes', e.target.value)} /></div>
            <div><label className="label">Proposed total intake</label><input type="number" className="input" value={form.proposedIntake} onChange={(e) => setF('proposedIntake', e.target.value)} /></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-800"><Info size={18} className="mt-0.5 shrink-0" />
              <span>Checklist for <b>{rule.category}</b> ({rule.handbookRef}). Upload a PDF/PNG/JPG and enter the details printed on it — they are cross-checked against the file, the issuer and your other documents.</span></div>
            {rule.docs.map((r) => {
              const d = docs[r.key] || { fields: {} };
              return (
                <div key={r.key} className="rounded-2xl p-5 ring-1 ring-slate-200">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <FileText size={18} className="text-brand-600" />
                    <span className="font-semibold text-slate-900">{r.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.mandatory ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{r.mandatory ? 'Mandatory' : 'Optional'}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div><label className="label">Name on document</label><input className="input" value={d.fields.holderName || ''} onChange={(e) => setDoc(r.key, { fields: { holderName: e.target.value } })} placeholder={user.instituteName} /></div>
                    <div><label className="label">Reference / certificate no.</label><input className="input" value={d.fields.referenceNo || ''} onChange={(e) => setDoc(r.key, { fields: { referenceNo: e.target.value } })} /></div>
                    <div><label className="label">Issue date</label><input type="date" className="input" value={d.fields.issueDate || ''} onChange={(e) => setDoc(r.key, { fields: { issueDate: e.target.value } })} /></div>
                    {r.expires && <div><label className="label">Valid till</label><input type="date" className="input" value={d.fields.expiryDate || ''} onChange={(e) => setDoc(r.key, { fields: { expiryDate: e.target.value } })} /></div>}
                    {r.key === 'building_plan' && <div><label className="label">Approved built-up area (sqm)</label><input type="number" className="input" value={d.fields.area || ''} onChange={(e) => setDoc(r.key, { fields: { area: Number(e.target.value) } })} /></div>}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/40">
                      <Upload size={18} className="text-brand-600" />
                      <span className="truncate">{d.file ? <b className="text-slate-800">{d.file.name}</b> : 'Click to attach file (PDF, PNG, JPG · max 10 MB)'}</span>
                      <input
                        type="file"
                        hidden
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const f = e.target.files[0];
                          if (f) {
                            setDoc(r.key, { file: f });
                            autoExtract(r.key, f);
                          }
                        }}
                      />
                    </label>
                    {extracting[r.key] && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 animate-pulse">
                        <Loader2 size={14} className="animate-spin" /> PaddleOCR extracting...
                      </span>
                    )}
                    {d.aiMeta && !extracting[r.key] && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <Sparkles size={14} /> AI Extracted ({Math.round(d.aiMeta.confidence * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 text-sm text-slate-500">Minimum for this category: {rule.minBuiltUpAreaSqm} sqm built-up area, {rule.minInfraPhotos} infrastructure photos{rule.requireFloorPlan ? ' and a floor plan' : ''}. Findings here are advisory.</div>
            <div><label className="label">Declared built-up area (sqm)</label><input type="number" className="input" value={form.builtUpAreaSqm} onChange={(e) => setF('builtUpAreaSqm', e.target.value)} /></div>
            <div><label className="label">Infrastructure photos uploaded</label><input type="number" min="0" className="input" value={form.infraPhotos} onChange={(e) => setF('infraPhotos', e.target.value)} /></div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl p-4 ring-1 ring-slate-200 sm:col-span-2">
              <input type="checkbox" className="h-5 w-5 rounded accent-brand-600" checked={form.floorPlan} onChange={(e) => setF('floorPlan', e.target.checked)} />
              <span className="text-sm font-medium text-slate-700">Floor plan is attached</span>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h3 className="font-display text-lg font-bold">Ready to submit?</h3>
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              {[['Category', form.category], ['Academic year', form.academicYear], ['Programmes', form.programmes], ['Intake', form.proposedIntake || '—'], ['Built-up area', `${form.builtUpAreaSqm || 0} sqm`], ['Photos / floor plan', `${form.infraPhotos} / ${form.floorPlan ? 'yes' : 'no'}`]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-slate-400">{k}</dt><dd className="mt-1 font-semibold text-slate-800">{v}</dd></div>
              ))}
            </dl>
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-700">Documents</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {rule.docs.map((r) => {
                  const given = docs[r.key] && (docs[r.key].file || Object.values(docs[r.key].fields || {}).some(Boolean));
                  return <div key={r.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className={`h-2 w-2 rounded-full ${given ? 'bg-emerald-500' : r.mandatory ? 'bg-rose-500' : 'bg-slate-300'}`} /><span className="flex-1 truncate">{r.label}</span><span className="text-xs text-slate-400">{given ? 'provided' : 'not provided'}</span></div>;
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500">Missing items are not blockers — you will see a deficiency list straight after submitting and can re-upload.</p>
            </div>
            {err && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button className="btn-ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}><ChevronLeft size={16} /> Back</button>
          {step < 3 ? (
            <button className="btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue <ChevronRight size={16} /></button>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit & run checks</button>
          )}
        </div>
      </div>
    </>
  );
}
