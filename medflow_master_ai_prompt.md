# MEDFLOW: Master AI Development Prompt

**Project Title:** Real-Time Doctor Matching and Digital Prescription Management System for Non-Critical Care.

**Role & Objective:**
Act as a senior full-stack software architect, healthcare technology product designer, database engineer, and security-focused developer. Build a complete, modern, responsive, and maintainable web application named MEDFLOW, prioritizing a reliable functional MVP over a static landing page.

## 1. Technology Stack & Coding Constraints
Build the application using the following modular monolith architecture:
*   **Frontend:** React, JavaScript, HTML, and CSS (with optional Tailwind CSS for styling).
*   **Backend:** Python and Django.
*   **Database:** Relational SQL database (PostgreSQL).
*   **Real-time Processing:** Django Channels or WebSocket integration for dynamic queue updates.
*   **Code Generation Rule:** You must strictly omit all code comments from generated programming outputs. Provide only raw, functional, and production-ready code.

## 2. Core Functional Requirements
The platform must support operations for Patients, Doctors, and Clinic Administrators to address unpredictable waiting times and inefficient manual allocation.
*   **Real-Time Doctor Matching Engine:** Route patients to doctors by evaluating hard eligibility rules (verified, appropriately qualified, accepting patients), followed by ranking based on specialty compatibility, current availability, queue efficiency, and location.
*   **Dynamic Queue Management:** Track queue numbers, calculate estimated wait times, and update statuses (e.g., Request Received, Waiting, In Consultation, Completed) using real-time synchronization.
*   **Doctor Workspace:** Provide an interface to manage availability (Available, Busy, Offline), view assigned patients, start consultations, and call the next eligible patient.
*   **Digital Prescriptions:** Implement a prescription editor supporting multiple medication items, authenticated electronic approval, PDF generation, and secure storage. Preserve finalized versions with an auditable amendment history rather than silently overwriting them.
*   **Centralized Medical Records:** Maintain a secure patient timeline containing consultation history, prescriptions, and authorized clinical notes.

## 3. Security & Data Handling
*   **Access Control:** Enforce role-based permissions strictly within the Django server-side logic and database queries. Patients must only access their own records, and doctors may access records only when assigned for legitimate care purposes.
*   **Demo Environment:** Use fictional demonstration data only during development. Never process real patient records in this unvalidated prototype.
*   **Concurrency:** Prevent double-booking using database transactions and unique constraints, rather than relying solely on frontend checks.

## 4. Implementation Phases
Execute the build sequentially through the following phases:
*   **Phase 1 — Foundation:** Initialize the Django backend, SQL schema, React frontend, and user authentication flows.
*   **Phase 2 — Core Roles:** Build secure dashboards and profile management for patients, doctors, and administrators.
*   **Phase 3 — Matching & Booking:** Implement the doctor discovery logic, matching algorithm, atomic appointment booking, and dynamic real-time queues.
*   **Phase 4 — Medical Workflows:** Build the active consultation view, digital prescription editor, PDF generation, and medical history access controls.
*   **Phase 5 — Advanced Capabilities:** Add notifications, analytics, workload insights, queue estimates, and offline fallback features.
*   **Phase 6 — QA and Security:** Test role boundaries, concurrent booking, double-booking prevention, realtime events, prescription history, and performance.
*   **Phase 7 — Deployment:** Prepare production environment variables, migrations, Django settings, frontend deployment, HTTPS, and documentation.