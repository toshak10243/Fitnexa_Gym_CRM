import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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
    this.fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Fitnexa SaaS Platform';
    this.fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || 'support@fitnexa.com';

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

  async sendWelcomeClientEmail(dto: SendWelcomeEmailDto): Promise<{ success: boolean; mode: 'smtp' | 'dev_log' }> {
    const subject = `Welcome to Fitnexa - Credentials for ${dto.clientName}`;
    const validityText = dto.isLifetime
      ? 'Lifetime Active License + Free Lifetime AMC'
      : dto.expiresAt
      ? `Valid until ${new Date(dto.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}`
      : '7-Day Free Evaluation';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FBFBF9; border: 1px solid #E5E7EB; color: #111827;">
        <div style="background-color: #0A192F; padding: 24px; text-align: left; border-bottom: 3px solid #B91C1C;">
          <h1 style="color: #FBFBF9; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">FITNEXA SAAS PLATFORM</h1>
          <p style="color: #9CA3AF; margin: 4px 0 0; font-size: 12px; text-transform: uppercase;">Enterprise Gym Management Console</p>
        </div>
        
        <div style="padding: 28px;">
          <h2 style="color: #0A192F; font-size: 18px; margin-top: 0;">Welcome, ${dto.adminName}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Your gym facility <strong>${dto.clientName}</strong> has been provisioned on Fitnexa. Below are your administrator login credentials and subscription details.
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

  async sendPasswordResetEmail(dto: SendPasswordResetEmailDto): Promise<{ success: boolean; mode: 'smtp' | 'dev_log' }> {
    const subject = `Fitnexa - Administrator Password Reset`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FBFBF9; border: 1px solid #E5E7EB; color: #111827;">
        <div style="background-color: #0A192F; padding: 24px; text-align: left; border-bottom: 3px solid #B91C1C;">
          <h1 style="color: #FBFBF9; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">FITNEXA SAAS PLATFORM</h1>
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
              Sign In to Fitnexa
            </a>
          </div>
        </div>
      </div>
    `;

    return this.sendMail({ to: dto.to, subject, html, logPayload: { newPassword: dto.newPassword } });
  }

  async sendPlanExpiryReminderEmail(dto: SendExpiryReminderDto): Promise<{ success: boolean; mode: 'smtp' | 'dev_log' }> {
    const subject = `Action Required: Fitnexa Subscription Expiring Soon for ${dto.clientName}`;
    const formattedDate = new Date(dto.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'full' });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FBFBF9; border: 1px solid #E5E7EB; color: #111827;">
        <div style="background-color: #0A192F; padding: 24px; text-align: left; border-bottom: 3px solid #B91C1C;">
          <h1 style="color: #FBFBF9; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">FITNEXA SAAS PLATFORM</h1>
          <p style="color: #9CA3AF; margin: 4px 0 0; font-size: 12px; text-transform: uppercase;">Subscription Renewal Reminder</p>
        </div>
        
        <div style="padding: 28px;">
          <h2 style="color: #0A192F; font-size: 18px; margin-top: 0;">Subscription Notice for ${dto.clientName}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Hello ${dto.adminName}, your current Fitnexa subscription (<strong>${dto.planName}</strong>) is scheduled to expire on:
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
    logPayload?: any;
  }): Promise<{ success: boolean; mode: 'smtp' | 'dev_log' }> {
    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        this.logger.log(`SMTP Email sent successfully to ${options.to}. MessageId: ${info.messageId}`);
        return { success: true, mode: 'smtp' };
      } catch (err: any) {
        this.logger.error(`Failed to send email via SMTP to ${options.to}: ${err.message}. Falling back to dev log.`);
      }
    }

    // Dev fallback: Clean structured log
    this.logger.log(
      `[DEV MAIL LOG] To: ${options.to} | Subject: "${options.subject}" | Payload: ${JSON.stringify(options.logPayload || {})}`,
    );
    return { success: true, mode: 'dev_log' };
  }
}
