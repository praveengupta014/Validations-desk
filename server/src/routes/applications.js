import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Application, Rule } from '../models/index.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { analyzeApplication, analyzeApplicationWithAI, sha256File } from '../services/analyzer.js';
import { isAIServiceAvailable, getAISystemInfo, callAIServiceOCR } from '../services/aiClient.js';
import os from 'os';
import { writeAudit } from '../services/audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = process.env.VERCEL
  ? path.join(os.tmpdir(), 'aicte_uploads')
  : path.resolve(__dirname, '../../uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const ALLOWED = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => (ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF, PNG or JPG files are allowed'))),
});

export default function applicationRoutes(io) {
  const r = Router();
  r.use(requireAuth);

  const canSee = (user, app) => user.role !== 'institute' || String(app.institute) === String(user._id);

  async function otherHashes(excludeId) {
    const others = await Application.find({ _id: { $ne: excludeId } }).select('refNo docs.sha256');
    const m = new Map();
    others.forEach((a) => a.docs.forEach((d) => d.sha256 && m.set(d.sha256, a.refNo)));
    return m;
  }

  async function otherPHashes(excludeId) {
    const others = await Application.find({ _id: { $ne: excludeId } }).select('refNo docs.aiValidation.pHash').lean();
    const list = [];
    others.forEach((a) => a.docs?.forEach((d) => {
      if (d.aiValidation?.pHash) list.push({ refNo: a.refNo, pHash: d.aiValidation.pHash });
    }));
    return list;
  }

  async function runAnalysis(app) {
    const rule = await Rule.findOne({ category: app.category });
    if (!rule) throw new Error(`No checklist configured for category "${app.category}"`);
    const previous = new Map((app.findings || []).map((f) => [`${f.code}|${f.docKey || ''}`, f]));
    const res = await analyzeApplicationWithAI(app, rule, {
      otherHashes: await otherHashes(app._id),
      otherPHashes: await otherPHashes(app._id),
    });
    // keep officer decisions on findings that are still raised
    res.findings.forEach((f) => {
      const p = previous.get(`${f.code}|${f.docKey || ''}`);
      if (p && p.status !== 'open') Object.assign(f, { status: p.status, officerNote: p.officerNote, reviewedBy: p.reviewedBy, reviewedAt: p.reviewedAt });
    });
    app.findings = res.findings;
    app.riskScore = res.riskScore;
    app.route = res.route;
    app.infraAdvice = res.infraAdvice;
    return app;
  }

  const nextRef = async () => {
    const n = (await Application.countDocuments()) + 1;
    return `EOA-${new Date().getFullYear()}-${String(n).padStart(5, '0')}`;
  };

  /* AI Service Status */
  r.get('/ai/status', async (_req, res) => {
    const available = await isAIServiceAvailable();
    const info = available ? await getAISystemInfo() : null;
    res.json({ available, info });
  });

  /* AI Document Auto-Extraction */
  r.post('/ai/extract-fields', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const docKey = req.body.docKey || 'generic';
    const result = await callAIServiceOCR(req.file.path, docKey, req.file.mimetype);
    if (!result) {
      return res.json({ confidence: 0.85, fields: {}, boxes: {}, engine: 'Fallback Heuristic' });
    }
    res.json(result);
  });

  /* list */
  r.get('/', async (req, res) => {
    const q = req.user.role === 'institute' ? { institute: req.user._id } : {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.route) q.route = req.query.route;
    const apps = await Application.find(q).sort({ createdAt: -1 }).select('-docs.extraction -timeline').lean();
    res.json(apps.map((a) => ({ ...a, openFindings: a.findings.filter((f) => f.status === 'open' && f.severity !== 'info').length, findingCount: a.findings.length })));
  });

  /* create — multipart: `payload` (JSON) + files named file_<docKey> */
  r.post('/', allow('institute'), upload.any(), async (req, res) => {
    try {
      const p = JSON.parse(req.body.payload || '{}');
      if (!p.category) return res.status(400).json({ message: 'Select an application category' });
      const files = Object.fromEntries((req.files || []).map((f) => [f.fieldname.replace(/^file_/, ''), f]));
      const rule = await Rule.findOne({ category: p.category });
      if (!rule) return res.status(400).json({ message: 'Unknown category' });
      const labels = Object.fromEntries(rule.docs.map((d) => [d.key, d.label]));

      const docs = (p.docs || []).map((d) => {
        const f = files[d.key];
        return {
          key: d.key, label: labels[d.key] || d.key, fields: d.fields || {},
          ...(f ? { originalName: f.originalname, filePath: f.path, mimeType: f.mimetype, size: f.size, sha256: sha256File(f.path) } : {}),
        };
      });

      const app = new Application({
        refNo: await nextRef(), institute: req.user._id,
        instituteName: p.instituteName || req.user.instituteName, aicteId: p.aicteId || req.user.aicteId, state: p.state,
        category: p.category, academicYear: p.academicYear, programmes: p.programmes, proposedIntake: Number(p.proposedIntake) || 0,
        builtUpAreaSqm: Number(p.builtUpAreaSqm) || 0, infraPhotos: Number(p.infraPhotos) || 0, floorPlan: !!p.floorPlan, docs,
      });
      await runAnalysis(app);
      app.timeline.push({ by: req.user.name, text: 'Application submitted and auto-scrutinised' });
      await app.save();

      const critical = app.findings.filter((f) => f.severity === 'critical').length;
      await writeAudit(req.user, 'APPLICATION_SUBMITTED', 'application', app.refNo, `${app.findings.length} findings (${critical} critical), routed: ${app.route}`);
      io.to('staff').emit('alert', { level: critical ? 'critical' : 'info', refNo: app.refNo, id: app._id, text: `${app.instituteName}: new application — ${critical} critical finding(s), routed to ${app.route === 'clean' ? 'light check' : 'officer'}` });
      res.status(201).json(app);
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: e.message });
    }
  });

  /* detail */
  r.get('/:id', async (req, res) => {
    const app = await Application.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (!canSee(req.user, app)) return res.status(403).json({ message: 'Not your application' });
    const rule = await Rule.findOne({ category: app.category }).lean();
    res.json({ ...app, rule });
  });

  /* secured file download */
  r.get('/:id/files/:key', async (req, res) => {
    const app = await Application.findById(req.params.id);
    if (!app || !canSee(req.user, app)) return res.status(404).end();
    const d = app.docs.find((x) => x.key === req.params.key);
    if (!d?.filePath || !fs.existsSync(d.filePath)) return res.status(404).json({ message: 'No file for this document' });
    res.setHeader('Content-Type', d.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(d.originalName)}"`);
    fs.createReadStream(d.filePath).pipe(res);
  });

  /* rectification: institute replaces / adds a document and everything is re-checked */
  r.post('/:id/documents/:key', allow('institute'), upload.single('file'), async (req, res) => {
    try {
      const app = await Application.findById(req.params.id);
      if (!app || !canSee(req.user, app)) return res.status(404).json({ message: 'Application not found' });
      if (['Approved', 'Rejected'].includes(app.status)) return res.status(409).json({ message: 'This application is closed' });
      const rule = await Rule.findOne({ category: app.category });
      const rd = rule.docs.find((d) => d.key === req.params.key);
      if (!rd) return res.status(400).json({ message: 'Not part of this checklist' });
      const fields = JSON.parse(req.body.fields || '{}');
      const doc = { key: rd.key, label: rd.label, fields };
      if (req.file) Object.assign(doc, { originalName: req.file.originalname, filePath: req.file.path, mimeType: req.file.mimetype, size: req.file.size, sha256: sha256File(req.file.path) });
      const i = app.docs.findIndex((d) => d.key === rd.key);
      if (i >= 0) app.docs.splice(i, 1, doc); else app.docs.push(doc);
      if (req.body.infraPhotos !== undefined) app.infraPhotos = Number(req.body.infraPhotos);
      await runAnalysis(app);
      app.status = app.status === 'Clarification Requested' ? 'Under Review' : app.status;
      app.timeline.push({ by: req.user.name, text: `Re-submitted "${rd.label}"; checks re-run` });
      await app.save();
      await writeAudit(req.user, 'DOCUMENT_RESUBMITTED', 'application', app.refNo, rd.label);
      io.to('staff').emit('alert', { level: 'info', refNo: app.refNo, id: app._id, text: `${app.instituteName} re-submitted "${rd.label}"` });
      res.json(app);
    } catch (e) { res.status(400).json({ message: e.message }); }
  });

  /* officer acts on one finding */
  r.post('/:id/findings/:fid/action', allow('officer', 'admin'), async (req, res) => {
    const { action, note } = req.body || {};
    const map = { confirm: 'confirmed', dismiss: 'dismissed', clarify: 'clarify', escalate: 'escalated' };
    if (!map[action]) return res.status(400).json({ message: 'Unknown action' });
    const app = await Application.findById(req.params.id);
    const f = app?.findings.find((x) => x.fid === req.params.fid);
    if (!f) return res.status(404).json({ message: 'Finding not found' });
    if (['Approved', 'Rejected'].includes(app.status)) return res.status(409).json({ message: 'Application already decided' });
    if ((action === 'dismiss' || action === 'escalate') && !(note || '').trim()) return res.status(400).json({ message: 'A short note is required for this action' });
    Object.assign(f, { status: map[action], officerNote: note || '', reviewedBy: req.user.name, reviewedAt: new Date() });
    if (action === 'clarify') app.status = 'Clarification Requested';
    else if (action === 'escalate') app.status = 'Escalated';
    else if (app.status === 'Submitted') app.status = 'Under Review';
    app.timeline.push({ by: req.user.name, text: `${action} → "${f.title}"${note ? ` — ${note}` : ''}` });
    await app.save();
    await writeAudit(req.user, `FINDING_${action.toUpperCase()}`, 'application', app.refNo, `${f.code}${f.docKey ? ' / ' + f.docKey : ''}${note ? ' — ' + note : ''}`);
    io.emit('application:updated', { id: app._id });
    res.json(app);
  });

  /* final human decision */
  r.post('/:id/decision', allow('officer', 'admin'), async (req, res) => {
    const { outcome, remarks } = req.body || {};
    if (!['approve', 'reject', 'inspection'].includes(outcome)) return res.status(400).json({ message: 'Unknown outcome' });
    if (!(remarks || '').trim()) return res.status(400).json({ message: 'Remarks are required for the record' });
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });
    const open = app.findings.filter((f) => f.status === 'open' && f.severity !== 'info').length;
    if (outcome === 'approve' && open) return res.status(409).json({ message: `${open} finding(s) still need review before approval` });
    app.status = { approve: 'Approved', reject: 'Rejected', inspection: 'Inspection Recommended' }[outcome];
    app.decision = { outcome, remarks, by: req.user.name, at: new Date() };
    app.timeline.push({ by: req.user.name, text: `Decision: ${app.status} — ${remarks}` });
    await app.save();
    await writeAudit(req.user, `DECISION_${outcome.toUpperCase()}`, 'application', app.refNo, remarks);
    io.emit('application:updated', { id: app._id });
    res.json(app);
  });

  return r;
}
