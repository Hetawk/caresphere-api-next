/**
 * Centralised Zod validation helper + reusable schemas.
 *
 * Usage in a route:
 *   import { validate, emailSchema, passwordSchema } from "@/lib/validate";
 *   const body = validate(schema, await req.json());
 *
 * Eliminates the duplicated safeParse + if (!parsed.success) throw boilerplate
 * from every route file, keeping each handler focused on business logic.
 */

import { z } from "zod";
import { ValidationError } from "./errors";

// ── Core helper ────────────────────────────────────────────────────────────────

/**
 * Parse `data` against `schema`.
 * Throws `ValidationError` with a human-readable message on failure.
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path?.join(".") ?? "value";
    const msg = issue?.message ?? "Validation failed";
    throw new ValidationError(field !== "value" ? `${field}: ${msg}` : msg);
  }
  return result.data;
}

// ── Primitive schemas ─────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters");

export const uuidSchema = z.string().uuid("Invalid ID format");

/** 6-digit numeric registration / verification code */
export const verifyCodeSchema = z
  .string()
  .length(6, "Code must be exactly 6 digits")
  .regex(/^\d+$/, "Code must contain digits only");

/** 7-digit numeric organisation join code */
export const orgCodeSchema = z
  .string()
  .length(7, "Organisation code must be exactly 7 digits")
  .regex(/^\d+$/, "Organisation code must contain digits only");

// ── Common object schemas ─────────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
