# AICTE Validation Desk — "Verify early, decide with confidence"

Smart India Hackathon 2026 · PS 26261 · Team **Elitecoder**

Web prototype built with **React + Tailwind CSS** (frontend) and **Node.js + Express + MongoDB** (backend), following the idea PDF.

## Run it

Needs Node 18+ and a running MongoDB (local, or an Atlas URI).

```bash
npm run install:all          # installs root, server and client deps
cp server/.env.example server/.env   # then adjust MONGO_URI if needed

npm run seed                 # optional: wipes DB and reloads demo data (also auto-seeds on first start)
npm run dev:all              # starts all 3 services concurrently: AI (:8000), API (:5000), Web (:5173)
# Or run individually:
# npm run ai                 # Python FastAPI AI microservice on :8000
# npm run dev                # Node API (:5000) & React Web (:5173)
```

## Demo logins

| Role | Email | Password |
|---|---|---|
| Institute | institute@demo.edu | Institute@123 |
| Officer | officer@aicte.demo | Officer@123 |
| Admin | admin@aicte.demo | Admin@123 |

The login page has one-click buttons for all three.

## What is in the prototype (mapped to the PDF)

| PDF feature | Where |
|---|---|
| Category detection + configurable checklist | `Rule` model, Admin → Rules & checklists (edit without touching code) |
| Missing / expired / inconsistent flags | `server/src/services/analyzer.js` |
| Evidence-linked findings (highlighted region + rule trace) | Officer → Review → Document viewer |
| Anomaly flags: PDF metadata, duplicate files, date / ID mismatch | `analyzer.js` (`inspectPdfMetadata`, SHA-256 duplicate check across institutes) |
| Issuing-authority verification (Verified / Mismatch / Expired / Pending / Source unavailable / Manual review) | `verifyAuthority()` connector (sandbox) |
| Infrastructure evidence (advisory) | photos, floor plan, area vs approved plan |
| Officer dashboard + live alerts | Socket.io alerts, risk-sorted review queue |
| Confirm / dismiss / clarify / escalate + final human decision | Review page |
| Rectification path for institutes | Institute → application → Deficiency list → Replace / correct (re-runs all checks) |
| Hash-chained audit trail + integrity check | `services/audit.js`, Audit page "Verify integrity" |
| RBAC + JWT | `middleware/auth.js` |

## Demo flow (2 minutes)

1. Sign in as **Officer** → dashboard shows 3 sample applications; open the high-risk one (Sunrise Institute, risk ≈ 100) and click through findings.
2. Sign in as **Institute** → *New application* → leave the Fire NOC out or give an expired date → submit → instant deficiency list. Officer gets a live toast.
3. As Institute, click *Replace / correct* on a finding and fix the date → findings re-run.
4. As **Admin** → *Rules & checklists* → turn a document to "Optional" → save → next application uses it.
5. Audit trail → *Verify integrity*.

Sandbox rules for issuer verification (so the demo is predictable): reference starting `NA` → Source unavailable, `PEND` → Pending, ending `000` → Mismatch, expiry in the past → Expired, no reference → Manual review, anything else → Verified.

## AI / ML Architecture (Pluggable Microservice)
* **Wired & Integrated:** The Python FastAPI service in [`ai-service/`](file:///Users/praveengupta/Downloads/aicte-validation-desk/ai-service) runs PaddleOCR, OpenCV (ELA tampering, stamp & signature detection), scikit-learn (document classification & Isolation Forest anomaly risk), RapidFuzz matching, and Perceptual Hashing (pHash visual duplicate check).
* Issuer verification is a **sandbox connector**; real APIs (DigiLocker, fire services, etc.) plug into `verifyAuthority()`.
* All findings are preliminary indicators; the final decision is always recorded by an officer.

## Structure

```
ai-service/ app/(api, services) tests/ main.py config.py demo.py Dockerfile
server/src  models/ routes/ services/(analyzer, audit, aiClient) middleware/ seed.js index.js
client/src  pages/(Landing, Login, institute/, officer/, admin/, Audit) components/ auth.jsx api.js
```

`npm test --prefix server` runs the analyzer tests.
