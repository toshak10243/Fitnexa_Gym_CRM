import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PosEmailService {
  private readonly logger = new Logger(PosEmailService.name);

  constructor(private readonly config: ConfigService) {}

  private async buildInvoicePdf(input: { customerName: string; tenant: any; invoice: any; paymentMethod: string; items: any[] }): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 32, bufferPages: true, info: { Title: `Invoice ${input.invoice.invoiceNumber || ''}`, Author: input.tenant.name || 'Trifit' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const completed = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const navy = '#0A192F';
    const red = '#B91C1C';
    const offWhite = '#FBFBF9';
    const border = '#E5E7EB';
    const muted = '#6B7280';
    const body = '#111827';
    const money = (value: number) => `INR ${(Number(value || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const safe = (value: unknown, fallback = '-') => String(value ?? '').trim() || fallback;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 64;

    doc.rect(0, 0, pageWidth, doc.page.height).fill(offWhite);
    doc.rect(32, 32, contentWidth, 88).fill(navy);
    doc.rect(32, 120, contentWidth, 4).fill(red);

    const logoPath = input.tenant.logoUrl && !/^https?:/i.test(input.tenant.logoUrl)
      ? path.resolve(process.cwd(), String(input.tenant.logoUrl).replace(/^[/\\]+/, ''))
      : null;
    if (logoPath && fs.existsSync(logoPath)) {
      try { doc.image(logoPath, 46, 48, { fit: [54, 54], align: 'center', valign: 'center' }); } catch { /* Invalid image must not block invoice delivery. */ }
    }
    const titleX = logoPath && fs.existsSync(logoPath) ? 114 : 48;
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(17).text(safe(input.tenant.name, 'Trifit'), titleX, 48, { width: 300 });
    doc.fillColor('#CBD5E1').font('Helvetica').fontSize(8).text([input.tenant.address, input.tenant.city, input.tenant.state, input.tenant.pincode].filter(Boolean).join(', '), titleX, 73, { width: 300 });
    doc.text(`Phone: ${safe(input.tenant.phone)} | Email: ${safe(input.tenant.email)}`, titleX, 87, { width: 300 });
    doc.text(`GSTIN: ${safe(input.tenant.gstin, 'N/A')} | PAN: ${safe(input.tenant.pan, 'N/A')}`, titleX, 101, { width: 300 });
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text('TAX INVOICE', 430, 48, { width: 115, align: 'right' });
    doc.font('Helvetica').fontSize(8).text(`Invoice: ${safe(input.invoice.invoiceNumber)}`, 405, 72, { width: 140, align: 'right' });
    doc.text(new Date(input.invoice.invoiceDate || input.invoice.createdAt || Date.now()).toLocaleDateString('en-IN'), 405, 88, { width: 140, align: 'right' });

    const metaY = 144;
    doc.rect(32, metaY, contentWidth, 74).fillAndStroke('#FFFFFF', border);
    doc.fillColor(muted).font('Helvetica-Bold').fontSize(7).text('CUSTOMER DETAILS', 48, metaY + 15);
    doc.fillColor(body).fontSize(10).text(safe(input.customerName, 'Customer'), 48, metaY + 31);
    doc.fillColor(muted).font('Helvetica').fontSize(8).text(safe(input.invoice.customerPhone || input.invoice.member?.phone, ''), 48, metaY + 47);
    doc.fillColor(muted).font('Helvetica-Bold').fontSize(7).text('TENDER DETAILS', 390, metaY + 15, { width: 140, align: 'right' });
    doc.fillColor(body).fontSize(9).text(`Method: ${safe(input.paymentMethod, 'CASH')}`, 390, metaY + 32, { width: 140, align: 'right' });

    let y = 240;
    const columns = { item: 48, unit: 315, qty: 393, gst: 435, total: 482 };
    doc.rect(32, y, contentWidth, 28).fill('#F5F5F0');
    doc.fillColor(muted).font('Helvetica-Bold').fontSize(7);
    doc.text('ITEM DESCRIPTION', columns.item, y + 10, { width: 250 });
    doc.text('UNIT PRICE', columns.unit, y + 10, { width: 68, align: 'right' });
    doc.text('QTY', columns.qty, y + 10, { width: 32, align: 'center' });
    doc.text('GST %', columns.gst, y + 10, { width: 38, align: 'right' });
    doc.text('TOTAL', columns.total, y + 10, { width: 63, align: 'right' });
    y += 28;

    for (const item of input.items) {
      const rowHeight = 58;
      if (y + rowHeight > 680) { doc.addPage({ size: 'A4', margin: 32 }); doc.rect(0, 0, pageWidth, doc.page.height).fill(offWhite); y = 48; }
      doc.rect(32, y, contentWidth, rowHeight).fillAndStroke('#FFFFFF', border);
      const imagePath = item.photoUrl && !/^https?:/i.test(item.photoUrl) ? path.resolve(process.cwd(), String(item.photoUrl).replace(/^[/\\]+/, '')) : null;
      if (imagePath && fs.existsSync(imagePath)) {
        try { doc.image(imagePath, 48, y + 8, { fit: [42, 42], align: 'center', valign: 'center' }); } catch { doc.rect(48, y + 8, 42, 42).fill(navy); }
      } else {
        doc.rect(48, y + 8, 42, 42).fill(navy);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text(safe(item.description, 'P').charAt(0).toUpperCase(), 48, y + 21, { width: 42, align: 'center' });
      }
      doc.fillColor(body).font('Helvetica-Bold').fontSize(8).text(safe(item.description), 100, y + 19, { width: 195, ellipsis: true });
      doc.fillColor(muted).font('Helvetica').text(money(item.unitPriceInPaise), columns.unit, y + 22, { width: 68, align: 'right' });
      doc.fillColor(body).font('Helvetica-Bold').text(String(item.quantity || 0), columns.qty, y + 22, { width: 32, align: 'center' });
      doc.fillColor(muted).font('Helvetica').text(`${Number(item.taxRatePercentage || 0).toFixed(0)}%`, columns.gst, y + 22, { width: 38, align: 'right' });
      doc.fillColor(body).font('Helvetica-Bold').text(money(item.totalAmountInPaise), columns.total, y + 22, { width: 63, align: 'right' });
      y += rowHeight;
    }

    y += 18;
    const summaryX = 344;
    const summaryValueX = 455;
    doc.fillColor(muted).font('Helvetica').fontSize(8).text('Subtotal:', summaryX, y, { width: 105 });
    doc.text(money(input.invoice.subtotalInPaise), summaryValueX, y, { width: 90, align: 'right' });
    y += 18;
    doc.text('Taxes (CGST + SGST):', summaryX, y, { width: 105 });
    doc.text(money(input.invoice.taxAmountInPaise), summaryValueX, y, { width: 90, align: 'right' });
    y += 22;
    doc.moveTo(summaryX, y).lineTo(545, y).strokeColor(border).stroke();
    y += 9;
    doc.fillColor(navy).font('Helvetica-Bold').fontSize(11).text('Grand Total:', summaryX, y, { width: 105 });
    doc.text(money(input.invoice.grandTotalInPaise), summaryValueX, y, { width: 90, align: 'right' });

    const footerY = Math.max(y + 60, 745);
    doc.moveTo(32, footerY).lineTo(563, footerY).strokeColor(navy).stroke();
    doc.fillColor(muted).font('Helvetica').fontSize(7).text(`Phone: ${safe(input.tenant.phone)} | Email: ${safe(input.tenant.email)}`, 32, footerY + 12, { width: 260 });
    doc.text(`Thank you for choosing ${safe(input.tenant.name, 'Trifit')}.\nThis is a computer-generated invoice and does not require a signature.`, 310, footerY + 12, { width: 253, align: 'right' });

    doc.end();
    return completed;
  }

  async sendReceipt(input: { to?: string | null; customerName: string; tenant: any; invoice: any; paymentMethod: string; items: any[] }) {
    if (!input.to) return false;
    const host = this.config.get<string>('SMTP_HOST');
    const from = this.config.get<string>('SMTP_FROM_EMAIL') || this.config.get<string>('MAIL_FROM') || input.tenant.email;
    if (!host || !from) {
      this.logger.warn('POS receipt email skipped: SMTP_HOST or MAIL_FROM is not configured');
      return false;
    }
    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT') || 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: this.config.get<string>('SMTP_USER') ? { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASSWORD') } : undefined,
    });
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
    const money = (value: number) => `INR ${(Number(value || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const inlineAttachments: Array<{ filename: string; path: string; cid: string }> = [];
    const localAsset = (url?: string | null) => {
      if (!url || /^https?:/i.test(url) || /^data:/i.test(url)) return null;
      const resolved = path.resolve(process.cwd(), String(url).replace(/^[/\\]+/, ''));
      return fs.existsSync(resolved) ? resolved : null;
    };
    const logoPath = localAsset(input.tenant.logoUrl);
    if (logoPath) inlineAttachments.push({ filename: path.basename(logoPath), path: logoPath, cid: 'gym-logo' });
    const logoSource = logoPath ? 'cid:gym-logo' : (/^https?:/i.test(input.tenant.logoUrl || '') ? input.tenant.logoUrl : '');
    const rows = input.items.map((item, index) => {
      const productPath = localAsset(item.photoUrl);
      const productCid = `product-${index}`;
      if (productPath) inlineAttachments.push({ filename: path.basename(productPath), path: productPath, cid: productCid });
      const imageSource = productPath ? `cid:${productCid}` : (/^https?:/i.test(item.photoUrl || '') ? item.photoUrl : '');
      const image = imageSource
        ? `<img src="${escapeHtml(imageSource)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;object-fit:contain;border:1px solid #E5E7EB;background:#FBFBF9">`
        : `<div style="width:52px;height:52px;line-height:52px;text-align:center;background:#0A192F;color:#FBFBF9;font-size:18px;font-weight:700">${escapeHtml(String(item.description || 'P').charAt(0).toUpperCase())}</div>`;
      return `<tr><td style="padding:14px 8px;border-bottom:1px solid #E5E7EB"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="padding-right:12px">${image}</td><td style="font-size:13px;font-weight:700;color:#111827;line-height:1.4">${escapeHtml(item.description)}</td></tr></table></td><td style="padding:14px 8px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:12px;color:#6B7280">${money(item.unitPriceInPaise)}</td><td style="padding:14px 8px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:12px;font-weight:700">${Number(item.quantity || 0)}</td><td style="padding:14px 8px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:12px;color:#6B7280">${Number(item.taxRatePercentage || 0).toFixed(0)}%</td><td style="padding:14px 8px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:12px;font-weight:700;white-space:nowrap">${money(item.totalAmountInPaise)}</td></tr>`;
    }).join('');
    const invoiceUrl = `${this.config.get<string>('APP_URL') || 'http://localhost:5173'}/pos/sales/${input.invoice.id}?print=1`;
    const fullAddress = [input.tenant.address, input.tenant.city, input.tenant.state, input.tenant.pincode].filter(Boolean).join(', ');
    const logo = logoSource ? `<img src="${escapeHtml(logoSource)}" alt="${escapeHtml(input.tenant.name)}" style="display:block;max-width:150px;max-height:64px;object-fit:contain">` : '';
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F5F5F0;color:#111827;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F5F0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;background:#FFFFFF;border:1px solid #E5E7EB;border-top:4px solid #B91C1C"><tr><td style="padding:26px 28px;border-bottom:1px solid #E5E7EB"><table role="presentation" width="100%"><tr><td style="vertical-align:middle">${logo}<div style="font-size:24px;line-height:1.25;font-weight:800;color:#0A192F;${logo ? 'margin-top:12px' : ''}">${escapeHtml(input.tenant.name)}</div><div style="margin-top:5px;font-size:12px;line-height:1.5;color:#6B7280">${escapeHtml(fullAddress)}</div></td><td align="right" style="vertical-align:top;color:#0A192F"><div style="font-size:11px;font-weight:700;letter-spacing:1.4px">TAX INVOICE</div><div style="margin-top:10px;font-size:12px;font-weight:700">${escapeHtml(input.invoice.invoiceNumber)}</div><div style="margin-top:4px;font-size:11px;color:#6B7280">${new Date(input.invoice.invoiceDate || Date.now()).toLocaleDateString('en-IN')}</div></td></tr></table></td></tr><tr><td style="padding:28px"><div style="font-size:15px;line-height:1.6">Hello <strong>${escapeHtml(input.customerName)}</strong>,</div><div style="margin-top:7px;font-size:14px;line-height:1.7;color:#374151">Thank you for your purchase. Your payment has been received successfully and the complete tax invoice is attached to this email.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #E5E7EB;background:#FBFBF9"><tr><td style="padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#6B7280">PAYMENT DETAILS</div><div style="margin-top:8px;font-size:13px"><strong>${escapeHtml(input.paymentMethod)}</strong> payment for invoice ${escapeHtml(input.invoice.invoiceNumber)}</div></td><td align="right" style="padding:16px"><div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#6B7280">TOTAL PAID</div><div style="margin-top:6px;font-size:20px;font-weight:800;color:#0A192F">${money(input.invoice.grandTotalInPaise)}</div></td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><thead><tr style="background:#F5F5F0"><th align="left" style="padding:10px 8px;font-size:9px;letter-spacing:.6px;color:#6B7280">ITEM DESCRIPTION</th><th align="right" style="padding:10px 8px;font-size:9px;color:#6B7280">UNIT PRICE</th><th align="center" style="padding:10px 8px;font-size:9px;color:#6B7280">QTY</th><th align="right" style="padding:10px 8px;font-size:9px;color:#6B7280">GST</th><th align="right" style="padding:10px 8px;font-size:9px;color:#6B7280">TOTAL</th></tr></thead><tbody>${rows}</tbody></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px"><tr><td></td><td width="270"><table role="presentation" width="100%" style="font-size:12px;color:#6B7280"><tr><td style="padding:5px 0">Subtotal</td><td align="right">${money(input.invoice.subtotalInPaise)}</td></tr><tr><td style="padding:5px 0">GST</td><td align="right">${money(input.invoice.taxAmountInPaise)}</td></tr><tr><td style="padding:12px 0 5px;border-top:1px solid #E5E7EB;font-size:16px;font-weight:800;color:#0A192F">Grand Total</td><td align="right" style="padding:12px 0 5px;border-top:1px solid #E5E7EB;font-size:16px;font-weight:800;color:#0A192F">${money(input.invoice.grandTotalInPaise)}</td></tr></table></td></tr></table><div style="margin-top:26px;text-align:center"><a href="${escapeHtml(invoiceUrl)}" style="display:inline-block;background:#0A192F;color:#FFFFFF;padding:13px 22px;text-decoration:none;font-size:13px;font-weight:700">View or Download Invoice</a></div></td></tr><tr><td style="padding:20px 28px;border-top:1px solid #E5E7EB;background:#FBFBF9;font-size:11px;line-height:1.7;color:#6B7280"><strong style="color:#0A192F">${escapeHtml(input.tenant.name)}</strong><br>${escapeHtml(fullAddress)}<br>Phone: ${escapeHtml(input.tenant.phone)} | Email: ${escapeHtml(input.tenant.email)}${input.tenant.website ? `<br>Website: ${escapeHtml(input.tenant.website)}` : ''}${input.tenant.whatsapp ? ` | WhatsApp: ${escapeHtml(input.tenant.whatsapp)}` : ''}<br>GSTIN: ${escapeHtml(input.tenant.gstin || 'N/A')} | PAN: ${escapeHtml(input.tenant.pan || 'N/A')}<br><span style="color:#9CA3AF">This is a computer-generated receipt and does not require a signature.</span></td></tr></table></td></tr></table></body></html>`;
    const pdf = await this.buildInvoicePdf(input);
    await transporter.sendMail({ from: { name: input.tenant.name || 'Trifit', address: from }, to: input.to, subject: `Payment receipt ${input.invoice.invoiceNumber} - ${input.tenant.name}`, html, attachments: [{ filename: `Invoice - ${input.tenant.name} - ${input.customerName}.pdf`, content: pdf, contentType: 'application/pdf' }, ...inlineAttachments] });
    return true;
  }
}

