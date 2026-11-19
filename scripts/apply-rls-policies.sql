-- ============================================================================
-- FITNEXA GYM CRM/ERP - POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Architecture: Multi-tenant defense-in-depth isolation
-- Session Variable: app.current_tenant_id
-- Least-Privilege Application Role: fitnexa_app
-- ============================================================================

-- 1. Create Application Role (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fitnexa_app') THEN
    CREATE ROLE fitnexa_app WITH
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS
      PASSWORD 'fitnexa_secure_app_pass_change_in_prod';
    COMMENT ON ROLE fitnexa_app IS 'Least-privilege application role subject to mandatory Row Level Security';
  END IF;
END $$;

-- Grant schema usage and table privileges to application role
GRANT USAGE ON SCHEMA public TO fitnexa_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fitnexa_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fitnexa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fitnexa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fitnexa_app;

-- 2. Tenant Entity Self-Isolation Policy
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_self_isolation_policy ON "tenants";
CREATE POLICY tenant_self_isolation_policy ON "tenants"
  FOR ALL
  TO fitnexa_app
  USING (id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- 3. Direct Tenant-Scoped Tables (49 Tables)
DO $$
DECLARE
  target_table text;
  direct_tenant_tables text[] := ARRAY[
    'branches',
    'users',
    'audit_logs',
    'members',
    'member_documents',
    'membership_plans',
    'member_memberships',
    'member_notes',
    'member_activities',
    'member_import_batches',
    'invoices',
    'payments',
    'payment_allocations',
    'payment_receipts',
    'refunds',
    'credit_notes',
    'cash_register_sessions',
    'member_account_ledgers',
    'billing_sequences',
    'idempotency_records',
    'attendance_policies',
    'devices',
    'device_member_mappings',
    'device_event_inbox',
    'access_decisions',
    'member_attendances',
    'attendance_sessions',
    'attendance_corrections',
    'staff_attendances',
    'product_categories',
    'products',
    'stock_locations',
    'stock_movements',
    'stock_adjustments',
    'suppliers',
    'purchase_orders',
    'goods_receipts',
    'inventory_transfers',
    'trainer_profiles',
    'training_packages',
    'trainer_assignments',
    'training_sessions',
    'leads',
    'expense_categories',
    'expenses',
    'recurring_expenses',
    'notification_templates',
    'notifications',
    'notification_preferences'
  ];
BEGIN
  FOREACH target_table IN ARRAY direct_tenant_tables
  LOOP
    EXECUTE format('ALTER TABLE "%s" ENABLE ROW LEVEL SECURITY;', target_table);
    EXECUTE format('ALTER TABLE "%s" FORCE ROW LEVEL SECURITY;', target_table);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON "%s";', target_table);
    EXECUTE format('
      CREATE POLICY tenant_isolation_policy ON "%s"
        FOR ALL
        TO fitnexa_app
        USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', true), ''''))
        WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', true), ''''));
    ', target_table);
  END LOOP;
END $$;

-- 4. Dependent / Child Entities (FK-scoped tenant isolation)

-- Member Addresses
ALTER TABLE "member_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_addresses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_member_addresses_policy ON "member_addresses";
CREATE POLICY rls_member_addresses_policy ON "member_addresses"
  FOR ALL TO fitnexa_app
  USING ("memberId" IN (SELECT id FROM "members" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("memberId" IN (SELECT id FROM "members" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Member Emergency Contacts
ALTER TABLE "member_emergency_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_emergency_contacts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_member_emergency_contacts_policy ON "member_emergency_contacts";
CREATE POLICY rls_member_emergency_contacts_policy ON "member_emergency_contacts"
  FOR ALL TO fitnexa_app
  USING ("memberId" IN (SELECT id FROM "members" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("memberId" IN (SELECT id FROM "members" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Member Health Declarations
ALTER TABLE "member_health_declarations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_health_declarations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_member_health_declarations_policy ON "member_health_declarations";
CREATE POLICY rls_member_health_declarations_policy ON "member_health_declarations"
  FOR ALL TO fitnexa_app
  USING ("memberId" IN (SELECT id FROM "members" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("memberId" IN (SELECT id FROM "members" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Member Consents
ALTER TABLE "member_consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_consents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_member_consents_policy ON "member_consents";
CREATE POLICY rls_member_consents_policy ON "member_consents"
  FOR ALL TO fitnexa_app
  USING ("memberId" IN (SELECT id FROM "members" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("memberId" IN (SELECT id FROM "members" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Membership Status History
ALTER TABLE "membership_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_status_history" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_membership_status_history_policy ON "membership_status_history";
CREATE POLICY rls_membership_status_history_policy ON "membership_status_history"
  FOR ALL TO fitnexa_app
  USING ("memberMembershipId" IN (SELECT id FROM "member_memberships" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("memberMembershipId" IN (SELECT id FROM "member_memberships" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Member Import Rows
ALTER TABLE "member_import_rows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_import_rows" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_member_import_rows_policy ON "member_import_rows";
CREATE POLICY rls_member_import_rows_policy ON "member_import_rows"
  FOR ALL TO fitnexa_app
  USING ("batchId" IN (SELECT id FROM "member_import_batches" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("batchId" IN (SELECT id FROM "member_import_batches" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Invoice Line Items
ALTER TABLE "invoice_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_line_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_invoice_line_items_policy ON "invoice_line_items";
CREATE POLICY rls_invoice_line_items_policy ON "invoice_line_items"
  FOR ALL TO fitnexa_app
  USING ("invoiceId" IN (SELECT id FROM "invoices" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("invoiceId" IN (SELECT id FROM "invoices" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Device Sync Cursors
ALTER TABLE "device_sync_cursors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_sync_cursors" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_device_sync_cursors_policy ON "device_sync_cursors";
CREATE POLICY rls_device_sync_cursors_policy ON "device_sync_cursors"
  FOR ALL TO fitnexa_app
  USING ("deviceId" IN (SELECT id FROM "devices" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("deviceId" IN (SELECT id FROM "devices" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Device Sync Jobs
ALTER TABLE "device_sync_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_sync_jobs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_device_sync_jobs_policy ON "device_sync_jobs";
CREATE POLICY rls_device_sync_jobs_policy ON "device_sync_jobs"
  FOR ALL TO fitnexa_app
  USING ("deviceId" IN (SELECT id FROM "devices" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("deviceId" IN (SELECT id FROM "devices" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Purchase Order Items
ALTER TABLE "purchase_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_purchase_order_items_policy ON "purchase_order_items";
CREATE POLICY rls_purchase_order_items_policy ON "purchase_order_items"
  FOR ALL TO fitnexa_app
  USING ("purchaseOrderId" IN (SELECT id FROM "purchase_orders" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("purchaseOrderId" IN (SELECT id FROM "purchase_orders" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Inventory Transfer Items
ALTER TABLE "inventory_transfer_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_transfer_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_inventory_transfer_items_policy ON "inventory_transfer_items";
CREATE POLICY rls_inventory_transfer_items_policy ON "inventory_transfer_items"
  FOR ALL TO fitnexa_app
  USING ("transferId" IN (SELECT id FROM "inventory_transfers" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("transferId" IN (SELECT id FROM "inventory_transfers" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Trainer Availabilities
ALTER TABLE "trainer_availabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trainer_availabilities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_trainer_availabilities_policy ON "trainer_availabilities";
CREATE POLICY rls_trainer_availabilities_policy ON "trainer_availabilities"
  FOR ALL TO fitnexa_app
  USING ("trainerProfileId" IN (SELECT id FROM "trainer_profiles" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("trainerProfileId" IN (SELECT id FROM "trainer_profiles" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Lead Follow Ups
ALTER TABLE "lead_follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_follow_ups" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_lead_follow_ups_policy ON "lead_follow_ups";
CREATE POLICY rls_lead_follow_ups_policy ON "lead_follow_ups"
  FOR ALL TO fitnexa_app
  USING ("leadId" IN (SELECT id FROM "leads" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("leadId" IN (SELECT id FROM "leads" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- Lead Activities
ALTER TABLE "lead_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_activities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_lead_activities_policy ON "lead_activities";
CREATE POLICY rls_lead_activities_policy ON "lead_activities"
  FOR ALL TO fitnexa_app
  USING ("leadId" IN (SELECT id FROM "leads" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')))
  WITH CHECK ("leadId" IN (SELECT id FROM "leads" WHERE "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')));

-- ============================================================================
-- End of PostgreSQL RLS Policies Script
-- ============================================================================
