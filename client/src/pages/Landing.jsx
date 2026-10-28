import { Link } from 'react-router-dom';
import {
  ArrowRight, BrainCircuit, ScanSearch, ShieldAlert, BadgeCheck, Building2, ScrollText, FileUp, ListChecks, Search, Users, UserCheck,
  Gauge, Clock, Fingerprint, Scale, Network, CheckCircle2, Lock, Boxes,
} from 'lucide-react';
import { Logo } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';

const features = [
  { icon: ListChecks, t: 'Understands the application', d: 'Identifies the category, loads the matching configurable checklist and flags missing, expired or inconsistent items at the earliest stage.', c: 'from-brand-500 to-sky-500' },
  { icon: ScanSearch, t: 'OCR + field extraction', d: 'Every upload is read and classified. Each finding links to evidence — a highlighted region and the rule that raised it.', c: 'from-violet-500 to-fuchsia-500' },
  { icon: ShieldAlert, t: 'Anomaly flags', d: 'PDF metadata, duplicate files and date or identifier mismatches. Always preliminary indicators that need human verification.', c: 'from-amber-500 to-orange-500' },
  { icon: BadgeCheck, t: 'Issuing-authority check', d: 'QR code, digital signature or reference number with clear statuses: Verified, Mismatch, Expired, Pending, Source unavailable, Manual review.', c: 'from-emerald-500 to-teal-500' },
  { icon: Building2, t: 'Infrastructure evidence', d: 'Photos and floor plans are assessed to flag cases that need more evidence or a physical inspection. Advisory only.', c: 'from-rose-500 to-pink-500' },
  { icon: ScrollText, t: 'Tamper-evident audit trail', d: 'Every action is written to a SHA-256 hash-chained log. The final decision always stays with the competent AICTE authority.', c: 'from-slate-600 to-slate-800' },
];

const stages = [
  { n: '1', t: 'Intake and reading', c: 'bg-brand-600', items: ['Institute uploads application and documents', 'Category detection and checklist loading', 'OCR and document classification', 'Field extraction with evidence boxes', 'Validation rules: missing, expired, inconsistent'] },
  { n: '2', t: 'Checks', c: 'bg-orange-500', items: ['Cross-check with AICTE institutional records', 'Anomaly flags: metadata, duplicates, ID or date mismatch', 'Source verification (QR, signature, reference)', 'Infrastructure evidence check (advisory)', 'Findings report and automatic alerts'] },
  { n: '3', t: 'Review and decision', c: 'bg-emerald-600', items: ['Officer review dashboard', 'Confirm, dismiss, clarify or escalate', 'Human final decision by AICTE authority', 'Hash-chained audit trail', 'Institute rectifies where the process permits'] },
];

const impact = [
  { icon: Gauge, t: 'Enhanced efficiency', d: 'Repetitive first-pass checks are automated, so officers focus on judgment cases.' },
  { icon: Clock, t: 'Earlier detection', d: 'Missing, expired or inconsistent items surface at submission — fewer delays, fewer repeat rounds.' },
  { icon: Fingerprint, t: 'Reliable authentication', d: 'Source verification plus evidence-linked anomaly flags give higher trust and traceability.' },
  { icon: Scale, t: 'Consistent & transparent', d: 'Configurable checklists and a tamper-evident audit trail mean uniform scrutiny and clear accountability.' },
  { icon: Network, t: 'Scalable & integrable', d: 'Modular services and connector adapters adapt to new document types, rules and authorised data sources.' },
];

const stack = [
  { g: 'Web application', i: ['React.js', 'Tailwind CSS', 'Node.js', 'Express.js', 'MongoDB', 'Socket.io'] },
  { g: 'AI / ML layer (pluggable)', i: ['Python', 'PaddleOCR', 'OpenCV', 'scikit-learn', 'RapidFuzz matching', 'Perceptual hash', 'LLM structured extraction'] },
  { g: 'Platform & security', i: ['FastAPI', 'Docker', 'JWT', 'RBAC', 'PDF.js', 'SHA-256 audit chain'] },
];

