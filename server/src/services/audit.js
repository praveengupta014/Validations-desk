import crypto from 'crypto';
import { AuditLog } from '../models/index.js';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function computeHash({ seq, at, actorId, actorName, role, action, entity, entityId, details, prevHash }) {
  const payload = JSON.stringify([seq, new Date(at).toISOString(), actorId, actorName, role, action, entity, entityId, details, prevHash]);
  return sha(payload);
}

// Serialise appends so two concurrent requests can never fork the chain.
let queue = Promise.resolve();

export function writeAudit(actor, action, entity, entityId, details = '') {
  queue = queue.then(async () => {
    const last = await AuditLog.findOne().sort({ seq: -1 });
    const entry = {
      seq: last ? last.seq + 1 : 1,
      at: new Date(),
      actorId: actor?._id ? String(actor._id) : actor?.id || 'system',
      actorName: actor?.name || 'System',
      role: actor?.role || 'system',
      action,
      entity,
      entityId: String(entityId ?? ''),
      details,
      prevHash: last ? last.hash : 'GENESIS',
    };
    entry.hash = computeHash(entry);
    return AuditLog.create(entry);
  });
  return queue.catch((e) => console.error('audit write failed', e));
}

/** Walk the whole chain and report the first broken link, if any. */
export async function verifyChain() {
  const logs = await AuditLog.find().sort({ seq: 1 }).lean();
  let prev = 'GENESIS';
  for (const l of logs) {
    if (l.prevHash !== prev) return { ok: false, total: logs.length, brokenAt: l.seq, reason: 'Previous-hash link does not match' };
    if (computeHash(l) !== l.hash) return { ok: false, total: logs.length, brokenAt: l.seq, reason: 'Entry content was modified' };
    prev = l.hash;
  }
  return { ok: true, total: logs.length, head: prev };
}
