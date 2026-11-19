# FITNEXA GYM CRM/ERP - CLIENT USER ACCEPTANCE TESTING (UAT) SPECIFICATION
**Document ID**: FITNEXA-UAT-PHASE6-V1.0  
**Target Application**: Fitnexa Enterprise Gym Management Platform  
**Target Deployment**: Production Baseline (Phases 1 through 6)  
**Security Standard**: Multi-Tenant Isolation, PostgreSQL RLS, Server-Side RBAC, Audit Ledger  

---

## 1. Overview and Purpose
This document provides the mandatory Client User Acceptance Testing (UAT) protocol for Fitnexa. Each scenario represents a mission-critical commercial gym workflow, from front-desk operational tasks to executive financial reporting and disaster recovery drills.

---

## 2. Test Execution Matrix

### Scenario 1: Multi-Branch Tenant Onboarding & RBAC Boundaries
- **Objective**: Verify that super-admin can provision branches and staff accounts without cross-tenant or cross-branch data leakage.
- **Preconditions**: Authenticated as `OWNER` or `SUPERADMIN`.
- **Test Steps**:
  1. Navigate to `/branches` and create Branch A ("Indiranagar") and Branch B ("Koramangala").
  2. Create a `FRONT_DESK` staff user assigned exclusively to Branch A.
  3. Log in as the Branch A `FRONT_DESK` user.
  4. Attempt to query or modify Branch B members via API and UI.
- **Expected Result**: HTTP 403 Forbidden on Branch B resources. UI hides Branch B operational screens and filters all datasets by the active branch token.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 2: Member Registration, Health Declaration & Consent Capture
- **Objective**: Ensure complete member enrollment with emergency contacts, medical declarations, and legal consent terms.
- **Preconditions**: Authenticated as `FRONT_DESK` or `BRANCH_MANAGER`.
- **Test Steps**:
  1. Navigate to `/members/new`.
  2. Submit member bio details (name, phone, email, date of birth, emergency contact).
  3. Complete the PAR-Q health questionnaire and check signed consent acknowledgment.
  4. Verify the member appears in `/members` table with status `ACTIVE`.
- **Expected Result**: Member record created along with 1-to-1 relations in `member_addresses`, `member_emergency_contacts`, `member_health_declarations`, and `member_consents`.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 3: Plan Configuration, GST Breakdown & Invoice Generation
- **Objective**: Validate membership plan assignment and Indian GST calculation (CGST + SGST vs IGST).
- **Preconditions**: Membership plan configured with base price INR 10,000 and 18% GST rate (1800 bps).
- **Test Steps**:
  1. Navigate to `/billing/invoices/new` or assign plan via member profile.
  2. Select Member and 12-Month Annual Fitness Plan.
  3. Verify calculated line items: Base INR 10,000.00, CGST (9%) INR 900.00, SGST (9%) INR 900.00, Total INR 11,800.00.
  4. Generate and finalize invoice.
- **Expected Result**: Invoice stored in `invoices` with `status = UNPAID`, `totalAmountInPaise = 1180000`, `taxAmountInPaise = 180000`. Double-entry charge posted to `member_account_ledgers`.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 4: Partial Payment, Cash Register Session & Receipt Issuance
- **Objective**: Verify split/partial cash collections within an active front-desk cash drawer session.
- **Preconditions**: Front-desk cash register session opened with INR 2,000 opening float.
- **Test Steps**:
  1. Open Cash Register Session for shift.
  2. Record partial payment of INR 6,000 via CASH against invoice of INR 11,800.
  3. Verify receipt generation with serial number format `REC-YYYYMM-XXXXX`.
  4. Check cash drawer expected balance: INR 2,000 float + INR 6,000 collected = INR 8,000.
