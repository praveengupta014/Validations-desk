import assert from 'node:assert/strict';
import { analyzeApplication, tokenSimilarity } from './analyzer.js';
import { RULES } from '../seed.js';

const d = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const rule = RULES[0];
const name = 'Sunrise Institute of Technology';
const ok = (key, fields = {}) => ({ key, label: key, fields: { holderName: name, referenceNo: 'REF-' + key, issueDate: d(-300), ...fields } });

// clean case
let app = { instituteName: name, infraPhotos: 6, floorPlan: true, builtUpAreaSqm: 9100, docs: [
  ok('land_deed'), ok('trust_registration'), ok('building_plan', { area: 9200 }),
  ok('fire_noc', { expiryDate: d(300) }), ok('affiliation', { expiryDate: d(240) }), ok('audited_accounts', { issueDate: d(-100) }),
] };
let r = analyzeApplication(app, rule);
assert.equal(r.route, 'clean', JSON.stringify(r.findings.map((f) => f.code)));

// messy case
app = { instituteName: name, infraPhotos: 1, floorPlan: false, builtUpAreaSqm: 4000, docs: [
  ok('land_deed', { holderName: 'Someone Else Trust' }), ok('trust_registration'), ok('building_plan', { area: 9200 }),
  ok('fire_noc', { expiryDate: d(-10), referenceNo: 'FIRE-000' }), ok('affiliation', { referenceNo: 'NA-1', expiryDate: d(100) }),
] };
r = analyzeApplication(app, rule);
const codes = r.findings.map((f) => f.code);
for (const c of ['DOC_MISSING', 'DOC_EXPIRED', 'NAME_MISMATCH', 'AUTH_SOURCE_UNAVAILABLE', 'AUTH_MISMATCH', 'INFRA_EVIDENCE']) assert.ok(codes.includes(c), `expected ${c}, got ${codes}`);
assert.equal(r.route, 'judgment');
assert.ok(r.riskScore > 50);

// duplicate file hash
app = { instituteName: name, infraPhotos: 6, floorPlan: true, builtUpAreaSqm: 9100, docs: [{ ...ok('land_deed'), sha256: 'abc' }] };
r = analyzeApplication(app, rule, { otherHashes: new Map([['abc', 'EOA-2026-00009']]) });
assert.ok(r.findings.some((f) => f.code === 'DUPLICATE_FILE'));

assert.ok(tokenSimilarity('Sunrise Institute of Technology', 'Sunrise Institute Technology') > 0.9);
assert.ok(tokenSimilarity('Sunrise Institute', 'Moonlight Academy') < 0.1);
console.log('analyzer tests passed');
