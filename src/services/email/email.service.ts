/**
 * EKDSend Email/SMS Service.
 * Full TypeScript port of caresphere-api/app/services/email_service.py
 * Uses the same API endpoint and key — drop-in replacement.
 */

import { config } from "@/lib/config";

// ─── Error Types ─────────────────────────────────────────────────────────────

export class EmailConfigError extends Error {
  constructor(message = "EKDSEND_API_KEY is not configured") {
    super(message);
    this.name = "EmailConfigError";
  }
}

export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly code = "UNKNOWN",
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  from?: string;
  fromName?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  queuedAt?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class EkdSendService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(apiKey?: string, apiUrl?: string) {
    this.apiKey = apiKey ?? config.EKDSEND_API_KEY;
    this.apiUrl = apiUrl ?? config.EKDSEND_API_URL;
  }

  private ensureApiKey(): void {
    if (!this.apiKey) throw new EmailConfigError();
  }

  /** Send an email (max 50 total recipients). */
  async sendEmail(
    to: string | string[],
    subject: string,
    body: string,
    options: SendEmailOptions = {},
  ): Promise<SendResult> {
    this.ensureApiKey();

    const toList = Array.isArray(to) ? to : [to];
    const ccList = options.cc ?? [];
    const bccList = options.bcc ?? [];

    if (toList.length + ccList.length + bccList.length > 50) {
      throw new EmailSendError(
        "Total recipients exceed maximum of 50",
        "VALIDATION_ERROR",
      );
    }
    if (subject.length > 998) {
      throw new EmailSendError(
        "Subject exceeds 998 characters",
        "VALIDATION_ERROR",
      );
    }

    const payload: Record<string, unknown> = { type: "email", to };

    if (options.template) {
      payload.template = options.template;
      if (options.templateData) payload.templateData = options.templateData;
    } else {
      payload.subject = subject;
      payload.body = body;
    }

    if (options.from) payload.from = options.from;
    if (options.fromName) payload.fromName = options.fromName;
    if (ccList.length) payload.cc = ccList;
    if (bccList.length) payload.bcc = bccList;
    if (options.replyTo) payload.replyTo = options.replyTo;

    return this.post(payload);
  }

  /** Send an SMS. */
  async sendSms(to: string | string[], body: string): Promise<SendResult> {
    this.ensureApiKey();
    return this.post({ type: "sms", to, body });
  }

  /** Send a voice call. */
  async sendVoice(to: string, body: string): Promise<SendResult> {
    this.ensureApiKey();
    return this.post({ type: "voice", to, body });
  }

  private async post(payload: Record<string, unknown>): Promise<SendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${this.apiUrl}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const result = (await response.json()) as {
        success?: boolean;
        messageId?: string;
        queuedAt?: string;
        error?: { message?: string; code?: string };
      };

      if ([200, 201, 202].includes(response.status) && result.success) {
        return {
          success: true,
          messageId: result.messageId,
          queuedAt: result.queuedAt,
        };
      }

      const errMsg = result.error?.message ?? "Unknown API error";
      const errCode = result.error?.code ?? "UNKNOWN";
      throw new EmailSendError(errMsg, errCode);
    } catch (err) {
      if (err instanceof EmailSendError || err instanceof EmailConfigError)
        throw err;
      if ((err as { name?: string }).name === "AbortError") {
        throw new EmailSendError("Request timed out", "TIMEOUT");
      }
      throw new EmailSendError(String(err), "REQUEST_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Singleton email service instance. */
export const ekdSend = new EkdSendService();
