/**
 * CSRF Protection Utility
 * 
 * Implementation using the Double Submit Cookie pattern:
 * 1. Generate a random token
 * 2. Store in HTTP-only cookie AND include in request header/body
 * 3. Server validates both match
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure random token
 */
export function generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Set CSRF token in cookie (call from page load or API)
 */
export async function setCSRFToken(): Promise<string> {
    const token = generateCSRFToken();
    const cookieStore = await cookies();

    cookieStore.set(CSRF_TOKEN_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 hours
    });

    return token;
}

/**
 * Get current CSRF token from cookie
 */
export async function getCSRFToken(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(CSRF_TOKEN_NAME)?.value;
}

/**
 * Validate CSRF token from request
 * Returns true if valid, false if invalid
 */
export async function validateCSRFToken(req: NextRequest): Promise<boolean> {
    const cookieToken = req.cookies.get(CSRF_TOKEN_NAME)?.value;
    const headerToken = req.headers.get(CSRF_HEADER_NAME);

    // Both must exist and match
    if (!cookieToken || !headerToken) {
        console.warn('🚨 CSRF Validation Failed: Missing token');
        return false;
    }

    if (cookieToken !== headerToken) {
        console.warn('🚨 CSRF Validation Failed: Token mismatch');
        return false;
    }

    return true;
}

/**
 * Middleware helper to reject requests with invalid CSRF
 */
export function csrfErrorResponse(): NextResponse {
    return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
    );
}
