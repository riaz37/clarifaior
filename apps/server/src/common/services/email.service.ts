// src/common/services/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter, SentMessageInfo } from 'nodemailer';
import { ConfigService } from './config.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly isDev = process.env.NODE_ENV !== 'production';
  private readonly emailLogPath = path.join(process.cwd(), 'email-logs');

  constructor(private readonly configService: ConfigService) {
    // Ensure email logs directory exists in development
    if (this.isDev && !fs.existsSync(this.emailLogPath)) {
      fs.mkdirSync(this.emailLogPath, { recursive: true });
    }

    const smtpConfig = {
      host: this.configService.get('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(this.configService.get('SMTP_PORT') || '465'),
      secure: true, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false, // Only for development
      },
      debug: true,
      logger: true,
    };

    this.logger.log('Initializing email service with config:', {
      ...smtpConfig,
      auth: { user: smtpConfig.auth.user, pass: '***' }, // Don't log password
    });

    this.transporter = createTransport(smtpConfig);

    // Verify connection configuration
    this.verifyConnection().catch((err) => {
      this.logger.error('SMTP connection verification failed:', err);
    });
  }

  private async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed:', error);
      throw new Error(`SMTP connection failed: ${error.message}`);
    }
  }

  async sendVerificationEmail(
    email: string,
    token: string,
  ): Promise<SentMessageInfo> {
    try {
      const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
      const fromEmail = this.configService.get('SMTP_FROM_EMAIL');
      const fromName = this.configService.get('SMTP_FROM_NAME');

      if (!fromEmail) {
        throw new Error('SMTP_FROM_EMAIL is not configured');
      }

      const mailOptions = {
        from: `"${fromName || 'No Reply'}" <${fromEmail}>`,
        to: email,
        subject: 'Verify your email',
        html: `
          <h1>Email Verification</h1>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${verificationUrl}">Verify Email</a>
          <p>Or copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
        `,
        headers: {
          'X-Laziness-level': '1000',
        },
      };

      this.logger.debug(`Sending verification email to ${email}`, {
        mailOptions: {
          ...mailOptions,
          html: '***',
        },
      });

      if (this.isDev) {
        // In development, write email to file instead of sending
        const emailLog = {
          to: email,
          subject: mailOptions.subject,
          timestamp: new Date().toISOString(),
          verificationUrl,
          token,
        };

        const filename = `email-${Date.now()}.json`;
        fs.writeFileSync(
          path.join(this.emailLogPath, filename),
          JSON.stringify(emailLog, null, 2),
        );
        this.logger.log(`[DEV] Email logged to ${filename} instead of sending`);
        return {
          message: 'Email logged (development mode)',
          messageId: `dev-${Date.now()}`,
        };
      }

      // In production, send the actual email
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`, {
        messageId: info.messageId,
      });
      return info;
    } catch (error) {
      const errorMessage = `Failed to send verification email to ${email}: ${error.message}`;
      this.logger.error(errorMessage, error.stack);

      // Log the full error for debugging
      this.logger.debug('SMTP error details:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        responseMessage: error.responseMessage,
      });

      throw new Error(errorMessage);
    }
  }
}
