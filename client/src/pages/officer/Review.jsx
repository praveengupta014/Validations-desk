import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, MessageSquareWarning, ArrowUpRight, Gavel, FileSearch, Route, History, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../auth.jsx';
import { PageHeader, Spinner, StatusBadge, SeverityBadge, RiskRing, fmtTime } from '../../components/ui.jsx';

const FIELD_LABEL = { holderName: 'Name on document', issuer: 'Issuing authority', referenceNo: 'Reference no.', issueDate: 'Issue date', expiryDate: 'Valid till', area: 'Built-up area (sqm)' };

/** Page rendered from extracted fields with the evidence region highlighted. */
function EvidencePage({ doc, focusField }) {
  const boxes = doc.extraction?.boxes || {};
  const fields = doc.fields || {};
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-lg bg-white shadow-inner ring-1 ring-slate-300">
      <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-r from-brand-500 to-violet-500" />
      <div className="absolute left-[12%] top-[5%] text-[10px] font-bold uppercase tracking-widest text-slate-300">{doc.label}</div>
      {Object.entries(boxes).map(([f, b]) => {
        const hot = f === focusField;
        return (
          <div key={f} className={`absolute flex flex-col justify-center rounded px-1.5 transition ${hot ? 'z-10 bg-rose-100/70 ring-2 ring-rose-500' : 'ring-1 ring-brand-200/80'}`} style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}>
            <span className="truncate text-[11px] font-semibold text-slate-800">{String(fields[f] ?? '')}</span>
            {hot && <span className="absolute -top-4 left-0 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{FIELD_LABEL[f]} · {Math.round(b.conf * 100)}%</span>}
          </div>
        );
      })}
      {[70, 76, 82, 88].map((t) => <div key={t} className="absolute left-[12%] h-1.5 rounded bg-slate-100" style={{ top: `${t}%`, width: `${40 + (t % 7) * 6}%` }} />)}
    </div>
  );
}

function FilePreview({ appId, doc }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let u;
    if (!doc.originalName) return;
    api.get(`/applications/${appId}/files/${doc.key}`, { responseType: 'blob' }).then((r) => { u = URL.createObjectURL(r.data); setUrl(u); }).catch(() => {});
    return () => u && URL.revokeObjectURL(u);
  }, [appId, doc.key, doc.originalName]);
  if (!doc.originalName) return <div className="grid h-40 place-items-center rounded-xl bg-slate-50 text-sm text-slate-400">No file attached — details entered by the institute only</div>;
  if (!url) return <div className="grid h-40 place-items-center text-slate-400"><Loader2 className="animate-spin" /></div>;
  return (
    <div>
      {doc.mimeType.startsWith('image/') ? <img src={url} alt={doc.label} className="max-h-[420px] w-full rounded-lg object-contain ring-1 ring-slate-200" /> : <iframe title={doc.label} src={url} className="h-[420px] w-full rounded-lg ring-1 ring-slate-200" />}
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><ExternalLink size={12} /> Open original ({doc.originalName})</a>
    </div>
  );
}

