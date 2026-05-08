/**
 * Normalized error class for all Appwrite operations.
 */
export class AppError extends Error {
  readonly code: number;
  readonly type: string;
  readonly userMessage: string;

  constructor(raw: unknown) {
    const err = raw as { code?: number; type?: string; message?: string };
    const code = err.code ?? 0;
    const type = err.type ?? 'unknown';
    const message = err.message ?? 'An unexpected error occurred';
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.type = type;
    this.userMessage = AppError.toUserMessage(code, type, message);
    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);
  }

  private static toUserMessage(code: number, type: string, message: string): string {
    switch (code) {
      case 400: return 'Invalid request. Please check your input.';
      case 401: return 'You need to be logged in to do that.';
      case 403: return 'You don\'t have permission to do that.';
      case 404: return 'The requested content was not found.';
      case 409: return 'A conflict occurred. This may already exist.';
      case 413: return 'The file is too large. Please use a smaller file.';
      case 429: return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503: return 'The server is temporarily unavailable. Please try again shortly.';
    }
    switch (type) {
      case 'user_already_exists':           return 'An account with this email already exists.';
      case 'user_invalid_credentials':      return 'Incorrect email or password.';
      case 'user_unauthorized':             return 'You need to be logged in to do that.';
      case 'user_not_found':                return 'No account found with this email.';
      case 'user_session_not_found':        return 'Your session has expired. Please log in again.';
      case 'user_blocked':                  return 'This account has been blocked. Contact support.';
      case 'user_password_mismatch':        return 'Current password is incorrect.';
      case 'user_password_recently_used':   return 'You\'ve used this password recently. Choose a different one.';
      case 'document_not_found':            return 'This post no longer exists.';
      case 'document_already_exists':       return 'This already exists.';
      case 'storage_file_type_unsupported': return 'This file type is not supported.';
      case 'storage_invalid_file_size':     return 'File size exceeds the limit.';
      case 'storage_bucket_not_found':      return 'Storage is not configured correctly.';
      case 'general_rate_limit_exceeded':   return 'Too many requests. Please slow down.';
      case 'general_server_error':          return 'Server error. Please try again.';
    }
    if (message.toLowerCase().includes('fetch') ||
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('network')) {
      return 'Network error. Check your connection and try again.';
    }
    return 'Something went wrong. Please try again.';
  }

  get isNotFound(): boolean {
    return this.code === 404 || this.type === 'document_not_found';
  }
  get isUnauthorized(): boolean {
    return this.code === 401 ||
      this.type === 'user_unauthorized' ||
      this.type === 'user_session_not_found';
  }
  get isRetryable(): boolean {
    return this.code === 429 || this.code >= 500 ||
      this.type === 'general_rate_limit_exceeded' ||
      this.userMessage.includes('Network');
  }
}

export function wrapError(raw: unknown): AppError {
  if (raw instanceof AppError) return raw;
  return new AppError(raw);
}

export function getErrorMessage(raw: unknown): string {
  if (raw instanceof AppError) return raw.userMessage;
  return new AppError(raw).userMessage;
}

/**
 * Structured logger. Swap console.error for Sentry/LogRocket in production.
 */
export function logServiceError(context: string, error: unknown): void {
  const appErr = error instanceof AppError ? error : new AppError(error);
  // eslint-disable-next-line no-console
  console.error(`[${context}]`, { code: appErr.code, type: appErr.type, message: appErr.message });
}
