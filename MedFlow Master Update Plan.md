# MedFlow Phase 9: Comprehensive Architecture, Clinical Tools, Revenue & Optimization Plan

Please review the workspace and implement the following updates across the Django backend and React frontend.

---

## 1. Global UX, Currency & Dark Theme Fixes

* **Comprehensive Dark Theme Audit**: Ensure 100% dark mode consistency across all three user profile roles (Patient Dashboard, Doctor Dashboard, and Admin Panel). Backgrounds, typography, modal dialogs, cards, forms, and navigation sidebars must switch seamlessly between Light and Dark themes.
* **Currency Standardisation (USD $ to INR ₹)**: Replace all dollar (`$`) symbols across the platform with Indian Rupees (`₹`), including pricing cards, checkout calculations, doctor earnings metrics, payout tables, and invoice summaries.

---

## 2. Authentication, Security & Verification (OTP & CAPTCHA)

* **Account Creation CAPTCHA**: Add bot-protection CAPTCHA verification (e.g., Google reCAPTCHA / Cloudflare Turnstile) to the registration form.
* **Dual OTP Verification System (Mobile & Email)**:
  * **New Account Signup**: Require OTP verification sent to both mobile number (SMS) and email address before activating a new account.
  * **Profile Updates**: Trigger mandatory OTP verification whenever a patient or doctor updates their registered phone number or email address. Changes must only be saved once the new contact method is verified.

---

## 3. Redesigned Profile Management (Save & Reset State)

* **Intuitive Profile Layout**: Restructure patient and doctor profile pages into tabbed/card-based layouts for easy navigation (Personal Details, Emergency Contacts, Medical History, Verification & Security).
* **Explicit Save / Reset Control**:
  * Form inputs must remain in a draft state until explicitly saved.
  * Provide prominent **"Save Changes"** and **"Reset / Discard Changes"** buttons.
  * Clicking "Reset" clears uncommitted changes and restores all fields to their last saved state.
  * Display a confirmation prompt if a user attempts to navigate away with unsaved edits.

---

## 4. Feasible Revenue Model & Financial Structure

* **Platform Convenience Fee**: Standard **₹15 Platform Fee** added to every appointment checkout to cover cloud platform maintenance and processing.
* **Doctor Consultation Revenue Split**: Configurable platform commission (e.g., 10%–15% fee cut) deducted from the doctor's base consultation rate.
* **Transparent Checkout Breakdown**:
  * Consultation Fee: `₹X`
  * Platform Convenience Fee: `₹15`
  * Total Payable by Patient: `₹(X + 15)`
  * Doctor Net Earnings: `₹(X - Commission)`
* **Admin Revenue Dashboard**:
  * Tracks total platform income split into Platform Fees (₹15 count) and Commission Revenue.
  * Provides earnings breakdowns, payout requests, and downloadable CSV/PDF financial summaries.

---

## 5. Care Continuity, Doctor Switching & Mutual Ratings

* **Doctor-Patient Continuity Engine**:
  * When a patient books a follow-up consultation for an ongoing condition or specialty, the system defaults to their previously assigned doctor to ensure care continuity.
* **Restricted Doctor Switching Safeguards**:
  * A patient cannot switch to a different doctor for an existing condition unless they complete a **Doctor Rating / Feedback** form OR file an explicit **Issue Report / Grievance** detailing why they wish to change providers.
* **Mutual 2-Way Rating System**:
  * **Patient -> Doctor Rating**: Star rating (1–5), consultation quality, wait-time score, and written feedback.
  * **Doctor -> Patient Rating**: Ratings on patient cooperation, appointment punctuality, and medical record completeness (visible internally to medical staff).

---

## 6. Patient Care, Clinical Tools & Health Vault

* **Encrypted Health Vault & File Sharing**:
  * Secure storage portal for patients to upload past lab reports, blood test results, and imaging files.
  * Includes a **One-Tap Share** toggle to grant temporary **24-hour access** to a consulting doctor upon booking.
* **Automated Medication & Dosage Reminders**:
  * Auto-extract dosage schedules from active digital prescriptions to send browser push notifications and SMS alerts.
  * **Notification Control Toggle Switch**: Include a clear, easily accessible Toggle Switch in both the Patient Notification Settings and the Reminder Banner to allow users to instantly enable or disable all automated medication reminders.

