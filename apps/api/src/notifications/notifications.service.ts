import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import nodemailer from 'nodemailer';
import { DEFAULT_TENANT_SETTINGS } from '../settings/settings.types';

type NotificationSettings = (typeof DEFAULT_TENANT_SETTINGS)['notifications'];

type EmailTemplate = {
  subject?: string;
  body?: string;
  html?: string;
};

type BookingEmailData = {
  name: string;
  code: string;
  date: string;
  time: string;
  offering?: string;
  email: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaClient) {}

  private async getTenantEmailConfig(tenantId: string) {
    const instance = await this.prisma.instance.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        siteTitle: true,
        contactEmail: true,
        locale: true,
        timezone: true,
        notificationSettings: true,
      },
    });

    if (!instance) {
      throw new Error('Instancia no encontrada');
    }

    const notifications = this.deepMerge(
      DEFAULT_TENANT_SETTINGS.notifications,
      (instance.notificationSettings as Record<string, any>) || {},
    ) as NotificationSettings;

    const fromEmail =
      notifications.fromEmail ||
      instance.contactEmail ||
      'no-reply@example.com';
    const fromName =
      notifications.fromName ||
      instance.siteTitle ||
      instance.name ||
      'Reservas';

    return {
      notifications,
      fromEmail,
      fromName,
      locale: instance.locale || 'es-ES',
      timezone: instance.timezone || 'Europe/Madrid',
    };
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  private renderTemplate(template: string, data: Record<string, string>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
  }

  private formatDateTime(
    date: Date,
    locale: string,
    timezone: string,
  ): { date: string; time: string } {
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      date: dateFormatter.format(date),
      time: timeFormatter.format(date),
    };
  }

  private async sendEmail(
    tenantId: string,
    to: string,
    subject: string,
    body: string,
    html?: string,
  ) {
    const config = await this.getTenantEmailConfig(tenantId);
    const smtp = config.notifications.smtp;

    if (!smtp?.enabled) {
      this.logger.debug(
        `SMTP deshabilitado. Email omitido: ${subject} -> ${to}`,
      );
      return { skipped: true };
    }

    if (!smtp.host || !smtp.port) {
      this.logger.warn('SMTP incompleto (host/port). Email omitido.');
      return { skipped: true };
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: !!smtp.secure,
      auth:
        smtp.user && smtp.pass
          ? {
              user: smtp.user,
              pass: smtp.pass,
            }
          : undefined,
    });

    await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to,
      cc: this.parseAddressList(smtp?.cc),
      bcc: this.parseAddressList(smtp?.bcc),
      subject,
      text: body,
      ...(html ? { html } : {}),
    });

    return { success: true };
  }

  private async sendTemplateEmail(
    tenantId: string,
    template: EmailTemplate,
    data: BookingEmailData,
  ) {
    if (!template.subject || !template.body) {
      this.logger.warn('Plantilla incompleta. Email omitido.');
      return { skipped: true };
    }

    const subject = this.renderTemplate(template.subject, data);
    const body = this.renderTemplate(template.body, data);
    const html =
      template.html && template.html.trim().length > 0
        ? this.renderTemplate(template.html, data)
        : body.replace(/\n/g, '<br/>');

    return this.sendEmail(tenantId, data.email, subject, body, html);
  }

  private parseAddressList(value?: string) {
    if (!value) return undefined;
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items : undefined;
  }

  async sendTestEmail(
    tenantId: string,
    dto: { to: string; subject?: string; body?: string; html?: string },
  ) {
    const subject = dto.subject || 'Test SMTP';
    const body = dto.body || 'Este es un email de prueba.';
    const html = dto.html || undefined;

    return this.sendEmail(tenantId, dto.to, subject, body, html);
  }

  async sendBookingConfirmation(
    tenantId: string,
    booking: {
      code: string;
      customerName: string;
      customerEmail: string;
      slotStart: Date;
      offeringName?: string;
    },
  ) {
    const config = await this.getTenantEmailConfig(tenantId);
    if (!config.notifications.sendBookingConfirmation) return;

    const { date, time } = this.formatDateTime(
      booking.slotStart,
      config.locale,
      config.timezone,
    );

    const data: BookingEmailData = {
      name: booking.customerName,
      code: booking.code,
      date,
      time,
      offering: booking.offeringName || '',
      email: booking.customerEmail,
    };

    const template =
      config.notifications.templates?.bookingConfirmation ||
      DEFAULT_TENANT_SETTINGS.notifications.templates?.bookingConfirmation ||
      {};

    await this.sendTemplateEmail(tenantId, template, data);
  }

  async sendBookingReminder(
    tenantId: string,
    booking: {
      code: string;
      customerName: string;
      customerEmail: string;
      slotStart: Date;
      offeringName?: string;
    },
  ) {
    const config = await this.getTenantEmailConfig(tenantId);
    if (!config.notifications.sendBookingReminder) return;

    const { date, time } = this.formatDateTime(
      booking.slotStart,
      config.locale,
      config.timezone,
    );

    const data: BookingEmailData = {
      name: booking.customerName,
      code: booking.code,
      date,
      time,
      offering: booking.offeringName || '',
      email: booking.customerEmail,
    };

    const template =
      config.notifications.templates?.bookingReminder ||
      DEFAULT_TENANT_SETTINGS.notifications.templates?.bookingReminder ||
      {};

    await this.sendTemplateEmail(tenantId, template, data);
  }

  async sendBookingCancellation(
    tenantId: string,
    booking: {
      code: string;
      customerName: string;
      customerEmail: string;
      slotStart: Date;
      offeringName?: string;
    },
  ) {
    const config = await this.getTenantEmailConfig(tenantId);
    if (!config.notifications.sendCancellationNotification) return;

    const { date, time } = this.formatDateTime(
      booking.slotStart,
      config.locale,
      config.timezone,
    );

    const data: BookingEmailData = {
      name: booking.customerName,
      code: booking.code,
      date,
      time,
      offering: booking.offeringName || '',
      email: booking.customerEmail,
    };

    const template =
      config.notifications.templates?.bookingCancellation ||
      DEFAULT_TENANT_SETTINGS.notifications.templates?.bookingCancellation ||
      {};

    await this.sendTemplateEmail(tenantId, template, data);
  }
}