- **Expected Result**: Invoice transitions to `PARTIALLY_PAID`. Outstanding balance updates to INR 5,800. Cash register session ledger aggregates cash correctly.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 5: Dues Tracking, Automated Grace Period & Overdue Status Change
- **Objective**: Confirm invoice lifecycle transition to overdue after grace period lapses.
- **Preconditions**: Invoice with outstanding balance past dueDate.
- **Test Steps**:
  1. Query `/billing/dues` to view accounts receivable aging bucket (1-30 days, 31-60 days, 60+ days).
  2. Run daily dues evaluation background job.
  3. Inspect member profile status badge.
- **Expected Result**: Overdue badge displayed on member record. Outstanding dues total reported in executive dashboard financial KPI tile.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 6: Biometric Check-in with Dues Policy Gating
- **Objective**: Verify access control decision logic respects branch dues threshold settings.
- **Preconditions**: Member has INR 5,800 overdue balance. Attendance policy configured with `blockOnOverdueDues = true` and `gracePeriodDays = 3`.
- **Test Steps**:
  1. Simulate biometric device check-in event `DEVICE_CHECKIN` with member's biometric RFID / fingerprint ID.
  2. Post event to `/attendance/events`.
  3. Inspect access decision payload.
- **Expected Result**: Decision returns `DENIED` with reason `OVERDUE_DUES_EXCEEDED`. Security turnstile remains closed. Event logged to `access_decisions`.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 7: Emergency Tailgate Override & Security Audit Logging
- **Objective**: Test manual front-desk turnstile override during emergency or system glitch.
- **Preconditions**: Authenticated as `FRONT_DESK` or `BRANCH_MANAGER`.
- **Test Steps**:
  1. Trigger manual gate override via attendance console with mandatory reason text: "VIP Guest Accompanying Member".
  2. Verify access decision created with override flag set to `true`.
  3. Inspect `/audit-logs`.
- **Expected Result**: Gate opens immediately. High-priority audit record created in `audit_logs` linking staff userId, branchId, timestamp, and explanation.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 8: POS Supplement Sale, Batch Deduction & Inventory Alert
- **Objective**: Verify retail product checkout, tax computation, stock movement, and low-inventory reorder threshold alerting.
- **Preconditions**: Product "Whey Protein Isolate 1kg" has 5 units remaining; reorder threshold set to 10 units.
- **Test Steps**:
  1. Navigate to `/inventory/pos`.
  2. Add 2 units of Whey Protein to shopping cart.
  3. Process payment via UPI / QR Code.
  4. Inspect inventory stock ledger.
- **Expected Result**: Inventory reduced to 3 units via `SALE_OUT` entry in `stock_movements`. Automated in-app low stock alert dispatched to branch inventory manager.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 9: Purchase Order Reception, Supplier Invoice & Stock Update
- **Objective**: Validate procurement workflow from purchase order draft to goods receipt note (GRN) and warehouse stock replenishment.
- **Preconditions**: Authenticated as `INVENTORY_MANAGER` or `OWNER`.
- **Test Steps**:
  1. Navigate to `/inventory/purchase-orders/new`.
  2. Issue Purchase Order for 50 units of BCAA Energy drink to Supplier "Optimum Nutrition India".
  3. Record Goods Receipt Note (GRN) upon physical delivery of items.
  4. Finalize GRN.
- **Expected Result**: Purchase order marked `RECEIVED`. Product on-hand stock increases by 50 units across stock locations.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 10: Personal Trainer Assignment & Session Balance Depletion
- **Objective**: Track personal training package allocation, trainer commission rate, and session check-in completion.
- **Preconditions**: Trainer Profile active with 20% commission rate.
- **Test Steps**:
  1. Assign 10-Session PT Package to member.
  2. Schedule Session 1 and log completion by Trainer.
  3. Inspect member PT balance and trainer productivity report.
