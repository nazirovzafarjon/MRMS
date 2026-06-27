# MRMS — Medical Record Management System

> **Client:** CareTrack Clinic
> **Module:** BTEC Level 3 — Unit 25: Full Stack Development
> **Architecture:** Decoupled REST API (Express 5 + Node.js + MongoDB) ↔ SPA (React 18 + Vite 5)

![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-9.x-880000?style=flat-square&logo=mongoose&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT%208h-orange?style=flat-square&logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)

---

## Table of Contents

1. [Business Goal](#1-business-goal)
2. [System Architecture](#2-system-architecture)
3. [Data Model (MongoDB / Mongoose)](#3-data-model-mongodb--mongoose)
4. [Roles & Access Control](#4-roles--access-control)
5. [Authentication](#5-authentication)
6. [API Endpoint Reference](#6-api-endpoint-reference)
7. [Key Workflows](#7-key-workflows)
8. [Folder Structure](#8-folder-structure)
9. [Tech Stack](#9-tech-stack)
10. [Installation & Setup](#10-installation--setup)
11. [Demo Credentials](#11-demo-credentials)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Business Goal

CareTrack Clinic runs day-to-day patient care across four staff roles — administrators, clinicians, receptionists, and doctors — who previously coordinated patient records, diagnoses, and doctor schedules through disconnected spreadsheets and paper charts. MRMS replaces that with a single web dashboard that each role can use for the slice of clinical data relevant to their job, backed by a persistent MongoDB database as the clinic's single source of truth.

The system is built around three concrete operational problems:

| Problem | How MRMS addresses it |
|---|---|
| **Staff see data they shouldn't, or can't see data they need** | Role-based permissions are enforced on both the API (`allowRoles` middleware) and the UI (`can()` permission checks), so a receptionist can register patients but never sees diagnosis details, while a doctor only sees their own patient list (enforced with MongoDB queries scoped by `doctorId`, not just hidden in the UI). |
| **Unvetted medical terminology pollutes patient records** | New diagnoses that aren't in the clinic's disease catalog go through a request → admin-approval workflow before they become reusable catalog entries, keeping the catalog clinically accurate. |
| **No live operational picture for managers, and no durable record between sessions** | The dashboard aggregates patient counts, critical cases, active/resolved diagnoses, and a recent activity feed in real time, scoped automatically to the logged-in user's role — and because data now lives in MongoDB instead of in-process memory, none of it disappears when the server restarts. |

---

## 2. System Architecture

MRMS is a fully decoupled system: a stateless Express REST API, a MongoDB database, and a React single-page application that talks to the API exclusively over HTTP. Each layer can be redeployed independently.

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│   React 18 SPA (Vite dev server — port 5173)                 │
│   AuthContext (JWT) · apiClient (fetch + Bearer) · Router    │
└───────────────────────────┬──────────────────────────────────┘
                             │  /api/*  (proxied by Vite to :5000)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Express 5 REST API — port 5000                  │
│   app.js → global JWT gate → route modules → controllers     │
│   Resources: auth · doctors · patients · diseases ·          │
│              disease-catalog · disease-requests · dashboard  │
└───────────────────────────┬──────────────────────────────────┘
                             │  Mongoose models
                             ▼
┌─────────────────────────────────────────────────────────────┐
│            MongoDB — port 27017 (mrms_dashboard DB)           │
│   Collections: users · doctors · patients · diseases ·        │
│   diseasecatalogs · diseaserequests · activitylogs            │
└─────────────────────────────────────────────────────────────┘
```

### Why MongoDB + Mongoose

The backend originally used a plain JavaScript object held in process memory as its "database." That has been replaced with MongoDB, accessed through Mongoose models, while every API endpoint, request/response shape, validation rule, and business rule was kept **byte-for-byte identical** to the previous version — this was a pure persistence-layer swap, not a rewrite.

- **Persistent data** — patients, doctors, diagnoses, and the disease catalog now survive server restarts and crashes. Previously, every restart wiped the entire dataset.
- **Custom string IDs preserved** — every collection still uses the same `randomUUID()`-style string IDs as before (stored as Mongo's `_id`), so existing relationships (`doctorId`, `patientId`, `diagnosisId`, JWT payloads) needed zero changes.
- **Identical response shape** — a small serializer (`utils/serialize.js`) strips Mongoose's internal `_id`/`__v` fields and re-exposes the same `id` field the frontend has always consumed. The frontend required no changes.
- **Isolated persistence layer** — only the controllers and the `models/` directory know about Mongoose; routes, middleware, and the React app are completely unaware that the storage engine changed.

### ES Modules

The backend declares `"type": "module"` so all backend code uses native `import`/`export`, matching the frontend's module style.

---

## 3. Data Model (MongoDB / Mongoose)

Every Mongoose schema overrides the default ObjectId `_id` with a `String` populated via `randomUUID()`, so IDs look and behave exactly as they did in the old in-memory store (e.g. `"c28d9712-ab42-4bd9-81d1-2b79ef60a79a"`), not Mongo's default 24-char hex ObjectId.

| Model (`backend/models/`) | Key fields | Notes |
|---|---|---|
| `User.js` | `_id, username (unique), password (bcrypt hash), role, doctorId` | One `users` document is created automatically for every doctor that's given a username/password. |
| `Doctor.js` | `_id, name, specialization, email, phone, department, status, joinDate, patients, username, createdBy/At, updatedBy/At` | `username` links to a `User` document with role `doctor`. |
| `Patient.js` | `_id, name, dob, gender, blood, email, phone, address, condition, assignedDoctor, doctorId (indexed), status, admitDate, createdBy/At, updatedBy/At` | `doctorId` is indexed — it's the field used to scope every doctor's view of their own patients. |
| `Disease.js` | `_id, patient, patientId (indexed), doctor, code, name, category, severity, date, notes, status, diseaseRequestPending?, diseaseRequestStatus?, createdBy/At, updatedBy/At` | A patient's diagnosis record. The two `diseaseRequest*` fields are only present once a catalog request is raised against this diagnosis. |
| `DiseaseCatalog.js` | `_id, name (unique), icdCode, category, description, createdBy/At, updatedBy/At` | The clinic's master list of recognised conditions. |
| `DiseaseRequest.js` | `_id, requestedDiseaseName, requestedByDoctor, doctorName, diagnosisId, suggestedIcdCode?, suggestedCategory?, status (pending\|approved\|rejected), adminResponse, approvedBy?, rejectedBy?, createdAt, updatedAt` | Compound index on `{ status, createdAt }` to match the admin review query pattern. |
| `ActivityLog.js` | `_id, icon, color, text, detail, performedBy, timestamp` | Indexed on `{ performedBy, timestamp }`. Capped at 100 entries (oldest pruned on insert) — see below. |

### Persistence-layer helpers (`backend/utils/`, `backend/db/`)

| File | Purpose |
|---|---|
| `utils/serialize.js` | `toApi()` / `toApiList()` convert a lean Mongoose document into the original plain-object shape (`{ id, ...fields }`), dropping `_id`/`__v`. `escapeRegExp()` is used for safe case-insensitive name lookups (e.g. disease catalog duplicate checks). |
| `utils/activity.js` | `addActivity()` — inserts a new `ActivityLog` document, then prunes the oldest entries beyond 100, replicating the original `unshift()` + length-cap behaviour from the in-memory array. |
| `db/db.js` | `connectDB()` / `disconnectDB()` — Mongoose connection setup with pooling, connection-event logging, and graceful shutdown support. |
| `db/seed.js` | `seedInitialData()` — creates the three demo accounts (`admin`, `clinician`, `receptionist`) only if the `users` collection is empty, so restarting the server no longer re-seeds or duplicates data. |

---

## 4. Roles & Access Control

Four roles map to real clinic staff categories:

| Backend role token | Frontend display name | Typical staff |
|---|---|---|
| `administrator` | Admin | IT / clinic manager |
| `clinician` | Clinician | Nurse / clinical lead |
| `receptionist` | Receptionist | Front-desk staff |
| `doctor` | Doctor | Consulting physician |

Every protected route declares an `allowRoles(...roles)` middleware inline in its route file (`backend/routes/*.js`):

```js
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: `Access denied. Required roles: ${roles.join(', ')}.` });
  next();
};
```

The same matrix is mirrored on the frontend in `frontend-react/src/utils/permissions.js`, where a `can(module, action, role)` helper hides Create/Edit/Delete controls the user isn't allowed to use. This is defence-in-depth: the UI hides actions for clarity, but the API is the actual enforcement point.

### Doctor-scoped data

A logged-in `doctor` only ever sees their own patients and the diagnoses tied to those patients. This is enforced with MongoDB queries filtered by `doctorId`/`patientId` directly in `patientController.js` and `diseaseController.js` — not just hidden in the UI.

---

## 5. Authentication

```
Client                                Express API                    MongoDB
  │  POST /api/auth/login                │                              │
  │  { username, password } ────────────►│                              │
  │                                       │ 1. User.findOne({ username })──►│
  │                                       │◄─────────────────────────────│
  │                                       │ 2. bcrypt.compare(password, hash)
  │                                       │ 3. jwt.sign({ id, username, role, doctorId }, secret, 8h)
  │                                       │ 4. addActivity() ──────────►│
  │◄── { token, role, username, doctorId }│                              │
  │                                       │                              │
  │  GET /api/patients                    │                              │
  │  Authorization: Bearer <token> ──────►│                              │
  │                                       │ 5. global middleware verifies JWT
  │                                       │ 6. req.user = decoded payload
  │                                       │ 7. allowRoles(...) checks req.user.role
  │                                       │ 8. Patient.find(filter) ───►│
  │◄── 200 { success, message, data } ────│                              │
```

- **Password hashing** — `bcryptjs`, 10 salt rounds. Plaintext passwords never persist beyond the request body.
- **Token expiry — 8 hours**, matching a clinic shift; no manual logout required at shift end.
- **Stateless JWT** — the server holds no session state, so the API can scale horizontally. MongoDB is the only stateful component.
- **Global gate (`app.js`)** — one middleware runs before every `/api/*` route. `POST /api/auth/login` is the only path that bypasses it. A missing/invalid `Authorization: Bearer <token>` header returns `401` before any controller (or database query) runs.

On the frontend, `AuthContext.jsx` stores `token`, `userRole`, `username`, and (for doctor accounts) `doctorId` in `localStorage`, rehydrates on page reload, and clears state + redirects to `/login` whenever the API returns `401`.

---

## 6. API Endpoint Reference

All endpoints return `{ success: boolean, message: string, data: ... }`. Except for `POST /api/auth/login`, every endpoint requires `Authorization: Bearer <token>`. Missing/invalid tokens return **401**; a valid token with an insufficient role returns **403**. This contract is unchanged from before the MongoDB migration.

### Authentication — `/api/auth`

| Method | Endpoint | Roles | Request body | Response `data` |
|---|---|---|---|---|
| POST | `/login` | Public | `{ username, password }` | `{ token, role, username, doctorId }` |
| POST | `/logout` | All | — | `null` (stateless — client discards the token) |

### Dashboard — `/api/dashboard`

| Method | Endpoint | Roles | Response `data` |
|---|---|---|---|
| GET | `/stats` | All | `{ totalDoctors, activeDoctors, totalPatients, criticalPatients, patientsByStatus, totalDiseases, activeDiseases, resolvedDiseases, severeDiseases, pendingDiseaseRequests, recentActivity[] }` |

`pendingDiseaseRequests` is only populated for `administrator`; for a `doctor`, every count above is automatically scoped to that doctor's own patients/diagnoses/activity via MongoDB queries.

### Doctors — `/api/doctors`

| Method | Endpoint | Roles | Request body | Notes |
|---|---|---|---|---|
| GET | `/` | All | — | Optional `?search=` filters by name/specialization/department |
| GET | `/:id` | All | — | 404 if not found |
| POST | `/` | Admin | `{ name, specialization, email, department, phone?, status?, joinDate?, username?, password? }` | `name/specialization/email/department` required. Supplying `username` + `password` also creates a linked `users` document with role `doctor` |
| PUT | `/:id` | Admin | Any subset of the create fields | Partial update — omitted fields keep their existing value |
| DELETE | `/:id` | Admin | — | Also deletes the linked `doctor`-role user account, if any |

### Patients — `/api/patients`

| Method | Endpoint | Roles | Request body | Notes |
|---|---|---|---|---|
| GET | `/` | All | — | `doctor` role is auto-scoped to their own patients; optional `?search=`, `?doctorId=` |
| GET | `/:id` | All | — | Returns patient + nested `doctor` object + `diseases[]`. A `doctor` requesting another doctor's patient gets **403** |
| POST | `/` | Admin, Clinician, Receptionist | `{ name, gender, dob?, blood?, email?, phone?, address?, condition?, doctorId?, status?, admitDate? }` | `name`/`gender` required |
| PUT | `/:id` | Admin, Clinician, Doctor | Any subset of create fields | A `doctor` updating a patient outside their assignment gets **403** |
| DELETE | `/:id` | Admin | — | |

### Diagnoses (Disease Records) — `/api/diseases`

| Method | Endpoint | Roles | Request body | Notes |
|---|---|---|---|---|
| GET | `/` | Admin, Clinician, Doctor | — | `doctor` auto-scoped to diagnoses of their own patients; optional `?search=`, `?severity=`, `?category=`, `?patientId=` |
| GET | `/:id` | Admin, Clinician, Doctor | — | |
| POST | `/` | Admin, Clinician, Doctor | `{ name, category, severity, patient?, patientId?, doctor?, code?, date?, notes?, status?, isNewDiseaseRequest?, requestedDiseaseName? }` | `name/category/severity` required. If `isNewDiseaseRequest` is `true` and `requestedDiseaseName` is given, a matching entry is also created in `diseaseRequests` (status `pending`) |
| PUT | `/:id` | Admin, Clinician, Doctor | Any subset of create fields | |
| DELETE | `/:id` | Admin | — | |

### Disease Catalog (Master List) — `/api/disease-catalog`

| Method | Endpoint | Roles | Request body | Notes |
|---|---|---|---|---|
| GET | `/` | Admin, Clinician, Doctor | — | Optional `?search=`, `?category=` |
| GET | `/:id` | Admin, Clinician, Doctor | — | |
| POST | `/` | Admin | `{ name, icdCode?, category?, description? }` | `name` required and must be unique (case-insensitive) |
| PUT | `/:id` | Admin | Any subset of create fields | Rejects rename to a name already used by another entry |
| DELETE | `/:id` | Admin | — | |

### Disease Requests (Catalog Governance) — `/api/disease-requests`

| Method | Endpoint | Roles | Request body | Notes |
|---|---|---|---|---|
| GET | `/` | Admin | — | Optional `?status=pending\|approved\|rejected`; sorted newest first |
| POST | `/` | Admin, Clinician, Doctor | `{ requestedDiseaseName, diagnosisId?, doctorName? }` | Creates a `pending` request |
| PUT | `/:id/approve` | Admin | `{ adminResponse?, addToCatalog? (default true), icdCode?, category?, description? }` | Marks request `approved`; unless `addToCatalog` is explicitly `false`, also inserts the disease into `diseasesCatalog` (skipped if a same-named entry already exists). Updates the linked diagnosis's `diseaseRequestStatus` |
| PUT | `/:id/reject` | Admin | `{ adminResponse? }` | Marks request `rejected`; updates the linked diagnosis's `diseaseRequestStatus` |

Both approve/reject return **400** if the request isn't currently `pending` (prevents double-processing).

---

## 7. Key Workflows

### 7.1 Standard CRUD + live filtering (Doctors, Patients, Diagnoses)

1. **Load** — page mounts → `useApi` calls `GET /api/<resource>` → controller runs a Mongoose `.find()` (with role-based filters where relevant) → result stored in local React state.
2. **Filter** — a search input filters the already-loaded array client-side on every keystroke; no extra API calls. Free-text search is matched in the controller, not in MongoDB, to preserve the exact substring/case-insensitive semantics the app always had.
3. **Create** — modal form → `POST /api/<resource>` → `Model.create(...)` → new record returned and appended to local state, toast shown.
4. **Update** — edit modal pre-filled → `PUT /api/<resource>/:id` → controller merges the existing document with the incoming fields (same fallback rules as before: `field?.trim() || existing.field`) → `findByIdAndUpdate(..., { returnDocument: 'after' })`.
5. **Delete** — confirm modal → `DELETE /api/<resource>/:id` → `findByIdAndDelete(...)` → record removed from local state.

Every mutating action is gated client-side by `can(module, action, role)` before the control is even rendered, in addition to the server-side `allowRoles` check.

### 7.2 Disease catalog governance

```
CLINICIAN / DOCTOR                          ADMINISTRATOR
  encounters an unlisted condition
  POST /api/disease-requests  ────────────►  saved as status: 'pending'
                                              GET /api/disease-requests (admin reviews)
                                              PUT /api/disease-requests/:id/approve
                                                → entry added to diseasesCatalog
                                              PUT /api/disease-requests/:id/reject
                                                → request marked rejected, optional reason
```

This prevents unvetted or misspelled conditions from entering the shared catalog: only an Administrator can promote a request into `diseasesCatalog`, while Clinicians and Doctors can flag a gap without needing a manual IT change. Approving or rejecting a request also updates the originating diagnosis's `diseaseRequestStatus` field in MongoDB.

### 7.3 Activity feed (capped collection behaviour)

Every mutating action calls `addActivity()`, which inserts one `ActivityLog` document and then deletes the oldest entries once the collection passes 100 documents — reproducing the original in-memory array's `unshift()` + 100-item cap without needing MongoDB's native capped collections.

---

## 8. Folder Structure

```
mrms-dashboard/
├── backend/                          # Express 5 REST API
│   ├── server.js                     # Entry point — connects to MongoDB, seeds demo data, then listens
│   ├── app.js                        # CORS, global JWT gate, route mounting
│   ├── .env                          # JWT_SECRET, PORT, FRONTEND_ORIGIN, MONGODB_URI
│   ├── db/
│   │   ├── db.js                     # Mongoose connectDB()/disconnectDB() — pooling, event logging, graceful shutdown
│   │   └── seed.js                   # One-time demo user seeding (idempotent)
│   ├── models/                       # Mongoose schemas (one per collection)
│   │   ├── User.js
│   │   ├── Doctor.js
│   │   ├── Patient.js
│   │   ├── Disease.js
│   │   ├── DiseaseCatalog.js
│   │   ├── DiseaseRequest.js
│   │   └── ActivityLog.js
│   ├── utils/
│   │   ├── serialize.js              # toApi()/toApiList()/escapeRegExp() — Mongo doc ↔ API shape
│   │   └── activity.js               # addActivity() — capped activity log writer
│   ├── controllers/                  # Business logic per resource (Mongoose-backed)
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── doctorController.js
│   │   ├── patientController.js
│   │   ├── diseaseController.js
│   │   ├── diseaseCatalogController.js
│   │   └── diseaseRequestController.js
│   └── routes/                       # Route + role-gate declarations
│       ├── authRoutes.js
│       ├── dashboardRoutes.js
│       ├── doctorRoutes.js
│       ├── patientRoutes.js
│       ├── diseaseRoutes.js
│       ├── diseaseCatalogRoutes.js
│       └── diseaseRequestRoutes.js
│
└── frontend-react/                   # React 18 + Vite 5 SPA (unchanged by the MongoDB migration)
    ├── vite.config.js                 # Dev server + /api proxy to :5000
    └── src/
        ├── App.jsx                   # Routes, ProtectedRoute, lazy imports
        ├── contexts/                  # AuthContext (JWT), ToastContext
        ├── hooks/                     # useApi, usePermissions, useCountUp
        ├── services/apiClient.js      # fetch wrapper, attaches Bearer token
        ├── utils/                     # permissions.js (ROLE_MAP, can()), formatters.js
        ├── components/                # layout/ (Sidebar, Topbar) + common/ (Modal, etc.)
        └── pages/                     # Login, Dashboard, Doctors, Patients,
                                        # PatientProfile, Diagnoses, Diseases, 403/404
```

---

## 9. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI components, state, Virtual DOM |
| React Router DOM | 6.24 | Client-side routing, protected routes |
| Vite | 5.3 | Dev server (HMR), production bundler |
| `@vitejs/plugin-react` | 4.3 | Fast Refresh integration |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 22+ | Runtime |
| Express | 5.2 | HTTP framework, routing, middleware |
| **MongoDB** | 7.x | Persistent document store |
| **Mongoose** | 9.x | Schema definitions, validation, query API for MongoDB |
| `jsonwebtoken` | 9.0 | JWT sign/verify, 8h expiry |
| `bcryptjs` | 3.0 | Password hashing, 10 salt rounds |
| `cors` | 2.8 | CORS headers for the frontend origin |
| `dotenv` | 17.x | Loads `JWT_SECRET`, `PORT`, `FRONTEND_ORIGIN`, `MONGODB_URI` |
| Nodemon | 3.1 | Auto-restart backend on file changes (dev) |

---

## 10. Installation & Setup

### Prerequisites

- Node.js v22+ (`node --version`)
- npm v10+ (`npm --version`)
- **A running MongoDB instance** (local install, or Docker — see below)
- Two terminals (one per process)

### Step 1 — Start MongoDB

Pick one:

**Docker (recommended for local dev):**

```bash
docker run -d --name mrms-mongo -p 27017:27017 \
  --restart unless-stopped -v mrms-mongo-data:/data/db mongo:7
```

**Local MongoDB install:** start your system's `mongod` service so it's listening on `127.0.0.1:27017`.

**MongoDB Atlas (cloud):** create a free cluster and use its connection string instead of the local one in Step 2.

### Step 2 — Configure the Backend

```bash
cd backend
```

Verify `.env` contains:

```env
PORT=5000
JWT_SECRET=your_super_secret_key_change_this_in_production
FRONTEND_ORIGIN=http://127.0.0.1:5500
MONGODB_URI=mongodb://127.0.0.1:27017/mrms_dashboard
```

> Replace `JWT_SECRET` with a long random string before any shared use — it signs every issued token. If you're using Atlas, replace `MONGODB_URI` with your cluster's connection string.

```bash
npm install
npm run dev
```

On first boot you should see:

```
[MongoDB] connected: 127.0.0.1/mrms_dashboard
[MongoDB] seeded demo users (admin, clinician, receptionist).

  MRMS API running on http://localhost:5000
  ...
```

The "seeded demo users" line only appears once — subsequent restarts skip it because the data already exists in MongoDB.

### Step 3 — Frontend

```bash
cd frontend-react
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies all `/api/*` requests to `http://localhost:5000`, so no manual CORS configuration is needed in development.

### Production build (frontend)

```bash
cd frontend-react
npm run build
```

Output goes to `frontend-react/dist/`; serve it with any static host or via Express static middleware.

---

## 11. Demo Credentials

| Username | Password | Role | Key permissions |
|---|---|---|---|
| `admin` | `admin123` | Administrator | Full CRUD on all resources, catalog governance, disease request approval |
| `clinician` | `clinic123` | Clinician | View doctors; edit patients; view/create diagnoses; submit disease requests |
| `receptionist` | `recept123` | Receptionist | View doctors/patients; register new patients; no access to diagnoses or the catalog |

These three accounts are created automatically by `db/seed.js` the first time the backend connects to an empty database. A fourth role, `doctor`, exists in the permission system but has no pre-seeded account — create a doctor record (with a username/password) from the Admin account to generate one.

---

## 12. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` on `npm run dev` | No MongoDB instance is running, or `MONGODB_URI` points somewhere unreachable | Start MongoDB (see [Step 1](#step-1--start-mongodb)) before starting the backend |
| `node_modules/.bin/<tool>: ... No such file or directory` (e.g. for `nodemon` or `vite`) | `node_modules/.bin` entries are supposed to be symlinks; if `node_modules` was copied/zipped/synced through a tool that doesn't preserve symlinks, they become plain text files containing the link target as a string, which the shell then tries to execute | Delete and reinstall: `rm -rf node_modules && npm install` (in whichever of `backend/` or `frontend-react/` is affected) |
| Login works but data resets after restarting the backend | You're hitting a fresh/empty database, or `MONGODB_URI` changed between restarts | Confirm `MONGODB_URI` is stable and the same MongoDB volume/container is reused — data only persists within the same database |
| `401 Invalid or expired token` after ~8 hours | Expected — JWTs expire after 8 hours to match a clinic shift | Log in again |

---

*MRMS — Built for CareTrack Clinic | BTEC Level 3 Unit 25 Full Stack Development*
