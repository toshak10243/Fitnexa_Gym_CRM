import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { uploadImage } from './member-admission-document';
import { renderAdmissionPage } from './print-page-pdf';

export interface SendWelcomeEmailDto {
  to: string;
  clientName: string;
  adminName: string;
  tempPassword: string;
  planName: string;
  loginUrl: string;
  expiresAt?: Date | null;
  isLifetime?: boolean;
}

export interface SendPasswordResetEmailDto {
  to: string;
  adminName: string;
  newPassword: string;
  loginUrl: string;
}

export interface SendExpiryReminderDto {
  to: string;
  clientName: string;
  adminName: string;
  planName: string;
  expiresAt: Date;
  renewalUrl: string;
}
export interface SendMemberWelcomeEmailDto { to: string; memberName: string; memberCode: string; gymName: string; phone: string; email?: string; address?: string; logoUrl?: string | null; website?: string | null; photoUrl?: string | null; gymPhone?: string | null; sections?: { title: string; fields: Record<string, unknown> }[]; printData: { tenant: object; user: object; member: object; memberId: string }; }
export interface SendMembershipAssignedEmailDto { to: string; memberName: string; memberCode: string; gymName: string; planName: string; startDate: Date; endDate: Date; amountInPaise: number; taxInPaise: number; logoUrl?: string | null; address?: string; phone?: string; website?: string | null; }

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly isConfigured: boolean = false;
  private readonly fromName: string;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10);
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    this.fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Trifit SaaS Platform';
    this.fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || 'support@trifit.com';

    if (user && pass && user.trim() !== '' && pass.trim() !== '') {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user: user.trim(),
            pass: pass.trim(),
          },
        });
        this.isConfigured = true;
        this.logger.log(`SMTP Mail Transport initialized with host ${host}:${port} for ${user}`);
      } catch (err: any) {
        this.logger.warn(`Failed to initialize SMTP transporter: ${err.message}. Fallback to dev log mode.`);
        this.isConfigured = false;
      }
    } else {
      this.logger.log('SMTP_USER or SMTP_PASSWORD not set. Emails will be logged to console in dev mode.');
      this.isConfigured = false;
    }
  }

  async sendPasswordResetOtp(to: string, otp: string) {
    return this.sendMail({ to, subject: 'Trifit password reset verification code', html: `<div style="font-family:Arial,sans-serif;background:#FBFBF9;color:#111827;border:1px solid #E5E7EB;max-width:560px;margin:auto"><div style="padding:24px;background:#0A192F;color:#FBFBF9"><h1>TRIFIT</h1></div><div style="padding:24px"><h2>Reset your password</h2><p>Use this verification code to continue:</p><p style="font-size:30px;font-weight:bold;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes. Never share it with anyone.</p><p>If you did not request a password reset, you can ignore this email.</p></div></div>` });
  }

  async sendWelcomeClientEmail(dto: SendWelcomeEmailDto): Promise<{ success: boolean; mode: 'smtp' | 'dev_log' }> {
    const subject = `Welcome to Trifit - Credentials for ${dto.clientName}`;
    const validityText = dto.isLifetime
      ? 'Lifetime Active License + Free Lifetime AMC'
      : dto.expiresAt
      ? `Valid until ${new Date(dto.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}`
      : '7-Day Free Evaluation';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FBFBF9; border: 1px solid #E5E7EB; color: #111827;">
        <div style="background-color: #0A192F; padding: 24px; text-align: left; border-bottom: 3px solid #B91C1C;">
          <h1 style="color: #FBFBF9; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">TRIFIT SAAS PLATFORM</h1>
          <p style="color: #9CA3AF; margin: 4px 0 0; font-size: 12px; text-transform: uppercase;">Enterprise Gym Management Console</p>
        </div>
        
        <div style="padding: 28px;">
          <h2 style="color: #0A192F; font-size: 18px; margin-top: 0;">Welcome, ${dto.adminName}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Your gym facility <strong>${dto.clientName}</strong> has been provisioned on Trifit. Below are your administrator login credentials and subscription details.
          </p>

          <div style="background-color: #FFFFFF; border: 1px solid #E5E7EB; padding: 18px; margin: 20px 0;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #B91C1C; margin-bottom: 12px; letter-spacing: 0.5px;">Subscription Details</div>
            <table style="width: 100%; font-size: 13px; line-height: 1.8;">
              <tr>
                <td style="color: #6B7280; width: 40%;">Plan:</td>
                <td style="color: #0A192F; font-weight: bold;">${dto.planName}</td>
              </tr>
              <tr>
                <td style="color: #6B7280;">Validity:</td>
                <td style="color: #0A192F; font-weight: bold;">${validityText}</td>
              </tr>
              <tr>
                <td style="color: #6B7280;">Capacity:</td>
                <td style="color: #059669; font-weight: bold;">Unlimited Members & Staff</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #0F223D; color: #FBFBF9; padding: 18px; margin: 20px 0;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #F87171; margin-bottom: 12px; letter-spacing: 0.5px;">Admin Login Credentials</div>
            <table style="width: 100%; font-size: 13px; line-height: 2;">
              <tr>
                <td style="color: #9CA3AF; width: 35%;">Login Email:</td>
                <td style="color: #FFFFFF; font-weight: bold; font-family: monospace;">${dto.to}</td>
              </tr>
              <tr>
                <td style="color: #9CA3AF;">Temporary Password:</td>
                <td style="color: #FBBF24; font-weight: bold; font-family: monospace; font-size: 15px;">${dto.tempPassword}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 12px; color: #B91C1C; font-weight: bold; margin-top: 15px;">
            Security Notice: You will be required to create your own permanent secure password immediately upon your first login.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dto.loginUrl}" style="background-color: #0A192F; color: #FBFBF9; padding: 12px 28px; text-decoration: none; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
              Access Management Console
            </a>
          </div>

          <p style="font-size: 12px; color: #6B7280; line-height: 1.5; margin-top: 30px; border-top: 1px solid #E5E7EB; padding-top: 16px;">
            Need help? Contact our platform onboarding team at <a href="mailto:${this.fromEmail}" style="color: #0A192F;">${this.fromEmail}</a>.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({ to: dto.to, subject, html, logPayload: { client: dto.clientName, tempPassword: dto.tempPassword } });
  }

  async sendMemberWelcomeEmail(dto: SendMemberWelcomeEmailDto) {
    const subject = `Welcome to ${dto.gymName}, ${dto.memberName}`;
    const logo = dto.logoUrl ? `<img src="${dto.logoUrl}" alt="${dto.gymName}" style="max-height:64px;max-width:180px;object-fit:contain;background:#ffffff;padding:6px;margin-bottom:12px"/>` : '';
    const html = `<div style="font-family:Arial,sans-serif;background:#ffffff;padding:32px;color:#111827;color-scheme:light"><div style="max-width:680px;margin:auto;background:#ffffff;border:1px solid #E5E7EB"><header style="background:#0A192F;padding:32px;color:#ffffff;border-bottom:4px solid #B91C1C">${logo}<h1 style="margin:0;font-size:28px">${dto.gymName}</h1><p style="margin:8px 0 0;color:#CBD5E1;font-size:14px">Member welcome and registration confirmation</p></header><main style="padding:36px"><p style="font-size:16px">Hello <strong>${dto.memberName}</strong>,</p><p style="font-size:15px;line-height:1.7">Welcome to ${dto.gymName}. Your member profile has been created successfully. We are excited to support your fitness journey.</p><div style="background:#F5F5F0;border:1px solid #E5E7EB;padding:22px;margin:26px 0"><h2 style="font-size:15px;color:#0A192F;margin:0 0 16px;text-transform:uppercase">Your member details</h2><p style="margin:8px 0"><strong>Member ID:</strong> ${dto.memberCode}</p><p style="margin:8px 0"><strong>Phone:</strong> ${dto.phone}</p>${dto.email ? `<p style="margin:8px 0"><strong>Email:</strong> ${dto.email}</p>` : ''}</div><p style="font-size:14px;line-height:1.7">Please keep this email for your records. Contact the front desk if you need help with your membership or account.</p></main><footer style="background:#0F223D;color:#CBD5E1;padding:24px 36px;font-size:12px;line-height:1.7"><strong style="color:#ffffff">${dto.gymName}</strong><br/>${dto.address || ''}<br/>${dto.phone}${dto.website ? `  ${dto.website}` : ''}<br/><span style="color:#94A3B8">This is an automated welcome email from ${dto.gymName}.</span></footer></div></div>`;
    const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
    const logoImage = uploadImage(dto.logoUrl);
    const memberImage = uploadImage(dto.photoUrl);
    const pdf = await renderAdmissionPage({ ...dto.printData, appUrl: this.configService.get<string>('APP_URL') || 'http://localhost:5173', executable: this.configService.get<string>('PDF_BROWSER_PATH') });
    const attachments: NonNullable<nodemailer.SendMailOptions['attachments']> = [{ filename: `Admission_Form_${dto.memberCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`, content: pdf, contentType: 'application/pdf' }];
    if (logoImage) attachments.push({ filename: 'gym-logo.png', content: logoImage, cid: 'welcome-gym-logo' });
    if (memberImage) attachments.push({ filename: 'member-photo.png', content: memberImage, cid: 'welcome-member-photo' });
    const brandedHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;background:#FBFBF9;color:#111827;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBFBF9"><tr><td align="center" style="padding:20px 12px"><table role="presentation" width="100%" style="max-width:640px;border:1px solid #E5E7EB;background:#FBFBF9" cellpadding="24" cellspacing="0"><tr><td style="border-bottom:3px solid #B91C1C">${logoImage ? '<img src="cid:welcome-gym-logo" alt="Company logo" width="80" style="max-height:80px;object-fit:contain;display:block;margin-bottom:16px">' : ''}<h1 style="font-size:24px;color:#0A192F;margin:0">${escape(dto.gymName)}</h1><p style="color:#6B7280">Registration confirmation</p></td></tr><tr><td><h2 style="color:#0A192F;font-size:20px">Welcome, ${escape(dto.memberName)}!</h2><p style="line-height:1.8">Thank you for registering with ${escape(dto.gymName)}. We are pleased to welcome you to our fitness community. Your registration has been recorded successfully, and our team looks forward to supporting you as you work towards your health and fitness goals.</p>${memberImage ? '<img src="cid:welcome-member-photo" alt="Member photograph" width="100" style="display:block;max-height:130px;object-fit:contain;margin:16px 0">' : ''}<table role="presentation" width="100%" cellpadding="10" style="border:1px solid #E5E7EB;font-size:14px"><tr><td>Member name</td><td>${escape(dto.memberName)}</td></tr><tr><td>Member ID</td><td><strong>${escape(dto.memberCode)}</strong></td></tr><tr><td>Mobile</td><td>${escape(dto.phone)}</td></tr><tr><td>Email</td><td style="word-break:break-all">${escape(dto.email)}</td></tr></table><h3 style="color:#0A192F;font-size:16px">Your registration document</h3><p style="line-height:1.8">Your detailed membership registration and health declaration form is attached as a PDF, including your uploaded photograph where available. Please review your details and contact the front desk if any information needs correcting. Keep this document and your member ID for future reference.</p><h3 style="color:#0A192F;font-size:16px">Getting started</h3><p style="line-height:1.8">Our front desk can help you choose a membership plan, understand gym timings and arrange an introduction to the training team. Please share any medical conditions or exercise restrictions with your trainer before beginning a workout. Registration creates your member profile; your membership plan and its validity will be confirmed separately when assigned.</p><p style="line-height:1.8">Thank you for choosing ${escape(dto.gymName)}. We look forward to welcoming you at the gym and helping you build a consistent, rewarding fitness routine.</p><p>Warm regards,<br><strong>${escape(dto.gymName)} Team</strong></p></td></tr><tr><td style="border-top:1px solid #E5E7EB;color:#6B7280;font-size:12px;line-height:1.8">${escape(dto.gymName)}<br>${escape(dto.address)}<br>${escape(dto.gymPhone)} ${escape(dto.website)}<br>This registration confirmation was generated by your gym.</td></tr></table></td></tr></table></body></html>`;
    void html;
    return this.sendMail({ to: dto.to, subject, html: brandedHtml, attachments, logPayload: { memberCode: dto.memberCode } });
  }

  async sendMembershipAssignedEmail(dto: SendMembershipAssignedEmailDto) {
    const money = (value: number) => `₹${(value / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const date = (value: Date) => new Date(value).toLocaleDateString('en-IN', { dateStyle: 'long' });
    const logo = dto.logoUrl ? `<img src="${dto.logoUrl}" alt="${dto.gymName}" style="max-height:64px;max-width:180px;background:#fff;padding:6px;margin-bottom:12px">` : '';
    const html = `<div style="font-family:Arial,sans-serif;background:#fff;padding:32px;color:#111827"><div style="max-width:680px;margin:auto;border:1px solid #E5E7EB;background:#fff"><header style="background:#0A192F;padding:32px;color:#fff;border-bottom:4px solid #B91C1C">${logo}<h1 style="margin:0;font-size:28px">${dto.gymName}</h1><p style="margin:8px 0 0;color:#CBD5E1">Membership confirmation</p></header><main style="padding:36px"><p style="font-size:16px">Hello <strong>${dto.memberName}</strong>,</p><p>Your membership plan has been activated successfully.</p><div style="background:#F5F5F0;border:1px solid #E5E7EB;padding:22px;margin:24px 0"><p><strong>Member ID:</strong> ${dto.memberCode}</p><p><strong>Plan:</strong> ${dto.planName}</p><p><strong>Valid from:</strong> ${date(dto.startDate)}</p><p><strong>Valid until:</strong> ${date(dto.endDate)}</p><p><strong>Amount paid:</strong> ${money(dto.amountInPaise)}</p><p><strong>GST:</strong> ${money(dto.taxInPaise)}</p><p style="font-size:18px;border-top:1px solid #E5E7EB;padding-top:12px"><strong>Total:</strong> ${money(dto.amountInPaise + dto.taxInPaise)}</p></div><p>Keep this email for your records. Please contact the front desk for any membership assistance.</p></main><footer style="background:#0F223D;color:#CBD5E1;padding:24px 36px;font-size:12px;line-height:1.7"><strong style="color:#fff">${dto.gymName}</strong><br/>${dto.address || ''}<br/>${dto.phone || ''}${dto.website ? `  ${dto.website}` : ''}</footer></div></div>`;
    return this.sendMail({ to: dto.to, subject: `${dto.gymName} membership confirmed - ${dto.planName}`, html, logPayload: { member: dto.memberName, plan: dto.planName } });
  }

  async sendBillingInvoiceEmail(dto: {
    to: string; memberName: string; memberCode: string; memberId: string; invoiceId: string; invoiceNumber: string;
    gymName: string; logoUrl?: string | null; address: string; contact: string; user: object; tenant: object; invoice: object;
    total: number; paid: number; due: number; tax: number; subtotal: number; dueDate: Date;
    planName?: string; startDate?: Date; endDate?: Date;
    items: { description: string; quantity: number; totalAmountInPaise: number }[];
    payments: { method: string; reference?: string | null; amount: number }[];
  }) {
    const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
    const money = (value: number) => `INR ${(value / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const date = (value?: Date) => value ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';
    const mode = dto.due <= 0 ? 'Full Settlement' : dto.paid > 0 ? 'Installment / Partial Payment' : 'Pay Later';
    const pdf = await renderAdmissionPage({ appUrl: this.configService.get<string>('APP_URL') || 'http://localhost:5173', executable: this.configService.get<string>('PDF_BROWSER_PATH'), memberId: dto.memberId, member: {}, tenant: dto.tenant, user: dto.user, invoiceId: dto.invoiceId, invoice: dto.invoice });
    const logo = uploadImage(dto.logoUrl);
    const attachments: NonNullable<nodemailer.SendMailOptions['attachments']> = [{ filename: `Invoice_${dto.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`, content: pdf, contentType: 'application/pdf' }];
    if (logo) attachments.push({ filename: 'company-logo.png', content: logo, cid: 'invoice-company-logo' });
    const row = (label: string, value: string) => `<tr><td style="padding:10px;border-bottom:1px solid #E5E7EB">${escape(label)}</td><td style="padding:10px;border-bottom:1px solid #E5E7EB;text-align:right">${escape(value)}</td></tr>`;
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;background:#FBFBF9;color:#111827;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="12" style="background:#FBFBF9"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="24" style="max-width:640px;background:#FBFBF9;border:1px solid #E5E7EB"><tr><td style="border-bottom:3px solid #B91C1C">${logo ? '<img src="cid:invoice-company-logo" alt="Company logo" width="80" style="display:block;max-height:80px;object-fit:contain;margin-bottom:16px">' : ''}<h1 style="font-size:24px;color:#0A192F">${escape(dto.gymName)}</h1><p style="font-size:13px;color:#6B7280">${escape(dto.address)}<br>${escape(dto.contact)}</p></td></tr><tr><td><h2 style="font-size:20px;color:#0A192F">${dto.planName ? 'Membership confirmation' : 'Your invoice'}</h2><p>Hello <strong>${escape(dto.memberName)}</strong>,</p><p style="line-height:1.8">${dto.planName ? 'Thank you for choosing your membership plan. Your enrolment and billing details are listed below.' : 'Your invoice has been created successfully. Please review the itemised charges and payment details below.'} A PDF copy of your official invoice is attached for your records.</p><table width="100%" cellspacing="0" style="font-size:14px;border:1px solid #E5E7EB">${row('Member ID', dto.memberCode)}${row('Invoice', dto.invoiceNumber)}${row('Payment arrangement', mode)}${dto.planName ? row('Membership plan', dto.planName) + row('Membership period', `${date(dto.startDate)} to ${date(dto.endDate)}`) : ''}</table><h3 style="color:#0A192F;font-size:16px">Invoice details</h3><table width="100%" cellspacing="0" style="font-size:13px;table-layout:fixed">${dto.items.map(item => row(`${item.description} (Qty ${item.quantity})`, money(item.totalAmountInPaise))).join('')}${row('Subtotal', money(dto.subtotal))}${row('GST', money(dto.tax))}${row('Invoice total', money(dto.total))}${row('Amount paid', money(dto.paid))}${row('Balance due', money(dto.due))}${dto.due > 0 ? row('Payment due date', date(dto.dueDate)) : ''}</table>${dto.payments.length ? `<h3 style="font-size:16px">Recorded payments</h3><table width="100%" cellspacing="0" style="font-size:13px">${dto.payments.map(p => row(`${p.method}${p.reference ? ` / ${p.reference}` : ''}`, money(p.amount))).join('')}</table>` : ''}<p style="line-height:1.8">${dto.due > 0 ? `Your remaining balance is ${money(dto.due)}. Please arrange payment by ${date(dto.dueDate)} or contact the front desk for assistance. This email confirms the amount recorded so far and does not confirm full payment.` : 'Your invoice is fully settled. Thank you for your payment.'}</p><p style="line-height:1.8">Please keep the attached invoice for future reference. If you have any questions about your membership, payment or gym access, our front desk team will be happy to help.</p><p>Warm regards,<br><strong>${escape(dto.gymName)} Team</strong></p></td></tr><tr><td style="border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;line-height:1.8">${escape(dto.gymName)}<br>${escape(dto.address)}<br>${escape(dto.contact)}<br>This is a computer-generated invoice confirmation.</td></tr></table></td></tr></table></body></html>`;
    return this.sendMail({ to: dto.to, subject: `${dto.gymName} - ${dto.planName ? 'Membership & ' : ''}Invoice ${dto.invoiceNumber}`, html, attachments, logPayload: { invoiceNumber: dto.invoiceNumber, mode } });
  }

  async sendPasswordResetEmail(dto: SendPasswordResetEmailDto): Promise<{ success: boolean; mode: 'smtp' | 'dev_log' }> {
    const subject = `Trifit - Administrator Password Reset`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FBFBF9; border: 1px solid #E5E7EB; color: #111827;">
        <div style="background-color: #0A192F; padding: 24px; text-align: left; border-bottom: 3px solid #B91C1C;">
          <h1 style="color: #FBFBF9; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">TRIFIT SAAS PLATFORM</h1>
          <p style="color: #9CA3AF; margin: 4px 0 0; font-size: 12px; text-transform: uppercase;">Security Alert</p>
        </div>
        
        <div style="padding: 28px;">
          <h2 style="color: #0A192F; font-size: 18px; margin-top: 0;">Password Reset Notification</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Hello ${dto.adminName}, the SaaS platform owner has issued a password reset for your gym administrator account.
          </p>

          <div style="background-color: #0F223D; color: #FBFBF9; padding: 18px; margin: 20px 0;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #F87171; margin-bottom: 12px; letter-spacing: 0.5px;">New Credentials</div>
            <table style="width: 100%; font-size: 13px; line-height: 2;">
              <tr>
                <td style="color: #9CA3AF; width: 35%;">Login Email:</td>
                <td style="color: #FFFFFF; font-weight: bold; font-family: monospace;">${dto.to}</td>
              </tr>
              <tr>
                <td style="color: #9CA3AF;">New Password:</td>
                <td style="color: #FBBF24; font-weight: bold; font-family: monospace; font-size: 15px;">${dto.newPassword}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 12px; color: #B91C1C; font-weight: bold; margin-top: 15px;">
            You will be prompted to reset this password upon signing in.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dto.loginUrl}" style="background-color: #0A192F; color: #FBFBF9; padding: 12px 28px; text-decoration: none; font-size: 13px; font-weight: bold; text-transform: uppercase; display: inline-block;">
              Sign In to Trifit
            </a>
          </div>
        </div>
      </div>
    `;

    return this.sendMail({ to: dto.to, subject, html, logPayload: { newPassword: dto.newPassword } });
  }

  async sendPlanExpiryReminderEmail(dto: SendExpiryReminderDto): Promise<{ success: boolean; mode: 'smtp' | 'dev_log' }> {
    const subject = `Action Required: Trifit Subscription Expiring Soon for ${dto.clientName}`;
    const formattedDate = new Date(dto.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'full' });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FBFBF9; border: 1px solid #E5E7EB; color: #111827;">
        <div style="background-color: #0A192F; padding: 24px; text-align: left; border-bottom: 3px solid #B91C1C;">
          <h1 style="color: #FBFBF9; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">TRIFIT SAAS PLATFORM</h1>
          <p style="color: #9CA3AF; margin: 4px 0 0; font-size: 12px; text-transform: uppercase;">Subscription Renewal Reminder</p>
        </div>
        
        <div style="padding: 28px;">
          <h2 style="color: #0A192F; font-size: 18px; margin-top: 0;">Subscription Notice for ${dto.clientName}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Hello ${dto.adminName}, your current Trifit subscription (<strong>${dto.planName}</strong>) is scheduled to expire on:
          </p>

          <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 16px; margin: 20px 0; text-align: center;">
            <div style="font-size: 16px; font-weight: bold; color: #92400E;">${formattedDate}</div>
            <div style="font-size: 12px; color: #B45309; margin-top: 4px;">Renew to prevent any disruption to biometric devices and member access.</div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dto.renewalUrl}" style="background-color: #B91C1C; color: #FBFBF9; padding: 12px 28px; text-decoration: none; font-size: 13px; font-weight: bold; text-transform: uppercase; display: inline-block;">
              Renew Subscription Plan
            </a>
          </div>

          <p style="font-size: 12px; color: #6B7280; line-height: 1.5; margin-top: 20px;">
            To extend your plan or upgrade to our Lifetime + Free AMC tier (₹25,000), please reach out to your account executive or contact platform support.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({ to: dto.to, subject, html, logPayload: { client: dto.clientName, expiresAt: dto.expiresAt } });
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: nodemailer.SendMailOptions['attachments'];
    logPayload?: any;
  }): Promise<{ success: boolean; mode: 'smtp' | 'dev_log' }> {
    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments,
        });
        this.logger.log(`SMTP Email sent successfully to ${options.to}. MessageId: ${info.messageId}`);
        return { success: true, mode: 'smtp' };
      } catch (err: any) {
        this.logger.error('SMTP email delivery failed.');
        return { success: false, mode: 'smtp' };
      }
    }

    if (this.configService.get<string>('NODE_ENV') === 'production') {
      this.logger.error('Email delivery unavailable: SMTP is not configured.');
      return { success: false, mode: 'smtp' };
    }

    // Development logging must not expose temporary credentials.
    this.logger.log(
      `[DEV MAIL LOG] Subject: "${options.subject}"`,
    );
    return { success: true, mode: 'dev_log' };
  }
}


