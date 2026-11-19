-- Fitnexa Least-Privilege Database Initialization

-- Create application user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'fitnexa_app') THEN
      CREATE ROLE fitnexa_app WITH LOGIN PASSWORD 'FitnexaApp@2026';
   END IF;
END
$do$;

-- Grant connection to target database
GRANT CONNECT ON DATABASE fitnexa_dev TO fitnexa_app;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO fitnexa_app;

-- Grant standard DML privileges (least privilege: no DROP, no ALTER TABLE)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fitnexa_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fitnexa_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fitnexa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fitnexa_app;
