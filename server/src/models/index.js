import mongoose from 'mongoose';
const { Schema, model } = mongoose;

/* ---------- User ---------- */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['institute', 'officer', 'admin'], required: true },
    instituteName: String,
    aicteId: String,
  },
  { timestamps: true }
);
export const User = model('User', userSchema);

/* ---------- Rule / checklist (configurable, no code change needed) ---------- */
const docRuleSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    mandatory: { type: Boolean, default: true },
    expires: { type: Boolean, default: false }, // must carry a valid-till date
    maxAgeDays: { type: Number, default: 0 }, // 0 = no limit on how old the issue date can be
    verifiable: { type: Boolean, default: true }, // QR / signature / reference check applies
  },
  { _id: false }
);
const ruleSchema = new Schema(
  {
    category: { type: String, required: true, unique: true },
    description: String,
    handbookRef: String,
    docs: [docRuleSchema],
    minBuiltUpAreaSqm: { type: Number, default: 0 },
    minInfraPhotos: { type: Number, default: 3 },
    requireFloorPlan: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const Rule = model('Rule', ruleSchema);

/* ---------- Application ---------- */
const docSchema = new Schema(
  {
    key: String,
    label: String,
    originalName: String,
    filePath: String,
    mimeType: String,
    size: Number,
    sha256: String,
    fields: {
      holderName: String,
      issuer: String,
      referenceNo: String,
      issueDate: String,
      expiryDate: String,
      area: Number,
    },
    extraction: {
      confidence: Number,
      boxes: Schema.Types.Mixed, // { fieldName: {x,y,w,h,conf} } in % of page
    },
    verification: {
      status: String,
      method: String,
      detail: String,
      checkedAt: Date,
    },
    aiValidation: {
      engine: String,
      pHash: String,
      dHash: String,
      isVisualDuplicate: Boolean,
      duplicateMatchedRef: String,
      isTampered: Boolean,
      elaScore: Number,
      stampDetected: Boolean,
      signatureDetected: Boolean,
      forensicFlags: [String],
      predictedDocType: String,
      docTypeMatch: Boolean,
      mlAnomalyScore: Number,
      nameSimilarity: Number,
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const findingSchema = new Schema(
  {
    fid: String,
    severity: { type: String, enum: ['critical', 'warning', 'info'], default: 'warning' },
    type: String, // missing | expired | inconsistent | anomaly | authority | infra
    code: String,
    title: String,
    detail: String,
    docKey: String,
    field: String,
    ruleTrace: String,
    confidence: Number,
    status: { type: String, enum: ['open', 'confirmed', 'dismissed', 'clarify', 'escalated'], default: 'open' },
    officerNote: String,
    reviewedBy: String,
    reviewedAt: Date,
  },
  { _id: false }
);

const applicationSchema = new Schema(
  {
    refNo: { type: String, unique: true },
    institute: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    instituteName: String,
    aicteId: String,
    state: String,
    category: String,
    academicYear: String,
    programmes: String,
    proposedIntake: Number,
    builtUpAreaSqm: Number,
    infraPhotos: { type: Number, default: 0 },
    floorPlan: { type: Boolean, default: false },
    docs: [docSchema],
    findings: [findingSchema],
    riskScore: { type: Number, default: 0 },
    route: { type: String, enum: ['clean', 'judgment'], default: 'judgment' },
    infraAdvice: String,
    status: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Clarification Requested', 'Escalated', 'Inspection Recommended', 'Approved', 'Rejected'],
      default: 'Submitted',
    },
    decision: { outcome: String, remarks: String, by: String, at: Date },
    timeline: [{ at: { type: Date, default: Date.now }, by: String, text: String, _id: false }],
  },
  { timestamps: true }
);
export const Application = model('Application', applicationSchema);

/* ---------- Audit log (hash chained) ---------- */
const auditSchema = new Schema({
  seq: { type: Number, required: true, unique: true },
  at: { type: Date, default: Date.now },
  actorId: String,
  actorName: String,
  role: String,
  action: String,
  entity: String,
  entityId: String,
  details: String,
  prevHash: String,
  hash: String,
});
export const AuditLog = model('AuditLog', auditSchema);
