import { Router } from 'express';
import { Application, Rule, AuditLog, User } from '../models/index.js';
import { requireAuth, allow } from '../middleware/auth.js';
import { verifyChain, writeAudit } from '../services/audit.js';

const r = Router();
r.use(requireAuth);

/* ---- rules / checklists ---- */
r.get('/rules', async (_req, res) => res.json(await Rule.find().sort({ category: 1 })));

r.put('/rules/:id', allow('admin'), async (req, res) => {
  const { docs, minBuiltUpAreaSqm, minInfraPhotos, requireFloorPlan, active, description, handbookRef } = req.body || {};
  const rule = await Rule.findById(req.params.id);
  if (!rule) return res.status(404).json({ message: 'Rule not found' });
  if (Array.isArray(docs)) rule.docs = docs;
  Object.entries({ minBuiltUpAreaSqm, minInfraPhotos, requireFloorPlan, active, description, handbookRef }).forEach(([k, v]) => v !== undefined && (rule[k] = v));
  await rule.save();
  await writeAudit(req.user, 'RULE_UPDATED', 'rule', rule.category, `Checklist updated by configuration (${rule.docs.length} documents)`);
  res.json(rule);
});

/* ---- dashboard stats ---- */
r.get('/stats', allow('officer', 'admin'), async (_req, res) => {
  const apps = await Application.find().select('status route riskScore findings category createdAt').lean();
  const by = (k) => apps.reduce((m, a) => ((m[a[k]] = (m[a[k]] || 0) + 1), m), {});
  const sevCount = { critical: 0, warning: 0, info: 0 };
  const typeCount = {};
  let open = 0;
  apps.forEach((a) => a.findings.forEach((f) => {
    sevCount[f.severity]++;
    typeCount[f.type] = (typeCount[f.type] || 0) + 1;
    if (f.status === 'open' && f.severity !== 'info') open++;
  }));
  const decided = apps.filter((a) => ['Approved', 'Rejected'].includes(a.status)).length;
  res.json({
    total: apps.length, clean: apps.filter((a) => a.route === 'clean').length, judgment: apps.filter((a) => a.route === 'judgment').length,
    decided, pending: apps.length - decided, openFindings: open, byStatus: by('status'), byCategory: by('category'), sevCount, typeCount,
    avgRisk: apps.length ? Math.round(apps.reduce((s, a) => s + a.riskScore, 0) / apps.length) : 0,
  });
});

/* ---- audit ---- */
r.get('/audit', allow('officer', 'admin'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json(await AuditLog.find().sort({ seq: -1 }).limit(limit).lean());
});
r.get('/audit/verify', allow('admin', 'officer'), async (_req, res) => res.json(await verifyChain()));

/* ---- users (admin) ---- */
r.get('/users', allow('admin'), async (_req, res) => res.json(await User.find().select('-password').sort({ role: 1, name: 1 })));

export default r;
