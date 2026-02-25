import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SERVICE - Dynamic Recipient Extraction
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Config ──────────────────────────────────────────────────────────────────

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
const DEFAULT_RECIPIENT = process.env.ADMIN_EMAIL || process.env.DEFAULT_EMAIL_RECIPIENT;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailParams {
  to?: string | string[];  // Opcjonalne - użyje DEFAULT_RECIPIENT jeśli brak
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  recipient?: string;  // Faktycznie użyty odbiorca
  error?: string;
}

// ─── Transporter ─────────────────────────────────────────────────────────────

let transporter: Transporter | null = null;

/**
 * Inicjalizuje transporter Nodemailer (lazy initialization)
 */
function getTransporter(): Transporter {
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
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    console.log(`[EmailService] Transporter initialized (${SMTP_HOST}:${SMTP_PORT})`);
  }

  return transporter;
}

// ─── Recipient Extraction ────────────────────────────────────────────────────

/**
 * Ekstraktuje adres email z tekstu
 * Wzorce: "wyślij do john@example.com", "email to jane@company.com"
 */
export function extractRecipient(text: string): string | null {
  // Regex dla email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex);
  
  if (matches && matches.length > 0) {
    // Zwróć pierwszy znaleziony email
    console.log(`[EmailService] Extracted recipient: ${matches[0]}`);
    return matches[0];
  }

  // Sprawdź czy są znane frazy wskazujące na brak odbiorcy
  const noRecipientPhrases = [
    /do (siebie|mnie)/i,
    /to (myself|me)/i,
  ];

  if (noRecipientPhrases.some(regex => regex.test(text))) {
    console.log("[EmailService] User wants to email themselves");
    return SMTP_USER || null;
  }

  return null;
}

/**
 * Próbuje wyciągnąć temat emaila z tekstu
 */
export function extractSubject(text: string): string | null {
  // Wzorce: "temat: ...", "subject: ...", "re: ..."
  const subjectPatterns = [
    /temat:\s*(.+?)(?:\n|$)/i,
    /subject:\s*(.+?)(?:\n|$)/i,
    /re:\s*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of subjectPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Wysyła email przez Nodemailer
 * Jeśli `to` nie podany, próbuje wyciągnąć z tekstu lub użyje DEFAULT_RECIPIENT
 */
export async function sendEmail(
  params: EmailParams,
  contextText?: string
): Promise<EmailResult> {
  const DEFAULT_RECIPIENT = process.env.ADMIN_EMAIL || process.env.DEFAULT_EMAIL_RECIPIENT;
  // 1. Określ odbiorcę
  let recipient = params.to;

  if (!recipient && contextText) {
    // Próbuj wyciągnąć z kontekstu
    const extracted = extractRecipient(contextText);
    if (extracted) {
      recipient = extracted;
    }
  }

  if (!recipient) {
    // Użyj domyślnego
    recipient = DEFAULT_RECIPIENT;
  }

  if (!recipient) {
    return {
      success: false,
      error: "No recipient specified and DEFAULT_EMAIL_RECIPIENT not configured",
    };
  }

  // 2. Określ temat (jeśli nie podany)
  let subject = params.subject;
  if (!subject && contextText) {
    subject = extractSubject(contextText) || "Message from The Brain";
  }

  console.log(`[EmailService] Sending email to: ${recipient}`);
  console.log(`[EmailService] Subject: ${subject}`);

  try {
    const transport = getTransporter();

    const info = await transport.sendMail({
      from: EMAIL_FROM,
      to: Array.isArray(recipient) ? recipient.join(", ") : recipient,
      subject: subject,
      text: params.text,
      html: params.html,
      cc: params.cc,
      bcc: params.bcc,
    });

    console.log(`[EmailService] ✓ Email sent: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      recipient: Array.isArray(recipient) ? recipient[0] : recipient,
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
      <h2>🧠 Message from The Brain</h2>
    </div>
    <div class="content">
      ${summary ? `<div class="summary"><strong>Summary:</strong> ${summary}</div>` : ""}
      <div>${content.replace(/\n/g, "<br>")}</div>
    </div>
    <div class="footer">
      <p>Sent by The Brain - Your Personal AI Assistant</p>
    </div>
  </div>
</body>
</html>
  `;
}
