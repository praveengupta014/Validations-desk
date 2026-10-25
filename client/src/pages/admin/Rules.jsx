import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Loader2, BookOpen } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../auth.jsx';
import { PageHeader, Spinner } from '../../components/ui.jsx';

export default function Rules() {
  const { toast } = useAuth();
  const [rules, setRules] = useState(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/rules').then((r) => setRules(r.data)); }, []);
  if (!rules) return <Spinner />;

  const rule = rules[sel];
  const patch = (p) => setRules(rules.map((r, i) => (i === sel ? { ...r, ...p } : r)));
  const patchDoc = (i, p) => patch({ docs: rule.docs.map((d, j) => (j === i ? { ...d, ...p } : d)) });
  const addDoc = () => patch({ docs: [...rule.docs, { key: `doc_${Date.now().toString(36)}`, label: 'New document', mandatory: true, expires: false, maxAgeDays: 0, verifiable: true }] });
  const save = async () => {
    setBusy(true);
    try { const { data } = await api.put(`/rules/${rule._id}`, rule); setRules(rules.map((r, i) => (i === sel ? data : r))); toast('Checklist saved — new applications use it immediately', 'success'); }
    catch (e) { toast(e.friendly, 'critical'); } finally { setBusy(false); }
  };
  const Toggle = ({ v, on }) => (
    <button type="button" onClick={() => on(!v)} className={`relative h-6 w-11 rounded-full transition ${v ? 'bg-brand-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${v ? 'left-[22px]' : 'left-0.5'}`} /></button>
  );

  return (
    <>
      <PageHeader title="Rules & checklists" sub="When the Handbook changes, change the configuration — not the code.">
        <button onClick={save} disabled={busy} className="btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save changes</button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-2">
          {rules.map((r, i) => (
            <button key={r._id} onClick={() => setSel(i)} className={`card block w-full p-4 text-left transition ${i === sel ? '!ring-2 ring-brand-500' : 'hover:-translate-y-0.5'}`}>
              <div className="text-sm font-bold text-slate-900">{r.category}</div>
              <div className="mt-0.5 text-xs text-slate-500">{r.docs.length} documents · {r.handbookRef}</div>
            </button>
          ))}
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><BookOpen size={18} /> {rule.category}</div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="label">Min. built-up area (sqm)</label><input type="number" className="input" value={rule.minBuiltUpAreaSqm} onChange={(e) => patch({ minBuiltUpAreaSqm: Number(e.target.value) })} /></div>
              <div><label className="label">Min. infrastructure photos</label><input type="number" className="input" value={rule.minInfraPhotos} onChange={(e) => patch({ minInfraPhotos: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-3 pb-2.5"><Toggle v={rule.requireFloorPlan} on={(v) => patch({ requireFloorPlan: v })} /><span className="text-sm font-medium text-slate-700">Floor plan required</span></div>
              <div className="sm:col-span-3"><label className="label">Handbook reference</label><input className="input" value={rule.handbookRef || ''} onChange={(e) => patch({ handbookRef: e.target.value })} /></div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5"><h3 className="font-display text-lg font-bold">Required documents</h3><button onClick={addDoc} className="btn-ghost !py-1.5 text-xs"><Plus size={14} /> Add document</button></div>
            <div className="divide-y divide-slate-100">
              {rule.docs.map((d, i) => (
                <div key={d.key} className="grid items-center gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
                  <input className="input" value={d.label} onChange={(e) => patchDoc(i, { label: e.target.value })} />
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600"><Toggle v={d.mandatory} on={(v) => patchDoc(i, { mandatory: v })} />Mandatory</label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600"><Toggle v={d.expires} on={(v) => patchDoc(i, { expires: v })} />Has validity</label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600"><Toggle v={d.verifiable} on={(v) => patchDoc(i, { verifiable: v })} />Verifiable</label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">Max age (days)<input type="number" className="input !w-20 !py-1.5" value={d.maxAgeDays} onChange={(e) => patchDoc(i, { maxAgeDays: Number(e.target.value) })} /></label>
                  <button onClick={() => patch({ docs: rule.docs.filter((_, j) => j !== i) })} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