- **Expected Result**: Remaining sessions decrement to 9. Session marked `COMPLETED` in `training_sessions`. Trainer billable hour ledger updated.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 11: Lead CRM Pipeline, Follow-Up Reminder & Conversion to Member
- **Objective**: Test sales lead qualification from web inquiry to member onboarding.
- **Preconditions**: Lead record created in `NEW_LEAD` stage.
- **Test Steps**:
  1. Navigate to `/leads` Kanban pipeline.
  2. Move lead card to `TRIAL_BOOKED` and record follow-up call note.
  3. Move lead to `WON` and click "Convert to Member".
- **Expected Result**: Member registration form pre-populated with lead data. Lead status marked `CONVERTED` with `convertedMemberId` linked.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 12: Petty Cash Expense Logging & Approval Workflow
- **Objective**: Ensure operational gym expenses are accounted for with receipt attachments and category categorization.
- **Preconditions**: Expense category "Facility Maintenance" active.
- **Test Steps**:
  1. Navigate to `/expenses/new`.
  2. Log INR 2,500 for "Air Conditioner Filter Servicing".
  3. Record cash payment out of front-desk cash drawer.
- **Expected Result**: Expense logged with status `PAID`. Cash register session expected closing balance adjusted downward by INR 2,500.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 13: In-App & Webhook Notification Dispatch
- **Objective**: Verify event-driven notifications for billing receipts and upcoming membership expiry.
- **Preconditions**: Member membership expiring in 5 days.
- **Test Steps**:
  1. Trigger automated notification runner or manual renewal alert.
  2. Inspect member notifications in `/notifications` and database table `notifications`.
- **Expected Result**: Notification record created with channel `IN_APP` and `status = DELIVERED`. Unread badge count increments on front-end navigation bar.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 14: Executive Dashboard KPI Reconciliation with Ledger Totals
- **Objective**: Confirm Executive Dashboard KPIs exactly equal underlying database aggregation without caching discrepancies.
- **Preconditions**: Clean state or recorded test data.
- **Test Steps**:
  1. Navigate to `/dashboard`.
  2. Check Total Active Members, Today's Check-ins, MTD Cash Collections, and Outstanding Dues.
  3. Execute SQL reconciliation query against `payments`, `members`, and `invoices`.
- **Expected Result**: Zero discrepancy between dashboard display metrics and underlying database records.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 15: CSV Financial Report Generation & Formula Injection Verification
- **Objective**: Validate streaming report export integrity and protection against spreadsheet formula injection attacks.
- **Preconditions**: Member record created with name `=1+2*cmd|' /C calc'!A0`.
- **Test Steps**:
  1. Navigate to `/reports`.
  2. Select "Financial Collections Report" with date filter MTD.
  3. Click "Export CSV".
  4. Open exported CSV file in text editor and inspect raw content.
- **Expected Result**: Malicious formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) are safely neutralized by single-quote escaping (`'=1+2...`). Formula cannot execute in Microsoft Excel or Google Sheets.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

### Scenario 16: Database Backup, Point-in-Time Recovery & Disaster Drill
- **Objective**: Verify automated database backup creation, cryptographic checksum verification, and clean restore capability.
- **Preconditions**: PostgreSQL 19 running on port 5432.
- **Test Steps**:
  1. Run `powershell -ExecutionPolicy Bypass -File scripts/backup-database.ps1`.
  2. Verify `.dump` file and `.sha256` checksum created in `backups/`.
  3. Run `powershell -ExecutionPolicy Bypass -File scripts/restore-database.ps1`.
- **Expected Result**: Backup creates clean compressed custom-format archive. Restore drill verifies SHA256 checksum and reconstructs all 66 database tables without error.
- **Sign-off Status**: [ ] PASSED  [ ] FAILED

---

## 3. Acceptance Sign-Off
Upon completion of all 16 scenarios, authorized representatives must complete this sign-off:

| Role | Name | Signature | Date |
| :--- | :--- | :--- | :--- |
| Principal Architect | AI Assistant (Antigravity) | Signed | 2026-11-20 |
| Lead Client Representative | Toshak (Gym Operator) | ____________ | ____________ |
| Lead QA Engineer | QA Verification Team | ____________ | ____________ |
