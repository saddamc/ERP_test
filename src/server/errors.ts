/**
 * Typed application errors (same codes as the ACCOUNTS project's `common/errors/app-error.ts`).
 * Throw these from server code instead of `new Error(...)` so callers can tell bad input,
 * missing records, state conflicts and permission problems apart.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  badRequest: (message: string, code = "BAD_REQUEST", details?: Record<string, unknown>) =>
    new AppError(400, message, code, details),
  unauthenticated: (message = "Please sign in to continue.") =>
    new AppError(401, message, "UNAUTHENTICATED"),
  forbidden: (message = "You do not have permission to do this.") =>
    new AppError(403, message, "FORBIDDEN"),
  notFound: (message: string, code = "NOT_FOUND") => new AppError(404, message, code),
  conflict: (message: string, code = "CONFLICT", details?: Record<string, unknown>) =>
    new AppError(409, message, code, details),
};

/** Message safe to show the user: AppError text as-is, anything else generic. */
export function userMessage(err: unknown, fallback = "Something went wrong. Nothing was saved."): string {
  return err instanceof AppError ? err.message : fallback;
}
