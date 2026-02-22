/**
 * Domain error classes — map 1:1 to caresphere-api/app/utils/exceptions.py.
 * Each extends Error with an HTTP status code and optional field-level details.
 */

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 400 – invalid input data */
export class ValidationError extends AppError {
  constructor(
    details?: Record<string, string> | string,
    message = "Validation failed",
  ) {
    const detailsRecord =
      typeof details === "string"
        ? ({ message: details } as Record<string, string>)
        : details;
    super(
      typeof details === "string" ? details : message,
      400,
      "VALIDATION_ERROR",
      detailsRecord,
    );
  }
}

/** 401 – unauthenticated */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

/** 403 – authenticated but not authorized */
export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

/** 404 – resource not found */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

/** 409 – conflict (e.g., duplicate email) */
export class ConflictError extends AppError {
  constructor(message = "Conflict with existing data") {
    super(message, 409, "CONFLICT");
  }
}

/** 422 – unprocessable entity */
export class UnprocessableError extends AppError {
  constructor(message = "Unprocessable entity") {
    super(message, 422, "UNPROCESSABLE_ENTITY");
  }
}

/** 500 – internal server error (catch-all) */
export class InternalError extends AppError {
  constructor(message = "An internal error occurred") {
    super(message, 500, "INTERNAL_ERROR");
  }
}
