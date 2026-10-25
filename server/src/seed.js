import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { User, Rule, Application } from './models/index.js';
import { analyzeApplication } from './services/analyzer.js';
import { writeAudit } from './services/audit.js';

const d = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

const commonDocs = [
  { key: 'land_deed', label: 'Land ownership / lease deed', mandatory: true, expires: false, maxAgeDays: 0, verifiable: true },
  { key: 'trust_registration', label: 'Society / Trust registration certificate', mandatory: true, expires: false, maxAgeDays: 0, verifiable: true },
  { key: 'building_plan', label: 'Approved building plan', mandatory: true, expires: false, maxAgeDays: 0, verifiable: true },
  { key: 'fire_noc', label: 'Fire safety NOC', mandatory: true, expires: true, maxAgeDays: 0, verifiable: true },
  { key: 'affiliation', label: 'University affiliation / consent letter', mandatory: true, expires: true, maxAgeDays: 0, verifiable: true },
  { key: 'audited_accounts', label: 'Audited financial statement', mandatory: true, expires: false, maxAgeDays: 550, verifiable: false },
  { key: 'accreditation', label: 'NAAC / NBA accreditation (if applicable)', mandatory: false, expires: true, maxAgeDays: 0, verifiable: true },
];

export const RULES = [
  { category: 'Engineering & Technology', description: 'UG / PG engineering programmes', handbookRef: 'Approval Process Handbook — Part B', docs: commonDocs, minBuiltUpAreaSqm: 6000, minInfraPhotos: 4, requireFloorPlan: true },
  { category: 'Management (MBA / PGDM)', description: 'Management programmes', handbookRef: 'Approval Process Handbook — Part C', docs: commonDocs, minBuiltUpAreaSqm: 3000, minInfraPhotos: 3, requireFloorPlan: true },
  { category: 'Pharmacy', description: 'D.Pharm / B.Pharm / M.Pharm', handbookRef: 'Approval Process Handbook — Part D', docs: [...commonDocs, { key: 'pci_approval', label: 'Pharmacy Council of India approval', mandatory: true, expires: true, maxAgeDays: 0, verifiable: true }], minBuiltUpAreaSqm: 4000, minInfraPhotos: 4, requireFloorPlan: true },
  { category: 'Architecture', description: 'B.Arch / M.Arch', handbookRef: 'Approval Process Handbook — Part E', docs: [...commonDocs, { key: 'coa_approval', label: 'Council of Architecture approval', mandatory: true, expires: true, maxAgeDays: 0, verifiable: true }], minBuiltUpAreaSqm: 3500, minInfraPhotos: 4, requireFloorPlan: true },
];

const mkDoc = (key, label, fields) => ({ key, label, fields });