---

## 7. Doctor Practice Management & Clinical Operations

* **Rapid E-Prescription Builder**:
  * Instant dosage toolbar for doctors pre-populated with standard medicine names, intake frequency (e.g., 1-0-1), and food timing instructions.
  * Instant generation of downloadable PDF prescriptions linked to the patient record.
* **Tiered Follow-Up Discount Window**:
  * **Standard Follow-Up**: Automatic free/discounted follow-up window set to **4 days** for general consultations.
  * **Extended Follow-Up (Critical Care / Diagnostics)**: Follow-up window extends to **7 days** when flagged for critical care or when diagnostic lab tests are ordered.
* **Emergency Slot Overrides & Vacation Mode**:
  * Quick **"Vacation / Emergency Pause"** toggle on the doctor dashboard to temporarily freeze instant slot bookings for unscheduled breaks or emergency leaves without erasing their saved weekly availability template.

---

## 8. Urgent Care & Emergency SOS Escalation

* **Emergency SOS Consultation Shortcut**:
  * Prominent **"Urgent Consultation / SOS"** button on the patient dashboard.
  * Bypasses standard date/slot selection and immediately routes the request to currently active, online doctors for immediate response.

---

## 9. Appointment Booking, FCFS & Refund Policies

* **Sequential Date & Slot Picker**: Date selection must happen *before* time slot selection. Time slots update dynamically based on the selected date.
* **Family Member Booking Checkbox**:
  * Add a toggle/checkbox: *"Booking for a family member?"*
  * Revealing fields for dependent details (Full Name, Age, Gender, Relationship, Medical Notes).
* **First-Come, First-Served (FCFS) Locking**:
  * Backend lock mechanism (Redis / DB row lock) to hold a slot temporarily during checkout and prevent concurrent double-booking.
* **Cancellation & Refund Policy Handler**:
  * **Patient Cancellation**: Eligible up to **1 hour prior** to appointment slot time for a **50% refund** (Platform fee non-refundable). Cancellations within 1 hour yield 0% refund.
  * **Doctor Cancellation**: Triggers an automatic **100% full refund** to the patient regardless of timing.

---

## 10. Doctor Dashboard & Availability Manager

* **Schedule Management**: Interface for doctors to define weekly availability windows and custom time slots.
* **1-Hour Slot Editing Lockdown**: Block doctors from creating, editing, or deleting time slots within **1 hour** of the slot start time.
* **Earnings Dashboard**: Track net revenue in ₹, completed sessions, pending payouts, and detailed patient transaction history.

---

## 11. Real-Time Consultation Chat Room

* **1-on-1 Consultation Chat**: Secure WebSocket (Django Channels) chat room between doctor and patient.
* **Access Control**: Active only during and shortly around the scheduled appointment duration.

---

## 12. Performance Optimization & Reliability

* **Frontend Code-Splitting**: Wrap major routes (Dashboards, Booking, Profiles, Chat) in `React.lazy` and `Suspense` for fast initial loads.
* **Database & Query Optimization**: Use `select_related` and `prefetch_related` in Django views to eliminate N+1 queries. Index high-frequency fields (`user_id`, `doctor_id`, `slot_time`, `date`).

---

## 13. Codebase Cleanup & File Pruning

* **Remove Redundant Files**: Audit and clean up dead code, unused CSS/JS assets, obsolete test scripts, and temporary log files (e.g., `*.log`, leftover migration files).

---

## Implementation Roadmap
1. **Schema & Auth Updates**: OTP model (SMS/Email), Mutual Ratings, Doctor Continuity mapping, Health Vault model, and CAPTCHA logic.
2. **Revenue, Refund & Follow-Up Engine**: ₹15 fee split, FCFS locks, 50%/100% refund automation, and 4-day/7-day follow-up logic.
3. **Clinical & Doctor Tools**: Rapid E-Prescription builder, Vacation Mode toggle, Health Vault 24h temporary access, and Notification Toggle Switch.
4. **Emergency SOS & Chat**: Rapid SOS dispatch route and WebSocket 1-on-1 chat room.
5. **Profile & Navigation Redesign**: Tabbed profile layout with Save/Reset state management and OTP change verification.
6. **Code Cleanup**: Remove dead files and apply DB query optimizations.