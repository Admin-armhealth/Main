/**
 * Rate Limiter Utility
 * 
 * Simple in-memory rate limiter using sliding window algorithm.
 * For production, consider Redis-based solution for distributed deployments.
 */

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

// In-memory store (per-server instance)
const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
    keyPrefix?: string;    // Prefix for the rate limit key
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number;       // Seconds until reset
    retryAfter?: number;   // Seconds to wait (if blocked)
}

/**
 * Check rate limit for a given identifier (usually IP or user ID)
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const key = `${config.keyPrefix || 'rl'}:${identifier}`;

    // Get or create record
    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
        // Create new window
        record = {
            count: 0,
            resetTime: now + config.windowMs
        };
        rateLimitStore.set(key, record);
    }

    const remaining = Math.max(0, config.maxRequests - record.count);
    const resetIn = Math.ceil((record.resetTime - now) / 1000);

    if (record.count >= config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetIn,
            retryAfter: resetIn
        };
    }

    // Increment counter
    record.count++;

    return {
        allowed: true,
        remaining: remaining - 1,
        resetIn
    };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
    // AI Generation endpoints - more restrictive
    AI_GENERATION: {
        windowMs: 60 * 1000,  // 1 minute
        maxRequests: 10,       // 10 requests per minute
        keyPrefix: 'ai'
    },

    // Authentication endpoints
    AUTH: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10,           // 10 attempts
        keyPrefix: 'auth'
    },

    // General API endpoints
    API: {
        windowMs: 60 * 1000,  // 1 minute
        maxRequests: 60,       // 60 requests per minute
        keyPrefix: 'api'
    }
};

/**
 * Get client identifier from request
 * Uses X-Forwarded-For for proxied requests, falls back to connection info
 */
export function getClientIdentifier(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    // Fallback - in production, you'd want to get the actual IP
    return 'unknown-client';
}

/**
 * Cleanup old rate limit records (call periodically)
 */
export function cleanupRateLimits(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 Rate Limit Cleanup: Removed ${cleaned} expired records`);
    }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
