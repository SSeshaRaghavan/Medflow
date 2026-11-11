# MedFlow - Master Architecture, Feature & Cleanup Specifications (`update.md`)

## 1. Project Overview & Environment Architecture
MedFlow is a full-stack digital healthcare suite supporting real-time doctor allocation, digital prescriptions, appointment scheduling, platform revenue management, and patient-doctor consultations.

* **Frontend**: React, Tailwind CSS, React Router, Lucide Icons
* **Backend**: Django, Django REST Framework (DRF), SimpleJWT, Django Channels (WebSockets)
* **Primary Currency**: Indian Rupees (₹)
* **Base URLs**:
  * Frontend: `http://localhost:3000`
  * Django API: `http://127.0.0.1:8000/api/`
  * Django Admin: `http://127.0.0.1:8000/admin/`

---

## 2. Codebase Refactoring & De-AI Branding Strategy

### File Cleanup & Audit
* Audit and remove all unused boilerplate files, dead components, duplicate CSS modules, and redundant assets across frontend and backend directories.
* Delete all AI-generated comments, block headers, and inline explanations.
* Inspect `index.html` and public assets to purge generator meta tags, powered-by strings, and default framework favicons.
* Modularize large single-file components into smaller, reusable components located in `src/components/`, `src/hooks/`, and `src/utils/`.

### Visual Styling & Humanized UI/UX
* Replace default Tailwind color tokens (`bg-indigo-600`, `bg-purple-500`, glowing gradient blobs) with dedicated HSL/Hex CSS variables for brand, background, surface, and text elements.
* Set typography across `index.html` and `tailwind.config.js` to *Plus Jakarta Sans* or *Outfit*.
* Replace uniform rounded corners (`rounded-3xl`) and heavy drop shadows (`shadow-2xl`) with subtle border styling (`border border-slate-200 dark:border-slate-800`) and refined radii (`rounded-lg`, `rounded-md`).
* Replace generic marketing copy and buzzwords ("Unleash", "Revolutionize", "Seamless") with direct medical context.
* Add custom hover, active, and focus states, alongside custom webkit scrollbar and text selection styles in `index.css`.

---

## 3. Core Feature Requirements & System Blueprint

### Theme Engine & Accessibility
* Implement dynamic Dark/Light theme switching respecting `prefers-color-scheme` and persisting to `localStorage`.
* Ensure complete theme coverage across all three user profiles: Patient, Doctor, and System Admin.

### Authentication & Identity Verification
* **Dual-Panel Auth**: Redesign Sign-In and Sign-Up pages with responsive split layouts and Social SSO placeholders (Google, Apple, Microsoft).
* **CAPTCHA Integration**: Add CAPTCHA verification widget to the registration form to prevent automated sign-ups.
* **Dual OTP Verification**: Enforce SMS and Email OTP validation during account registration and whenever a user updates their mobile number or email address.

### Profile Navigation & State Management
* Redesign user profiles with tabbed navigation for Personal Info, Security, Medical History, and Preferences.
* Implement explicit state controls: changes are staged locally until saved via a **Save Changes** button, with a **Reset / Discard** button to revert unsaved edits.

### Appointment Booking Engine
* **Date-First Selection Grid**: Require patients to select a consultation date prior to displaying available time slots.
* **Family Member Booking**: Add a checkbox during slot booking indicating whether the appointment is for a family member, expanding fields for family member details.
* **Concurrency Locking**: Implement First-Come, First-Served (FCFS) slot locking to prevent double bookings.
* **Cancellation & Refund Logic**:
  * Patient cancellation up to 1 hour prior to appointment: 50% refund.
  * Patient cancellation within 1 hour: 0% refund.
  * Doctor cancellation at any time: 100% refund.

### Doctor Availability & Management
* Create a dedicated availability page for doctors to configure recurring date and time slots.
* Enforce a 1-hour lockdown rule: doctors cannot edit or remove a slot within 1 hour of its scheduled time.
* Add a **Vacation Mode** toggle switch to temporarily pause new slot bookings without wiping configured weekly schedules.

### Monetization & Admin Analytics
* **Feasible Cost & Revenue Model**: Each booking applies a fixed **₹15 Platform Fee** alongside the doctor's consultation fee (with an optional percentage commission split).
* **Admin Platform Fee Portal**: Dedicated admin view calculating total platform revenue collected (sum of all ₹15 platform charges), complete with downloadable financial logs.
* **Doctor Earnings Dashboard**: Doctor view tracking total completed consultations, total earnings in Rupees (₹), and platform fee deductions.

### Care Continuity & Ratings System
* **Doctor Continuity Engine**: Patients booking follow-up consultations for ongoing health issues are automatically routed to their previously assigned doctor.
* **Doctor Switch Safeguard**: Patients can only switch to a different doctor for an ongoing issue by submitting a star rating or logging an explicit issue report regarding the prior consultation.
* **Mutual 2-Way Rating System**:
  * Patients can rate and review doctors after completed appointments.
  * Doctors can rate patient cooperation and profile reliability post-consultation.

### Clinical Tools & Patient Care
* **Rapid E-Prescription Builder**: Doctor interface with pre-populated medication names, standard dosages, and timing controls, auto-generating downloadable PDF prescriptions via `/api/prescriptions/<id>/download/`.
* **Health Vault & 24-Hour Access**: Encrypted patient document storage with a toggle button to generate a 24-hour temporary access token for consulting doctors.
* **Medication Reminders**: Automated dosage schedule alerts on the patient dashboard, accompanied by a Master On/Off Toggle Switch in user settings.
* **Custom Follow-Up Engine**: Automatic logic flagging follow-up visits within **4 days** as free/discounted for standard care, extended to **7 days** for critical care or diagnostic cases.
* **Emergency SOS Escalation**: Instant consultation trigger on the patient dashboard that bypasses standard slot selection to route directly to currently available active doctors.

### Real-Time Communication & Security
* **Doctor-Patient Chat Room**: Secure consultation chat connected via Django Channels (WebSockets) and protected by JWT authentication.
* **Route Protection**: Implement fallback component (`AccessDenied.jsx`) for 403 Forbidden and 404 Not Found navigation handling.

---

## 4. Performance & Database Optimization

* **Code-Splitting**: Apply `React.lazy()` and `Suspense` across secondary frontend routes (Earnings, Admin Dashboard, Health Vault).
* **Database Indexing**: Add database indexes on high-frequency query fields: `appointment_date`, `doctor_id`, `patient_id`, and `status`.
* **Debounce Handlers**: Wrap text inputs, search fields, and rating submissions in debounce functions to minimize API request overhead.