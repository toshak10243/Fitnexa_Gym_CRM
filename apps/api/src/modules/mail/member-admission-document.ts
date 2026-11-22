import PDFDocument from 'pdfkit';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

// Only server-managed uploads may be embedded; never read arbitrary paths or fetch URLs.
export function uploadImage(url?: string | null): Buffer | undefined {
  if (!url) return undefined;
  const pathname = /^https?:\/\//i.test(url) ? new URL(url).pathname : url;
  if (!pathname.startsWith('/uploads/')) return undefined;
  if (!/\.(png|jpe?g|webp)$/i.test(pathname)) return undefined;
  for (const root of [path.resolve(process.cwd(), 'uploads'), path.resolve(process.cwd(), 'apps/api/uploads'), path.resolve(__dirname, '../../../uploads')]) {
    const file = path.resolve(root, pathname.slice('/uploads/'.length));
    if (file.startsWith(root + path.sep) && existsSync(file)) return readFileSync(file);
  }
  return undefined;
}

export async function admissionPdf(gym: string, sections: { title: string; fields: Record<string, unknown> }[], logo?: Buffer, photo?: Buffer): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: 'Membership Registration & Health Declaration', Author: gym } });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  doc.fillColor('#0A192F').font('Helvetica-Bold').fontSize(18).text(gym, 120, 45, { width: 320 });
  doc.fontSize(10).text('Membership Registration & Health Declaration', 120, 80, { width: 320 });
  if (logo) { try { doc.image(logo, 40, 40, { fit: [65, 65] }); } catch { /* Unsupported image does not prevent document delivery. */ } }
  if (photo) { try { doc.image(photo, 458, 40, { fit: [90, 100] }); } catch { /* Keep the full registration record even if the photo is invalid. */ } }
  doc.y = 155;
  for (const section of sections) {
    if (doc.y > 690) doc.addPage();
    doc.x = 40;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0A192F').text(section.title);
    doc.moveDown(0.6);
    for (const [label, value] of Object.entries(section.fields)) {
      if (doc.y > 735) doc.addPage();
      const text = value instanceof Date ? value.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? 'Not provided');
      doc.font('Helvetica').fontSize(10).fillColor('#111827').text(`${label}: ${text}`, 40, doc.y, { width: 510 });
      doc.moveDown(0.4);
    }
    doc.moveDown();
  }
  if (doc.y > 650) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(11).text('Acknowledgement of facility regulations', 40);
  doc.font('Helvetica').fontSize(9).text('Memberships are non-transferable and non-refundable unless specified in freeze policies. Wear clean athletic attire and non-marking footwear. Rerack weights after use. The facility is not liable for personal belongings in day-use lockers.', { width: 510 });
  doc.moveDown(2);
  doc.text('Member / Guardian signature: ____________________    Date: ______________');
  doc.moveDown();
  doc.text('Authorized facility representative: ____________________');
  doc.end();
  return completed;
}