const Section = ({ id, eyebrow, title, sub, children, dark }) => (
  <section id={id} className={dark ? 'bg-ink-900 text-white' : ''}>
    <div className="mx-auto max-w-6xl px-5 py-20">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <div className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-brand-500">{eyebrow}</div>
        <h2 className={`font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
        {sub && <p className={`mt-3 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{sub}</p>}
      </div>
      {children}
    </div>
  </section>
);

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? `/${user.role}` : '/login';
  return (
    <div className="bg-white">
      {/* nav */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Logo light />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#workflow" className="hover:text-white">Workflow</a>
            <a href="#impact" className="hover:text-white">Impact</a>
            <a href="#tech" className="hover:text-white">Technology</a>
          </nav>
          <Link to={cta} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink-900 transition hover:bg-brand-50">{user ? 'Open dashboard' : 'Sign in'}</Link>
        </div>
      </header>

      {/* hero */}
      <div className="relative overflow-hidden bg-ink-900 grid-bg">
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-brand-600/40 blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-36 lg:grid-cols-2">
          <div className="animate-fadeup">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-brand-200 ring-1 ring-white/15">
              <BrainCircuit size={14} /> Smart India Hackathon 2026 · PS 26261 · Team Kepler_SU
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl">
              Verify early,<br /><span className="bg-gradient-to-r from-brand-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">decide with confidence.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              AICTE Validation Desk is a decision-support platform for the Regulation Bureau. It performs the repetitive first-pass scrutiny of Extension of Approval applications — so officers spend their time only on cases that need judgment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={cta} className="btn-primary px-6 py-3 text-base shadow-glow">{user ? 'Open dashboard' : 'Try the prototype'} <ArrowRight size={18} /></Link>
              <a href="#workflow" className="btn rounded-xl bg-white/10 px-6 py-3 text-base text-white ring-1 ring-white/20 hover:bg-white/20">See how it works</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400">
              {['Evidence-linked findings', 'Human-in-the-loop', 'Hash-chained audit'].map((t) => (
                <span key={t} className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" />{t}</span>
              ))}
            </div>
          </div>

          {/* mock card */}
          <div className="relative hidden animate-floaty lg:block">
            <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
              <div className="rounded-2xl bg-white p-5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-400">EOA-2026-00002</div>
                    <div className="font-display text-lg font-extrabold text-slate-900">Sunrise Institute of Technology</div>
                  </div>
                  <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">Needs judgment</div>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    ['critical', 'Fire safety NOC has expired', 'Valid till 35 days ago'],
                    ['critical', 'Land deed: name differs from applicant', 'Similarity 18%'],
                    ['warning', 'Affiliation letter: issuer check — Source unavailable', 'Confirm manually'],
                    ['info', 'Floor plan missing', 'Advisory: consider inspection'],
                  ].map(([s, t, d]) => (
                    <div key={t} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${s === 'critical' ? 'bg-rose-500' : s === 'warning' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                      <div><div className="text-sm font-semibold text-slate-800">{t}</div><div className="text-xs text-slate-500">{d}</div></div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="flex-1 rounded-lg bg-emerald-600 py-2 text-center text-xs font-bold text-white">Confirm</div>
                  <div className="flex-1 rounded-lg bg-slate-100 py-2 text-center text-xs font-bold text-slate-700">Dismiss</div>
                  <div className="flex-1 rounded-lg bg-violet-100 py-2 text-center text-xs font-bold text-violet-700">Escalate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* problem -> resolution */}
      <Section eyebrow="Problem resolution" title="Only the cases that need judgment reach an officer">
        <div className="grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr]">
          <div className="card p-7">
            <div className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Today</div>
            <ul className="space-y-3 text-slate-600">
              {['Repetitive document scrutiny done manually', 'Gaps discovered late, causing repeat rounds', 'Authenticity of certificates hard to verify', 'Inconsistent checks across cases'].map((t) => <li key={t} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />{t}</li>)}
            </ul>
          </div>
          <div className="hidden place-items-center md:grid"><div className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-glow"><ArrowRight /></div></div>
          <div className="card border-brand-200 bg-gradient-to-br from-brand-50 to-white p-7 ring-brand-200">
            <div className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-600">With the Validation Desk</div>
            <p className="text-slate-700">The Desk validates applications and supporting documents against institutional records and configurable regulations, detects anomalies, and routes only the cases that need judgment to authorised officials.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {['Explainable findings', 'Config, not code', 'Human-in-the-loop', 'Role-based access'].map((t) => <div key={t} className="flex items-center gap-2 font-semibold text-slate-800"><CheckCircle2 size={16} className="text-emerald-500" />{t}</div>)}
            </div>
          </div>
        </div>
      </Section>

      <div className="bg-slate-50">
        <Section id="features" eyebrow="What it does" title="Six capabilities, one first-pass desk" sub="Everything the prototype performs when an Extension of Approval application arrives.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: I, t, d, c }, i) => (
              <div key={t} className="card group animate-fadeup p-6 transition hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white ${c}`}><I size={22} /></div>
                <h3 className="font-display text-lg font-bold text-slate-900">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{d}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section id="workflow" eyebrow="Work flow" title="From upload to a defensible decision">
        <div className="grid gap-6 lg:grid-cols-3">
          {stages.map((s) => (
            <div key={s.n} className="card overflow-hidden">
              <div className={`flex items-center gap-3 px-6 py-4 text-white ${s.c}`}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 font-display font-extrabold">{s.n}</span>
                <span className="font-display text-lg font-bold">{s.t}</span>
              </div>
              <ol className="space-y-0 p-6">
                {s.items.map((it, i) => (
                  <li key={it} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < s.items.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px bg-slate-200" />}
                    <span className="relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 ring-4 ring-white">{i + 1}</span>
                    <span className="text-sm font-medium text-slate-700">{it}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      <div className="bg-slate-50">
        <Section eyebrow="Who uses it" title="Three roles, one secure platform">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: FileUp, t: 'Institute portal', d: 'Upload documents, see the deficiency list instantly and re-upload where the process permits.' },
              { icon: UserCheck, t: 'Officer dashboard', d: 'Review queue with a document viewer and highlighted evidence. Confirm, dismiss, clarify or escalate.' },
              { icon: Users, t: 'Admin console', d: 'Edit rules and checklists by configuration, manage users and verify audit-trail integrity.' },
            ].map(({ icon: I, t, d }) => (
              <div key={t} className="card p-6">
                <I className="mb-4 text-brand-600" size={28} />
                <h3 className="font-display text-lg font-bold">{t}</h3>
                <p className="mt-2 text-sm text-slate-500">{d}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section id="impact" eyebrow="Impact and benefits" title="Faster scrutiny, higher trust" dark>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {impact.map(({ icon: I, t, d }) => (
            <div key={t} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:bg-white/10">
              <I className="mb-4 text-brand-300" size={26} />
              <h3 className="font-display text-lg font-bold text-white">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="tech" eyebrow="Technical approach" title="Proven technologies, no heavy model training" sub="Pretrained and classical methods first, so a working prototype needs no heavy model training.">
        <div className="grid gap-5 md:grid-cols-3">
          {stack.map(({ g, i }, k) => (
            <div key={g} className="card p-6">
              <div className="mb-4 flex items-center gap-2 font-display font-bold text-slate-900">
                {[<Boxes key="a" size={18} className="text-brand-600" />, <BrainCircuit key="b" size={18} className="text-violet-600" />, <Lock key="c" size={18} className="text-emerald-600" />][k]} {g}
              </div>
              <div className="flex flex-wrap gap-2">{i.map((x) => <span key={x} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{x}</span>)}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ['Technical', 'OCR accuracy on poor scans → confidence scores and automatic manual routing.'],
            ['Integration', 'Authority APIs may be unavailable → connector layer; “source unavailable” falls back to manual confirmation.'],
            ['Operational', 'Officer trust → explainable results, human-in-the-loop decisions, training.'],
            ['Security', 'Confidential data → role-based access, encryption, access logging, retention rules.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-slate-200 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-600">{t} challenge</div>
              <p className="mt-2 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <div className="px-5 pb-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 p-10 text-center shadow-glow sm:p-16">
          <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">See first-pass scrutiny in action</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">Sign in with a demo account and watch missing, expired and inconsistent items surface in seconds.</p>
          <Link to={cta} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-brand-700 transition hover:scale-105">Launch prototype <ArrowRight size={18} /></Link>
        </div>
      </div>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-500 md:flex-row">
          <Logo />
          <div>Smart India Hackathon 2026 · Problem Statement 26261 · Theme: Smart Automation · Team Kepler_SU</div>
        </div>
      </footer>
    </div>
  );
}
