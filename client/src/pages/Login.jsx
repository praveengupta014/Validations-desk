import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, UserCheck, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { Logo } from '../components/ui.jsx';

const demos = [
  { role: 'Institute', icon: Building2, email: 'institute@demo.edu', password: 'Institute@123', tone: 'text-sky-600 bg-sky-50' },
  { role: 'Officer', icon: UserCheck, email: 'officer@aicte.demo', password: 'Officer@123', tone: 'text-violet-600 bg-violet-50' },
  { role: 'Admin', icon: ShieldCheck, email: 'admin@aicte.demo', password: 'Admin@123', tone: 'text-emerald-600 bg-emerald-50' },
];

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ email: '', password: '', name: '', instituteName: '', aicteId: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e?.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = mode === 'login' ? await login(f.email, f.password) : await register(f);
      nav(`/${u.role}`);
    } catch (e2) { setErr(e2.friendly); } finally { setBusy(false); }
  };

  const quick = async (d) => {
    setErr(''); setBusy(true);
    try { const u = await login(d.email, d.password); nav(`/${u.role}`); } catch (e2) { setErr(e2.friendly); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-900 p-12 grid-bg lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-brand-600/40 blur-[110px]" />
        <Logo light size="lg" />
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-white">Verify early,<br />decide with confidence.</h2>
          <p className="mt-4 max-w-md text-slate-300">First-pass scrutiny of Extension of Approval applications — evidence-linked, explainable and always under human control.</p>
        </div>
        <div className="relative text-xs text-slate-500">Smart India Hackathon 2026 · PS 26261 · Team Elitecoder</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fadeup">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Back to home</Link>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">{mode === 'login' ? 'Welcome back' : 'Register your institute'}</h1>
          <p className="mt-1 text-sm text-slate-500">{mode === 'login' ? 'Sign in to continue to your workspace.' : 'Create an institute account to submit applications.'}</p>

          {mode === 'login' && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick demo login</div>
              <div className="grid grid-cols-3 gap-2">
                {demos.map((d) => (
                  <button key={d.role} disabled={busy} onClick={() => quick(d)} className="card flex flex-col items-center gap-2 p-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${d.tone}`}><d.icon size={18} /></span>{d.role}
                  </button>
                ))}
              </div>
              <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use your credentials<span className="h-px flex-1 bg-slate-200" /></div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <>
                <div><label className="label">Your name</label><input required className="input" value={f.name} onChange={set('name')} /></div>
                <div><label className="label">Institute name</label><input required className="input" value={f.instituteName} onChange={set('instituteName')} /></div>
                <div><label className="label">AICTE Permanent ID (optional)</label><input className="input" value={f.aicteId} onChange={set('aicteId')} /></div>
              </>
            )}
            <div><label className="label">Email</label><input required type="email" className="input" value={f.email} onChange={set('email')} placeholder="you@institute.edu" /></div>
            <div><label className="label">Password</label><input required type="password" className="input" value={f.password} onChange={set('password')} /></div>
            {err && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
            <button disabled={busy} className="btn-primary w-full py-3">{busy && <Loader2 size={16} className="animate-spin" />}{mode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? 'New institute? ' : 'Already registered? '}
            <button className="font-semibold text-brand-600 hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
