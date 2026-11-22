// Read-only integration verification. Renders a real admission form, without sending email.
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');
require.extensions['.ts'] = (loaded, file) => loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, file);
const apiRequire = Module.createRequire(path.resolve('apps/api/package.json'));
process.loadEnvFile('apps/api/.env');
const { PrismaClient } = apiRequire('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const member = await prisma.member.findUnique({ where: { id: process.argv[2] }, include: { branch: true, assignedTrainer: true, address: true, emergencyContact: true, healthDeclaration: true, consent: true } });
  if (!member) throw new Error('Verification member not found');
  const tenant = await prisma.tenant.findUnique({ where: { id: member.tenantId } });
  const user = await prisma.user.findFirst({ where: { tenantId: member.tenantId, status: 'ACTIVE' }, select: { id: true, role: true, fullName: true } });
  const invoice = process.argv.includes('--invoice') ? await prisma.invoice.findFirst({ where: { tenantId: member.tenantId, memberId: member.id }, orderBy: { createdAt: 'desc' }, include: { tenant: true, member: { include: { address: true } }, branch: true, lineItems: true, allocations: { include: { payment: true } }, creditNotes: true, membership: { include: { plan: true } } } }) : undefined;
  if (process.argv.includes('--invoice') && !invoice) throw new Error('No existing invoice for verification member');
  const file = path.resolve('apps/api/src/modules/mail/print-page-pdf.ts');
  const loaded = new Module(file, module); loaded.filename = file; loaded.paths = Module._nodeModulePaths(path.dirname(file));
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, file);
  const pdf = await loaded.exports.renderAdmissionPage({ appUrl: process.env.APP_URL || 'http://localhost:5173', executable: process.env.PDF_BROWSER_PATH, memberId: member.id, member, tenant, user, invoiceId: invoice?.id, invoice });
  if (pdf.subarray(0, 4).toString() !== '%PDF') throw new Error('Invalid PDF output');
  const out = path.resolve(invoice ? 'test-results/membership-invoice.pdf' : 'test-results/admission-form.pdf');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, pdf);
  console.log(`Actual print page PDF verified (${pdf.length} bytes). Output: ${path.basename(out)}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
