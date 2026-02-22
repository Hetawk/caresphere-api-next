/**
 * Central application configuration — loaded from environment variables.
 * Mirrors caresphere-api/app/config.py
 */

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

function optionalBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) return fallback;
  return val === "true" || val === "1";
}

export const config = {
  // Application
  APP_NAME: optional("APP_NAME", "CareSphere"),
  APP_VERSION: optional("APP_VERSION", "1.0.0"),
  DEBUG: optionalBool("APP_DEBUG", false),
  NODE_ENV: optional("NODE_ENV", "development"),

  // Database
  DATABASE_URL: required("DATABASE_URL"),

  // Security / JWT
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: optionalInt("JWT_EXPIRES_IN", 86400), // 24h in seconds
  JWT_REFRESH_EXPIRES_IN: optionalInt("JWT_REFRESH_EXPIRES_IN", 604800), // 7d
  BCRYPT_ROUNDS: optionalInt("BCRYPT_ROUNDS", 12),

  // CORS
  CORS_ORIGINS: optional("CORS_ORIGINS", "http://localhost:3000"),

  // Pagination
  PAGE_DEFAULT: optionalInt("PAGE_DEFAULT", 1),
  PAGE_SIZE_DEFAULT: optionalInt("PAGE_SIZE_DEFAULT", 20),
  PAGE_SIZE_MAX: optionalInt("PAGE_SIZE_MAX", 100),
  LOG_LIMIT_DEFAULT: optionalInt("LOG_LIMIT_DEFAULT", 50),
  LOG_LIMIT_MAX: optionalInt("LOG_LIMIT_MAX", 200),

  // Messaging defaults
  MSG_SENDER_NAME: optional("MSG_SENDER_NAME", "CareSphere"),
  MSG_SENDER_EMAIL: optional(
    "MSG_SENDER_EMAIL",
    "no-reply@caresphere.ekddigital.com",
  ),
  MSG_SENDER_PHONE: optional("MSG_SENDER_PHONE", ""),

  // Sender settings fallback defaults
  SENDER_ID: optional("SENDER_ID", ""),
  DEFAULT_FROM_EMAIL: optional(
    "DEFAULT_FROM_EMAIL",
    "no-reply@caresphere.ekddigital.com",
  ),
  DEFAULT_FROM_NAME: optional("DEFAULT_FROM_NAME", "CareSphere"),
  DEFAULT_SMS_FROM: optional("DEFAULT_SMS_FROM", ""),
  DEFAULT_VOICE_FROM: optional("DEFAULT_VOICE_FROM", ""),

  // EKDSend Email API
  EKDSEND_API_KEY: optional("EKDSEND_API_KEY", ""),
  EKDSEND_API_URL: optional(
    "EKDSEND_API_URL",
    "https://es.ekddigital.com/api/v1",
  ),

  // API Base URL (for static assets in emails)
  API_BASE_URL: optional("API_BASE_URL", "https://caresphere.ekddigital.com"),
  APP_URL: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // Feature flags
  FEATURE_DEMO: optionalBool("FEATURE_DEMO", false),
  FEATURE_ANALYTICS: optionalBool("FEATURE_ANALYTICS", true),
  FEATURE_AUTOMATION: optionalBool("FEATURE_AUTOMATION", true),
  FEATURE_BIBLE: optionalBool("FEATURE_BIBLE", true),

  // Bible API — YouVersion Platform only (no API.Bible)
  YOUVERSION_API_KEY: optional("YOUVERSION_API_KEY", ""),
  YOUVERSION_API_URL: optional(
    "YOUVERSION_API_URL",
    "https://api.youversion.com/v1",
  ),
  // YouVersion version IDs: 1=KJV, 59=ESV, 111=NIV, 116=NLT
  BIBLE_DEFAULT_TRANSLATION: optional("BIBLE_DEFAULT_TRANSLATION", "1"),
  // Cache TTLs (seconds)
  BIBLE_CACHE_TTL_VERSE: optionalInt("BIBLE_CACHE_TTL_VERSE", 604800), // 7 days
  BIBLE_CACHE_TTL_TRANSLATIONS: optionalInt(
    "BIBLE_CACHE_TTL_TRANSLATIONS",
    2592000,
  ), // 30 days
  BIBLE_CACHE_TTL_SEARCH: optionalInt("BIBLE_CACHE_TTL_SEARCH", 86400), // 1 day

  // Logging
  LOG_LEVEL: optional("LOG_LEVEL", "info"),

  get allowedOrigins(): string[] {
    return this.CORS_ORIGINS.split(",").map((o) => o.trim());
  },
} as const;
