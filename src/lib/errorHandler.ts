/**
 * API Error Handler Utility
 * 
 * Centralized error handling for API responses with user-friendly messages.
 */

export interface APIError {
    message: string;
    code?: string;
    status?: number;
    retryAfter?: number;
}

/**
 * Standard error messages for common scenarios
 */
export const ERROR_MESSAGES = {
    // Network errors
    NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',

    // Rate limiting
    RATE_LIMIT: 'You\'ve made too many requests. Please wait a moment before trying again.',

    // Timeouts
    TIMEOUT: 'The request is taking longer than expected. Please try again.',

    // Auth errors
    UNAUTHORIZED: 'Your session has expired. Please sign in again.',
    FORBIDDEN: 'You don\'t have permission to perform this action.',

    // Validation errors
    VALIDATION_ERROR: 'Please check your input and try again.',
    MISSING_REQUIRED: 'Please fill in all required fields.',

    // Server errors
    SERVER_ERROR: 'Something went wrong on our end. Please try again later.',

    // AI specific
    AI_ERROR: 'There was an issue generating the content. Please try again.',
    AI_TIMEOUT: 'The AI is taking too long to respond. Please try again with a shorter input.',

    // Generic
    UNKNOWN: 'An unexpected error occurred. Please try again.'
};

/**
 * Parse API response and return user-friendly error
 */
export function parseAPIError(response: Response, body?: any): APIError {
    const status = response.status;

    // Rate limiting
    if (status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        return {
            message: ERROR_MESSAGES.RATE_LIMIT,
            code: 'RATE_LIMIT',
            status,
            retryAfter
        };
    }

    // Auth errors
    if (status === 401) {
        return {
            message: ERROR_MESSAGES.UNAUTHORIZED,
            code: 'UNAUTHORIZED',
            status
        };
    }

    if (status === 403) {
        return {
            message: ERROR_MESSAGES.FORBIDDEN,
            code: 'FORBIDDEN',
            status
        };
    }

    // Validation errors
    if (status === 400 || status === 422) {
        const serverMessage = body?.error || body?.message;
        return {
            message: serverMessage || ERROR_MESSAGES.VALIDATION_ERROR,
            code: 'VALIDATION',
            status
        };
    }

    // Server errors
    if (status >= 500) {
        return {
            message: ERROR_MESSAGES.SERVER_ERROR,
            code: 'SERVER_ERROR',
            status
        };
    }

    // Unknown
    return {
        message: body?.error || body?.message || ERROR_MESSAGES.UNKNOWN,
        code: 'UNKNOWN',
        status
    };
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
    if (error?.name === 'AbortError') return true;
    if (error?.message?.toLowerCase().includes('timeout')) return true;
    if (error?.message?.toLowerCase().includes('timed out')) return true;
    return false;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) return true;
    if (error?.message?.toLowerCase().includes('network')) return true;
    if (error?.message?.toLowerCase().includes('connection')) return true;
    return false;
}

/**
 * Get user-friendly message for any error
 */
export function getUserFriendlyError(error: any): string {
    if (isTimeoutError(error)) {
        return ERROR_MESSAGES.TIMEOUT;
    }

    if (isNetworkError(error)) {
        return ERROR_MESSAGES.NETWORK_ERROR;
    }

    if (error?.message) {
        // Check for specific AI errors
        if (error.message.includes('AI request timed out')) {
            return ERROR_MESSAGES.AI_TIMEOUT;
        }

        // Check for rate limit in message
        if (error.message.toLowerCase().includes('rate limit')) {
            return ERROR_MESSAGES.RATE_LIMIT;
        }

        return error.message;
    }

    return ERROR_MESSAGES.UNKNOWN;
}