function sampleApps(institute) {
  const name = institute.instituteName;
  const clean = [
    mkDoc('land_deed', 'Land ownership / lease deed', { holderName: name, issuer: 'Sub-Registrar Office', referenceNo: 'REG-2019-44871', issueDate: d(-2500) }),
    mkDoc('trust_registration', 'Society / Trust registration certificate', { holderName: name, issuer: 'Registrar of Societies', referenceNo: 'SOC-1998-1207', issueDate: d(-9000) }),
    mkDoc('building_plan', 'Approved building plan', { holderName: name, issuer: 'Municipal Corporation', referenceNo: 'BP-2018-9921', issueDate: d(-2700), area: 9200 }),
    mkDoc('fire_noc', 'Fire safety NOC', { holderName: name, issuer: 'State Fire Services', referenceNo: 'FIRE-2026-3321', issueDate: d(-200), expiryDate: d(300) }),
    mkDoc('affiliation', 'University affiliation / consent letter', { holderName: name, issuer: 'Affiliating University', referenceNo: 'AFF-2026-0771', issueDate: d(-120), expiryDate: d(240) }),
    mkDoc('audited_accounts', 'Audited financial statement', { holderName: name, issuer: 'Chartered Accountant', referenceNo: 'CA-FY25-118', issueDate: d(-180) }),
  ];
  const messy = [
    mkDoc('land_deed', 'Land ownership / lease deed', { holderName: 'Sunrise Educational Foundation', issuer: 'Sub-Registrar Office', referenceNo: 'REG-2017-30000', issueDate: d(-3000) }),
    mkDoc('trust_registration', 'Society / Trust registration certificate', { holderName: name, issuer: 'Registrar of Societies', referenceNo: 'SOC-1998-1207', issueDate: d(-9000) }),
    mkDoc('building_plan', 'Approved building plan', { holderName: name, issuer: 'Municipal Corporation', referenceNo: 'BP-2018-9921', issueDate: d(-2700), area: 9200 }),
    mkDoc('fire_noc', 'Fire safety NOC', { holderName: name, issuer: 'State Fire Services', referenceNo: 'FIRE-2024-1180', issueDate: d(-800), expiryDate: d(-35) }),
    mkDoc('affiliation', 'University affiliation / consent letter', { holderName: name, issuer: 'Affiliating University', referenceNo: 'NA-AFF-22', issueDate: d(-100), expiryDate: d(260) }),
    mkDoc('audited_accounts', 'Audited financial statement', { holderName: name, issuer: 'Chartered Accountant', referenceNo: 'BP-2018-9921', issueDate: d(-700) }),
  ];
  return [
    { category: 'Engineering & Technology', academicYear: '2027-28', programmes: 'B.Tech CSE, ECE, Mechanical', proposedIntake: 240, builtUpAreaSqm: 9100, infraPhotos: 6, floorPlan: true, docs: clean, state: 'Maharashtra' },
    { category: 'Engineering & Technology', academicYear: '2027-28', programmes: 'B.Tech AI & DS, Civil', proposedIntake: 180, builtUpAreaSqm: 5200, infraPhotos: 2, floorPlan: false, docs: messy, state: 'Maharashtra' },
    { category: 'Management (MBA / PGDM)', academicYear: '2027-28', programmes: 'MBA, PGDM', proposedIntake: 120, builtUpAreaSqm: 3400, infraPhotos: 3, floorPlan: true, docs: clean.slice(0, 5), state: 'Maharashtra' },
  ];
}

export async function seedIfEmpty({ force = false } = {}) {
  if (force) await Promise.all([User.deleteMany({}), Rule.deleteMany({}), Application.deleteMany({})]);
  if (!(await Rule.countDocuments())) {
    await Rule.insertMany(RULES);
    console.log('Seeded checklists');
  }
  if (await User.countDocuments()) return;
  const hash = (p) => bcrypt.hash(p, 10);
  const [admin, officer, inst1, inst2] = await User.insertMany([
    { name: 'Admin (Regulation Bureau)', email: 'admin@aicte.demo', password: await hash('Admin@123'), role: 'admin' },
    { name: 'Officer Meera Nair', email: 'officer@aicte.demo', password: await hash('Officer@123'), role: 'officer' },
    { name: 'Dr. Rakesh Mehta', email: 'institute@demo.edu', password: await hash('Institute@123'), role: 'institute', instituteName: 'Sunrise Institute of Technology', aicteId: '1-4412345678' },
    { name: 'Prof. Anita Desai', email: 'institute2@demo.edu', password: await hash('Institute@123'), role: 'institute', instituteName: 'Lotus School of Management', aicteId: '1-5523456789' },
  ]);
  console.log('Seeded users');

  const rulesByCat = Object.fromEntries((await Rule.find()).map((r) => [r.category, r]));
  const apps = sampleApps(inst1);
  let n = 1;
  for (const [i, a] of apps.entries()) {
    const inst = i === 2 ? inst2 : inst1;
    const app = new Application({ ...a, refNo: `EOA-${new Date().getFullYear()}-${String(n++).padStart(5, '0')}`, institute: inst._id, instituteName: inst.instituteName, aicteId: inst.aicteId });
    const res = analyzeApplication(app, rulesByCat[app.category]);
    Object.assign(app, { findings: res.findings, riskScore: res.riskScore, route: res.route, infraAdvice: res.infraAdvice });
    app.timeline.push({ by: inst.name, text: 'Application submitted and auto-scrutinised' });
    await app.save();
    await writeAudit(inst, 'APPLICATION_SUBMITTED', 'application', app.refNo, `${app.findings.length} findings, routed: ${app.route}`);
  }
  await writeAudit(admin, 'SYSTEM_SEEDED', 'system', 'seed', 'Demo data loaded');
  console.log('Seeded sample applications');
}

// `npm run seed` -> wipe and reload demo data
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aicte_validation_desk');
  await mongoose.connection.dropDatabase();
  await seedIfEmpty();
  await mongoose.disconnect();
  console.log('Done. Logins: admin@aicte.demo / Admin@123, officer@aicte.demo / Officer@123, institute@demo.edu / Institute@123');
}
