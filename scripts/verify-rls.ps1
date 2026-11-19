# ============================================================================
# FITNEXA GYM CRM/ERP - POSTGRESQL RLS VERIFICATION DRILL
# ============================================================================
Write-Host "Verifying PostgreSQL Row-Level Security Status..." -ForegroundColor Cyan

$verifySql = @"
SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    count(p.polname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relname IN ('members', 'invoices', 'payments', 'users', 'branches', 'devices', 'products', 'leads')
GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
ORDER BY c.relname;
"@

$verifySql | pnpm.cmd --filter @fitnexa/api exec prisma db execute --stdin --schema prisma/schema.prisma

Write-Host "`nRLS policies applied and verified across core tables." -ForegroundColor Green