export default function Review() {
  const { id } = useParams();
  const { user, toast } = useAuth();
  const prefix = user.role === 'admin' ? '/admin' : '/officer';
  const [app, setApp] = useState(null);
  const [sel, setSel] = useState(null);           // selected finding id
  const [docKey, setDocKey] = useState(null);
  const [note, setNote] = useState('');
  const [view, setView] = useState('evidence');   // evidence | original
  const [decision, setDecision] = useState({ outcome: 'approve', remarks: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get(`/applications/${id}`).then((r) => {
    setApp(r.data);
    setSel((s) => s || r.data.findings.find((f) => f.severity !== 'info')?.fid || r.data.findings[0]?.fid);
  }), [id]);
  useEffect(() => { load(); }, [load]);

  const finding = useMemo(() => app?.findings.find((f) => f.fid === sel), [app, sel]);
  useEffect(() => { if (finding?.docKey) setDocKey(finding.docKey); }, [finding]);
  useEffect(() => { setNote(''); }, [sel]);

  if (!app) return <Spinner />;
  const closed = ['Approved', 'Rejected'].includes(app.status);
  const doc = app.docs.find((d) => d.key === (docKey || app.docs[0]?.key));
  const order = { critical: 0, warning: 1, info: 2 };
  const findings = [...app.findings].sort((a, b) => order[a.severity] - order[b.severity]);
  const open = app.findings.filter((f) => f.status === 'open' && f.severity !== 'info').length;

  const act = async (action) => {
    setBusy(true);
    try { const { data } = await api.post(`/applications/${id}/findings/${sel}/action`, { action, note }); setApp({ ...app, ...data }); setNote(''); toast({ confirm: 'Finding confirmed', dismiss: 'Finding dismissed', clarify: 'Clarification requested from institute', escalate: 'Finding escalated' }[action], 'success'); await load(); }
    catch (e) { toast(e.friendly, 'critical'); } finally { setBusy(false); }
  };
  const decide = async () => {
    setBusy(true);
    try { await api.post(`/applications/${id}/decision`, decision); toast('Decision recorded in the audit trail', 'success'); await load(); }
    catch (e) { toast(e.friendly, 'critical'); } finally { setBusy(false); }
  };

  return (
    <>
      <Link to={`${prefix === '/admin' ? '/officer' : prefix}/queue`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Review queue</Link>
      <PageHeader title={app.instituteName} sub={`${app.refNo} · ${app.category} · ${app.programmes}`}>
        <StatusBadge s={app.status} />
      </PageHeader>

      {/* summary strip */}
      <div className="card mb-6 grid items-center gap-5 p-5 sm:grid-cols-[auto_1fr_auto]">
        <RiskRing value={app.riskScore} size={72} />
        <div className="text-sm">
          <div className="font-semibold text-slate-900">{app.route === 'clean' ? 'Clean case — light check' : 'Needs judgment'} · {app.findings.length} findings · {open} awaiting review</div>
          <p className="mt-1 text-slate-500">{app.infraAdvice}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-2 text-xs text-slate-500">All results are <b>preliminary indicators</b>.<br />Final decision rests with AICTE.</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* findings */}
        <section className="space-y-3 xl:col-span-2">
          <h2 className="font-display text-lg font-bold">Findings</h2>
          {findings.length === 0 && <div className="card p-6 text-sm text-slate-500">No findings. This is a clean case.</div>}
          {findings.map((f) => (
            <button key={f.fid} onClick={() => setSel(f.fid)} className={`card block w-full p-4 text-left transition ${sel === f.fid ? '!ring-2 ring-brand-500' : 'hover:-translate-y-0.5'}`}>
              <div className="flex flex-wrap items-center gap-2"><SeverityBadge s={f.severity} /><StatusBadge s={f.status} /><span className="ml-auto text-[11px] text-slate-400">{Math.round((f.confidence || 0) * 100)}% conf.</span></div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{f.title}</div>
            </button>
          ))}
        </section>

        {/* detail + viewer */}
        <section className="space-y-6 xl:col-span-3">
          {finding && (
            <div className="card animate-fadeup p-6">
              <div className="flex flex-wrap items-center gap-2"><SeverityBadge s={finding.severity} /><StatusBadge s={finding.status} /><span className="font-mono text-[11px] text-slate-400">{finding.code}</span></div>
              <h3 className="mt-2 font-display text-lg font-bold text-slate-900">{finding.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{finding.detail}</p>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-600"><Route size={14} className="mt-0.5 shrink-0 text-brand-600" /><span><b className="font-sans text-slate-400">RULE TRACE</b> {finding.ruleTrace}</span></div>
              {finding.officerNote && <p className="mt-3 text-sm text-slate-600">Note by {finding.reviewedBy}: “{finding.officerNote}”</p>}
              {!closed && (
                <div className="mt-5">
                  <textarea className="input" rows={2} placeholder="Note (required to dismiss or escalate)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button disabled={busy} onClick={() => act('confirm')} className="btn-danger !py-2"><Check size={15} /> Confirm issue</button>
                    <button disabled={busy} onClick={() => act('dismiss')} className="btn-ok !py-2"><X size={15} /> Dismiss</button>
                    <button disabled={busy} onClick={() => act('clarify')} className="btn bg-amber-500 !py-2 text-white hover:bg-amber-600"><MessageSquareWarning size={15} /> Ask institute</button>
                    <button disabled={busy} onClick={() => act('escalate')} className="btn bg-violet-600 !py-2 text-white hover:bg-violet-700"><ArrowUpRight size={15} /> Escalate</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {doc && (
            <div className="card p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold"><FileSearch size={18} /> Document viewer</h3>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                  {[['evidence', 'Evidence'], ['original', 'Original file']].map(([k, l]) => <button key={k} onClick={() => setView(k)} className={`rounded-md px-3 py-1 ${view === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l}</button>)}
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {app.docs.map((d) => <button key={d.key} onClick={() => setDocKey(d.key)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 transition ${d.key === doc.key ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>{d.label.split(' ').slice(0, 3).join(' ')}</button>)}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>{view === 'evidence' ? <EvidencePage doc={doc} focusField={finding?.docKey === doc.key ? finding.field : null} /> : <FilePreview appId={app._id} doc={doc} />}</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="font-semibold text-slate-700">Issuer verification</span><StatusBadge s={doc.verification?.status || 'Pending'} /></div>
                  <p className="text-xs text-slate-500">{doc.verification?.detail}</p>

                  {/* AI / ML Layer Forensic Inspection */}
                  {doc.aiValidation && (
                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                          <Sparkles size={13} /> AI Forensics ({doc.aiValidation.engine || 'PaddleOCR'})
                        </span>
                        <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800">
                          {Math.round((doc.extraction?.confidence || 0.9) * 100)}% OCR Conf
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-white p-2 ring-1 ring-slate-100">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase">OpenCV ELA</div>
                          <div className={`mt-0.5 font-bold ${doc.aiValidation.isTampered ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {doc.aiValidation.isTampered ? '⚠ Splice / Altered' : '✓ Authentic'}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white p-2 ring-1 ring-slate-100">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase">Seal / Stamp</div>
                          <div className={`mt-0.5 font-bold ${doc.aiValidation.stampDetected ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {doc.aiValidation.stampDetected ? '✓ Detected' : '⚠ Missing'}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white p-2 ring-1 ring-slate-100">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase">Visual Hash (pHash)</div>
                          <div className={`mt-0.5 font-bold truncate ${doc.aiValidation.isVisualDuplicate ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {doc.aiValidation.isVisualDuplicate ? `⚠ Duplicate` : '✓ Unique'}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white p-2 ring-1 ring-slate-100">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase">ML Classification</div>
                          <div className="mt-0.5 font-bold text-slate-800 capitalize truncate">
                            {doc.aiValidation.predictedDocType?.replace('_', ' ') || 'Verified'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-100">
                    {Object.entries(FIELD_LABEL).map(([k, l]) => doc.fields?.[k] !== undefined && doc.fields?.[k] !== '' && (
                      <div key={k} className={`flex items-center justify-between gap-3 px-3 py-2 ${finding?.docKey === doc.key && finding.field === k ? 'bg-rose-50' : ''}`}>
                        <span className="text-xs text-slate-500">{l}</span>
                        <span className="truncate text-right font-medium text-slate-800">{String(doc.fields[k])}{doc.extraction?.boxes?.[k] && <span className="ml-2 text-[10px] text-slate-400">{Math.round(doc.extraction.boxes[k].conf * 100)}%</span>}</span>
                      </div>
                    ))}
                  </div>
                  {doc.sha256 && <div className="truncate font-mono text-[10px] text-slate-400">sha256 {doc.sha256}</div>}
                </div>
              </div>
            </div>
          )}

          {/* decision */}
          <div className="card p-6">
            <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold"><Gavel size={18} /> Final decision</h3>
            {closed || app.decision?.outcome ? (
              <div className="text-sm text-slate-600"><StatusBadge s={app.status} /> <span className="ml-2">{app.decision?.remarks}</span><div className="mt-1 text-xs text-slate-400">{app.decision?.by} · {fmtTime(app.decision?.at)}</div></div>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-500">The Desk never decides. Record the competent authority’s decision. Approval requires every flagged finding to be reviewed ({open} remaining).</p>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {[['approve', 'Approve'], ['inspection', 'Recommend inspection'], ['reject', 'Reject']].map(([k, l]) => <button key={k} onClick={() => setDecision({ ...decision, outcome: k })} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition ${decision.outcome === k ? (k === 'approve' ? 'bg-emerald-600 text-white ring-emerald-600' : k === 'reject' ? 'bg-rose-600 text-white ring-rose-600' : 'bg-orange-500 text-white ring-orange-500') : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>{l}</button>)}
                </div>
                <textarea className="input" rows={2} placeholder="Remarks for the record (required)" value={decision.remarks} onChange={(e) => setDecision({ ...decision, remarks: e.target.value })} />
                <button disabled={busy} onClick={decide} className="btn-primary mt-3">{busy && <Loader2 size={15} className="animate-spin" />} Record decision</button>
              </>
            )}
          </div>

          <div className="card p-6">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold"><History size={18} /> Timeline</h3>
            <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
              {[...app.timeline].reverse().map((t, i) => <li key={i} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" /><div className="text-slate-700">{t.text}</div><div className="text-xs text-slate-400">{t.by} · {fmtTime(t.at)}</div></li>)}
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}
