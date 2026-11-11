# MEDFLOW — Real-Time Doctor Matching & Digital Prescription Management System

MEDFLOW is an enterprise-grade medical workflow platform designed for non-critical care. It eliminates patient queue uncertainty through dynamic triage scoring, prevents double-booking via database-level concurrency locks, manages digital prescriptions with cryptographic integrity stamps and amendment histories, and centralizes patient longitudinal health records under strict role-based access controls.

---

## 1. System Architecture

```text
[ React Frontend SPA (Tailwind CSS, Lucide Icons) ]
                         |
           (HTTPS / REST APIs / Polling)
                         |
           [ Nginx Reverse Proxy / SSL Termination ]
                         |
       +-----------------+-----------------+
       |                                   |
[ /static/, /media/ ]             [ Django Gunicorn WSGI ]
(Direct Disk Serving)             (Port 8000)
                                           |
                         +-----------------+-----------------+
                         |                                   |
                 [ PostgreSQL 16+ ]                    [ Redis 7+ ]
                 (Atomic Transactions,                 (Queue Sync &
                  ROW-LEVEL LOCKS)                      Token Blacklist)
```

---

## 2. Core Capabilities Matrix

| Domain | Feature | Technical Implementation |
| :--- | :--- | :--- |
| **Matching Engine** | Real-time Doctor Routing | Dynamic ranking: $\text{Score} = (100 \times \text{SpecialtyMatch}) + (30 \times \text{Availability}) + (2 \times \text{Experience}) - (5 \times \text{QueueSize})$. Excludes unverified or inactive doctors. |
| **Concurrency** | Atomic Double-Booking Safeguard | `transaction.atomic()` with `select_for_update()` on doctor queues and database-enforced unique constraints (`patient`, `doctor`, `scheduled_date`, `status in active`). |
| **Real-Time Queue** | Dynamic Velocity Tracker | Calculates sequential position, remaining queue depth, and dynamic wait times based on historical consultation durations. Synchronized via REST polling. |
| **Prescriptions** | Digital Rx Editor & PDF Export | Multi-item drug dosing manager, structured instructions, SHA-256 digital verification stamps, and PDF generation via ReportLab. |
| **Audit Trails** | Immutable Amendment Logs | Finalized prescriptions cannot be modified. Amendments trigger snapshots with mandatory clinical justification reasons. |
| **Access Control** | Server-Side RBAC | Granular permission classes (`IsPatient`, `IsDoctor`, `IsAdmin`). Doctors cannot access unrelated patient records. |
| **Workload Analytics**| Queue Velocity & Throughput | Administrative throughput reporting, wait-time averages, capacity utilization rates, and doctor performance metrics. |
| **Resilience** | Offline Fallback & Auto-Draft | Browser offline detection banner with automatic `localStorage` draft saving for clinical consultation notes. |

---

## 3. Technology Stack

- **Backend:** Python 3.12+ / 3.15+, Django 5.1+, Django REST Framework, SimpleJWT, ReportLab, Psycopg 3.
- **Frontend:** React 19, React Router v6, Axios, Tailwind CSS, Lucide React.
- **Database:** PostgreSQL 16 / 18 with ACID transactions and row-level locking.
- **Cache & Layers:** Redis 7 (channel layers, session storage, JWT blacklist).
- **Production Server:** Gunicorn 23 / Uvicorn ASGI, Nginx reverse proxy with SSL termination.

---

## 4. Demo Credentials

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@medflow.demo` | `Admin@1234` | Full access: Doctor credential verification, user directory, system-wide workload analytics. |
| **Doctor** | `dr.sharma@medflow.demo` | `Doctor@1234` | General Physician: Queue management, availability switcher, active consultation workspace, Rx generation. |
| **Doctor** | `dr.patel@medflow.demo` | `Doctor@1234` | Cardiologist: Specialized triage queue and prescription workflow. |
| **Doctor** | `dr.iyer@medflow.demo` | `Doctor@1234` | Dermatologist: Specialized dermatology queue. |
| **Patient** | `alice@medflow.demo` | `Patient@1234` | Patient dashboard: Smart matching wizard, live queue tracker, prescription history, medical records. |
| **Patient** | `bob@medflow.demo` | `Patient@1234` | Patient dashboard: Secondary test patient account. |

---

## 5. Local Development Quickstart

### Prerequisites
- Python 3.12+ (or 3.15)
- Node.js LTS (v20+)
- PostgreSQL 16+ running locally on port 5432

### Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python seed_demo_data.py
python manage.py runserver 127.0.0.1:8000
```

### Frontend Setup
```powershell
cd frontend
npm install --legacy-peer-deps
npm start
```

---

## 6. Automated QA Test Suite (Phase 6)

Execute all 13 automated security, concurrency, and performance tests:

```powershell
cd backend
.\venv\Scripts\python.exe manage.py test tests --verbosity=2
```

