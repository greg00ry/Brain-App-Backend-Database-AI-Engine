import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";


const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Transporter ──────────────────────────────────────────────────────────────

let transporter: Transporter | null = null;

/**
 * Inicjalizuje transporter Nodemailer (lazy initialization)
*/
function getTransporter(): Transporter {
  
  // ─── Config ───────────────────────────────────────────────────────────────────
  const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

  if (!transporter) {
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error("SMTP_USER and SMTP_PASS must be configured in environment");
    }

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    console.log(`[EmailService] Transporter initialized (${SMTP_HOST}:${SMTP_PORT})`);
  }

  return transporter;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Wysyła email przez Nodemailer
 * @param params - Parametry emaila
 * @returns Wynik wysyłki
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  console.log(`[EmailService] Sending email to: ${params.to}`);

  try {
    const transport = getTransporter();

    const info = await transport.sendMail({
      from: EMAIL_FROM,
      to: Array.isArray(params.to) ? params.to.join(", ") : params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      cc: params.cc,
      bcc: params.bcc,
    });

    console.log(`[EmailService] ✓ Email sent: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[EmailService] ✗ Failed to send email: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Weryfikuje konfigurację SMTP
 * @returns true jeśli konfiguracja jest poprawna
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log("[EmailService] ✓ SMTP configuration verified");
    return true;
  } catch (error) {
    console.error("[EmailService] ✗ SMTP verification failed:", error);
    return false;
  }
}

/**
 * Tworzy HTML template dla emaila
 * @param content - Treść wiadomości
 * @param summary - Opcjonalne podsumowanie
 * @returns Sformatowany HTML
 */
export function createEmailTemplate(content: string, summary?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .summary { background: #e0e7ff; padding: 15px; border-left: 4px solid #6366f1; margin-bottom: 20px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🧠 Neural Engine Message</h2>
    </div>
    <div class="content">
      ${summary ? `<div class="summary"><strong>Podsumowanie:</strong> ${summary}</div>` : ""}
      <div>${content.replace(/\n/g, "<br>")}</div>
    </div>
    <div class="footer">
      <p>Wiadomość wygenerowana przez Neural Console</p>
    </div>
  </div>
</body>
</html>
  `;
}
