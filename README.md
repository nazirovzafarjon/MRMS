# MRMS — Medical Record Management System

> **Client:** CareTrack Clinic
> **Module:** BTEC Level 3 — Unit 25: Full Stack Development
> **Architecture:** Decoupled REST API (Express 5 + Node.js) ↔ SPA (React 18 + Vite 5)

![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT%208h-orange?style=flat-square&logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)

---

## Table of Contents

1. [Business Goal](#1-business-goal)
2. [System Architecture](#2-system-architecture)
3. [Data Model](#3-data-model)
4. [Roles & Access Control](#4-roles--access-control)
5. [Authentication](#5-authentication)
6. [API Endpoint Reference](#6-api-endpoint-reference)
7. [Key Workflows](#7-key-workflows)
8. [Folder Structure](#8-folder-structure)
9. [Tech Stack](#9-tech-stack)
10. [Installation & Setup](#10-installation--setup)
11. [Demo Credentials](#11-demo-credentials)

---

## 1. Business Goal

CareTrack Clinic runs day-to-day patient care across four staff roles — administrators, clinicians, receptionists, and doctors — who previously coordinated patient records, diagnoses, and doctor schedules through disconnected spreadsheets and paper charts. MRMS replaces that with a single web dashboard that each role can use for the slice of clinical data relevant to their job, while keeping a single source of truth for the clinic as a whole.

The system is built around three concrete operational problems:

| Problem | How MRMS addresses it |
|---|---|
| **Staff see data they shouldn't, or can't see data they need** | Role-based permissions are enforced on both the API (`allowRoles` middleware) and the UI (`can()` permission checks), so a receptionist can register patients but never sees diagnosis details, while a doctor only sees their own patient list. |
| **Unvetted medical terminology pollutes patient records** | New diagnoses that aren't in the clinic's disease catalog go through a request → admin-approval workflow before they become reusable catalog entries, keeping the catalog clinically accurate. |
| **No live operational picture for managers** | The dashboard aggregates patient counts, critical cases, active/resolved diagnoses, and a recent activity feed in real time, scoped automatically to the logged-in user's role. |

The product is intentionally scoped as a working prototype for evaluation and demonstration rather than a production deployment — see [Section 3](#3-data-model) for the trade-off this implies.

---

## 2. System Architecture

MRMS is a fully decoupled system: a stateless Express REST API and a React single-page application that talks to it exclusively over HTTP. Either side can be rebuilt or redeployed independently.

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                             │
│   React 18 SPA (Vite dev server — port 5173)                │
│   AuthContext (JWT) · apiClient (fetch + Bearer) · Router   │
└───────────────────────────┬───────────────────────────────-──┘
                             │  /api/*  (proxied by Vite to :5000)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Express 5 REST API — port 5000                 │
│   app.js → global JWT gate → route modules → controllers    │
│   Resources: auth · doctors · patients · diseases ·         │
│              disease-catalog · disease-requests · dashboard │
└───────────────────────────┬───────────────────────────────-──┘
                             ▼
                    In-memory data store (db.js)
        users[] doctors[] patients[] diseases[] diseasesCatalog[]
                  diseaseRequests[] activityLog[]
```

### Why an in-memory store

The backend uses a plain JavaScript object (`backend/db/db.js`) instead of a SQL/NoSQL database. This is deliberate for the current prototype stage:

- **Zero setup friction** — no database engine, connection string, or migration step; the API runs immediately after `npm install`.
- **Seeded on boot** — demo user accounts are created with `bcrypt.hashSync` at process start.
- **Isolated blast radius** — only the controller layer touches `db`, so swapping in MongoDB/PostgreSQL later only requires controller changes; routes, middleware, and the frontend are untouched.
- **Trade-off** — data does not survive a process restart. Acceptable for a clinical demo/prototype, not for production use.

### ES Modules

The backend declares `"type": "module"` so all backend code uses native `import`/`export`, matching the frontend's module style.

---

## 3. Data Model

All records are plain JS objects with a `randomUUID()` id, stored in the arrays below (`backend/db/db.js`).

| Collection | Key fields | Notes |
|---|---|---|
| `users` | `id, username, password (bcrypt hash), role, doctorId` | Seeded with one `admin`, one `clinician`, one `receptionist` account. `doctor` accounts are created when a doctor record is given a username/password. |
| `doctors` | `id, name, specialization, email, phone, department, status, joinDate, patients, username, createdBy/At, updatedBy/At` | `username` links the doctor record to a `users` entry with role `doctor`. |
| `patients` | `id, name, dob, gender, blood, email, phone, address, condition, assignedDoctor, doctorId, status, admitDate, createdBy/At, updatedBy/At` | `doctorId` scopes visibility for the `doctor` role. |
| `diseases` | `id, patient, patientId, doctor, code, name, category, severity, date, notes, status, diseaseRequestPending, createdBy/At, updatedBy/At` | A patient's diagnosis record. |
| `diseasesCatalog` | `id, name, icdCode, category, description, createdBy/At, updatedBy/At` | The clinic's master list of recognised conditions. |
| `diseaseRequests` | `id, requestedDiseaseName, requestedByDoctor, doctorName, diagnosisId, suggestedIcdCode, suggestedCategory, status (pending/approved/rejected), adminResponse, createdAt, updatedAt` | Governs how new conditions enter `diseasesCatalog`. |
| `activityLog` | `id, icon, color, text, detail, performedBy, timestamp` | Capped at 100 entries; feeds the dashboard's "recent activity" panel. |

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

A logged-in `doctor` only ever sees their own patients and the diagnoses tied to those patients — this is enforced server-side in `patientController.js` and `diseaseController.js` (filtering by `req.user.doctorId`), not just hidden in the UI.

---

## 5. Authentication

```
Client                                Express API
  │  POST /api/auth/login                │
  │  { username, password } ────────────►│
  │                                       │ 1. find user by username
  │                                       │ 2. bcrypt.compare(password, hash)
  │                                       │ 3. jwt.sign({ id, username, role, doctorId }, secret, 8h)
  │                                       │ 4. log activity
  │◄── { token, role, username, doctorId }│
  │                                       │
  │  GET /api/patients                    │
  │  Authorization: Bearer <token> ──────►│
  │                                       │ 5. global middleware verifies JWT
  │                                       │ 6. req.user = decoded payload
  │                                       │ 7. allowRoles(...) checks req.user.role
  │◄── 200 { success, message, data } ────│
```

- **Password hashing** — `bcryptjs`, 10 salt rounds. Plaintext passwords never persist beyond the request body.
- **Token expiry — 8 hours**, matching a clinic shift; no manual logout required at shift end.
- **Stateless JWT** — the server holds no session state, so the API can scale horizontally.
- **Global gate (`app.js`)** — one middleware runs before every `/api/*` route. `POST /api/auth/login` is the only path that bypasses it. A missing/invalid `Authorization: Bearer <token>` header returns `401` before any controller runs.

On the frontend, `AuthContext.jsx` stores `token`, `userRole`, `username`, and (for doctor accounts) `doctorId` in `localStorage`, rehydrates on page reload, and clears state + redirects to `/login` whenever the API returns `401`.

---

## 6. API Endpoint Reference

All endpoints return `{ success: boolean, message: string, data: ... }`. Except for `POST /api/auth/login`, every endpoint requires `Authorization: Bearer <token>`. Missing/invalid tokens return **401**; a valid token with an insufficient role returns **403**.

### Authentication — `/api/auth`

| Method | Endpoint | Roles | Request body | Response `data` |
|---|---|---|---|---|
| POST | `/login` | Public | `{ username, password }` | `{ token, role, username, doctorId }` |
| POST | `/logout` | All | — | `null` (stateless — client discards the token) |

### Dashboard — `/api/dashboard`

| Method | Endpoint | Roles | Response `data` |
|---|---|---|---|
| GET | `/stats` | All | `{ totalDoctors, activeDoctors, totalPatients, criticalPatients, patientsByStatus, totalDiseases, activeDiseases, resolvedDiseases, severeDiseases, pendingDiseaseRequests, recentActivity[] }` |

`pendingDiseaseRequests` is only populated for `administrator`; for a `doctor`, every count above is automatically scoped to that doctor's own patients/diagnoses/activity.

### Doctors — `/api/doctors`

| Method | Endpoint | Roles | Request body | Notes |
|---|---|---|---|---|
| GET | `/` | All | — | Optional `?search=` filters by name/specialization/department |
| GET | `/:id` | All | — | 404 if not found |
| POST | `/` | Admin | `{ name, specialization, email, department, phone?, status?, joinDate?, username?, password? }` | `name/specialization/email/department` required. Supplying `username` + `password` also creates a linked `users` row with role `doctor` |
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

1. **Load** — page mounts → `useApi` calls `GET /api/<resource>` → result stored in local state.
2. **Filter** — a search input filters the already-loaded array client-side on every keystroke; no extra API calls.
3. **Create** — modal form → `POST /api/<resource>` → new record appended to local state, toast shown.
4. **Update** — edit modal pre-filled → `PUT /api/<resource>/:id` → record replaced in place.
5. **Delete** — confirm modal → `DELETE /api/<resource>/:id` → record removed from local state.

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

This prevents unvetted or misspelled conditions from entering the shared catalog: only an Administrator can promote a request into `diseasesCatalog`, while Clinicians and Doctors can flag a gap without needing a manual IT change.

---

## 8. Folder Structure

```
mrms-dashboard/
├── backend/                          # Express 5 REST API
│   ├── server.js                     # Entry point — binds to PORT (default 5000)
│   ├── app.js                        # CORS, global JWT gate, route mounting
│   ├── .env                          # JWT_SECRET, PORT, FRONTEND_ORIGIN
│   ├── db/db.js                      # In-memory data store
│   ├── controllers/                  # Business logic per resource
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
└── frontend-react/                   # React 18 + Vite 5 SPA
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
| `jsonwebtoken` | 9.0 | JWT sign/verify, 8h expiry |
| `bcryptjs` | 3.0 | Password hashing, 10 salt rounds |
| `cors` | 2.8 | CORS headers for the frontend origin |
| `dotenv` | 17.x | Loads `JWT_SECRET`, `PORT`, `FRONTEND_ORIGIN` |
| Nodemon | 3.1 | Auto-restart backend on file changes (dev) |

---

## 10. Installation & Setup

### Prerequisites

- Node.js v22+ (`node --version`)
- npm v10+ (`npm --version`)
- Two terminals (one per process)

### Backend

```bash
cd backend
npm install
```

Verify `.env` contains:

```env
PORT=5000
JWT_SECRET=your_super_secret_key_change_this_in_production
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
```

> Replace `JWT_SECRET` with a long random string before any shared use — it signs every issued token.

```bash
npm run dev
```

### Frontend

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

A fourth role, `doctor`, exists in the permission system but has no pre-seeded account — create a doctor record (with a username/password) from the Admin account to generate one.

---

*MRMS — Built for CareTrack Clinic | BTEC Level 3 Unit 25 Full Stack Development*