### Verified Test Cases:
1. `test_unauthenticated_requests_are_denied`: Validates HTTP 401 across 9 protected REST endpoints.
2. `test_patient_cannot_access_doctor_or_admin_endpoints`: Enforces HTTP 403 on role boundary breaches.
3. `test_doctor_cannot_access_patient_or_admin_endpoints`: Verifies doctor isolation from administrative APIs.
4. `test_doctor_cannot_access_unassigned_patient_records`: Prevents unauthorized cross-patient data access.
5. `test_admin_has_proper_access`: Validates administrative moderation access.
6. `test_double_booking_prevention`: Ensures same-day active booking conflicts return HTTP 400.
7. `test_atomic_queue_ordering_and_max_capacity`: Tests sequential queue index and capacity bounds.
8. `test_unverified_doctor_booking_rejected`: Blocks unverified doctor listings from taking patients.
9. `test_paused_doctor_booking_rejected`: Rejects appointments when doctor is not accepting patients.
10. `test_lifecycle_and_queue_tracker`: Tests wait times, calling patients, and consultation completion.
11. `test_prescription_lifecycle_and_amendment_audit`: Tests multi-item Rx creation, PDF export, and amendment snapshots.
12. `test_matching_algorithm_latency`: Verifies matching engine throughput latency (<200ms).
13. `test_analytics_latency`: Verifies queue analytics calculation latency (<200ms).

---

## 7. Production Deployment Runbook

### Option A: Docker Compose Deployment

1. Configure environment variables in `backend/.env.production`:
```bash
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production
```

2. Build and launch production containers:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

3. Execute database migrations and seed data in production container:
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml exec backend python seed_demo_data.py
```

---

### Option B: Bare-Metal Linux (Ubuntu 22.04 / 24.04 LTS)

#### 1. System Package Setup
```bash
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv postgresql postgresql-contrib nginx certbot python3-certbot-nginx
```

#### 2. Database Provisioning
```bash
sudo -u postgres psql -c "CREATE USER medflow_prod_user WITH PASSWORD 'SecureProductionPassword123!';"
sudo -u postgres psql -c "CREATE DATABASE medflow_prod_db OWNER medflow_prod_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE medflow_prod_db TO medflow_prod_user;"
```

#### 3. Backend Deployment
```bash
sudo mkdir -p /var/www/medflow/backend
sudo cp -r backend/* /var/www/medflow/backend/
cd /var/www/medflow/backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python manage.py migrate
./venv/bin/python manage.py collectstatic --noinput
sudo chown -R www-data:www-data /var/www/medflow/backend
```

#### 4. Systemd Service Activation
```bash
sudo cp deploy/medflow-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now medflow-backend
```

#### 5. Frontend Production Build & Nginx
```bash
cd frontend
npm ci --legacy-peer-deps
npm run build
sudo mkdir -p /var/www/medflow/frontend
sudo cp -r build/* /var/www/medflow/frontend/build/
sudo cp nginx/medflow.conf /etc/nginx/sites-available/medflow.conf
sudo ln -s /etc/nginx/sites-available/medflow.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. HTTPS & SSL Certificate (Let's Encrypt)
```bash
sudo certbot --nginx -d api.medflow.com -d app.medflow.com
```

---

## 8. REST API Reference

### Authentication (`/api/auth/`)
- `POST /api/auth/register/patient/`: Registers a new patient user and profile.
- `POST /api/auth/register/doctor/`: Registers a doctor (queued for admin verification).
- `POST /api/auth/login/`: Issues JWT access and refresh tokens.
- `POST /api/auth/token/refresh/`: Rotates JWT refresh token and issues new access token.
- `POST /api/auth/logout/`: Blacklists active refresh token.
- `GET  /api/auth/me/`: Returns authenticated user context and role.
- `PATCH /api/auth/doctor/availability/`: Updates availability (`available`, `busy`, `offline`, `is_accepting_patients`).

### Admin Moderation (`/api/auth/admin/`)
- `GET  /api/auth/admin/users/`: Paginated user directory with role and status filtering.
- `GET  /api/auth/admin/doctors/`: Doctor directory showing verification status and license numbers.
- `POST /api/auth/admin/doctors/{id}/verify/`: Approves doctor credentials and grants clinical privileges.
- `GET  /api/auth/admin/stats/`: Global platform telemetry (patient count, active doctors, total consultations).

### Doctor Matching & Appointments (`/api/appointments/`)
- `POST  /api/appointments/match/`: Evaluates symptoms, returns ranked eligible doctors with wait time estimates.
- `POST  /api/appointments/book/`: Atomically reserves next queue number for a doctor.
- `GET   /api/appointments/my/`: Patient appointment history and active queue positions.
- `GET   /api/appointments/doctor-queue/`: Doctor live patient queue for today.
- `PATCH /api/appointments/{id}/call-next/`: Calls patient into active consultation.
- `PATCH /api/appointments/{id}/complete/`: Marks consultation complete and records doctor summary notes.
- `GET   /api/appointments/{id}/queue-status/`: Polling endpoint returning queue position and estimated wait time.
- `GET   /api/appointments/analytics/`: Doctor velocity, average consultation duration, and queue depth.

### Digital Prescriptions (`/api/prescriptions/`)
- `POST  /api/prescriptions/`: Creates a draft prescription with multiple medication items.
- `POST  /api/prescriptions/{id}/finalize/`: Locks prescription, attaches SHA-256 digital stamp, creates Medical Record.
- `PATCH /api/prescriptions/{id}/`: Amends prescription, records historical snapshot and clinical reason.
- `GET   /api/prescriptions/{id}/pdf/`: Downloads signed ReportLab clinical prescription PDF.

### Centralized Medical Records (`/api/records/`)
- `GET /api/records/`: Role-filtered chronological clinical history with attached prescriptions.

### Notifications (`/api/notifications/`)
- `GET   /api/notifications/`: User notification stream.
- `PATCH /api/notifications/{id}/read/`: Marks notification read.
- `POST  /api/notifications/mark-all-read/`: Marks all user notifications read.
