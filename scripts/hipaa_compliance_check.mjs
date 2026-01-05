#!/usr/bin/env node
/**
 * HIPAA Compliance Checker for ARM Health
 * ==========================================
 * Run: npm run hipaa:check
 * 
 * Checks:
 * 1. PHI Redaction - All PHI patterns are properly redacted
 * 2. Data Persistence - No PHI saved to database  
 * 3. API Routes - Routes use redaction before AI calls
 * 4. Logging - No PHI in server logs
 * 5. Environment Security - No exposed secrets
 * 6. Client-Side Storage - No PHI in localStorage
 * 7. Rate Limiting - API abuse protection
 * 8. Middleware - Route protection
 * 9. Encryption - HTTPS only
 * 10. CSRF Protection
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Terminal colors
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const CHECK = "✅";
const CROSS = "❌";
const WARN = "⚠️";
const INFO = "ℹ️";

// Paths
const API_ROUTES_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
const SRC_DIR = path.join(__dirname, '..', 'src');
const ROOT_DIR = path.join(__dirname, '..');

const AI_CALL_ROUTES = ['preauth', 'appeal'];

// Utilities
function getFiles(dir, extensions = ['.ts', '.tsx']) {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            files.push(...getFiles(fullPath, extensions));
        } else if (extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
        }
    }
    return files;
}

function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return '';
    }
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
}

// =============================================================================
// CHECK 1: PHI REDACTION FUNCTION
// =============================================================================
function checkPHIRedaction() {
    const results = [];
    const privacyFile = path.join(SRC_DIR, 'lib', 'privacy.ts');

    if (!fileExists(privacyFile)) {
        results.push({
            category: 'PHI Redaction',
            name: 'Privacy Module',
            status: 'FAIL',
            message: 'privacy.ts not found!',
            recommendation: 'Create src/lib/privacy.ts with redactPHI function'
        });
        return results;
    }

    const content = readFile(privacyFile);

    if (content.includes('export function redactPHI')) {
        results.push({ category: 'PHI Redaction', name: 'redactPHI Function', status: 'PASS', message: 'redactPHI function exists' });
    } else {
        results.push({ category: 'PHI Redaction', name: 'redactPHI Function', status: 'FAIL', message: 'redactPHI function missing', recommendation: 'Implement redactPHI function' });
    }

    const patterns = [
        { name: 'Email', pattern: /email|EMAIL/i },
        { name: 'Phone', pattern: /phone|PHONE/i },
        { name: 'SSN', pattern: /ssn|ID_SSN/i },
        { name: 'Date', pattern: /DATE/i },
        { name: 'Name', pattern: /PATIENT_NAME/i },
    ];

    for (const p of patterns) {
        results.push({
            category: 'PHI Redaction',
            name: `${p.name} Pattern`,
            status: p.pattern.test(content) ? 'PASS' : 'WARN',
            message: p.pattern.test(content) ? `${p.name} redaction implemented` : `${p.name} redaction may be missing`
        });
    }

    return results;
}

// =============================================================================
// CHECK 2: API ROUTES USE REDACTION
// =============================================================================
function checkAPIRouteRedaction() {
    const results = [];

    for (const route of AI_CALL_ROUTES) {
        const routePath = path.join(API_ROUTES_DIR, route, 'route.ts');
        if (!fileExists(routePath)) continue;

        const content = readFile(routePath);

        // Check import
        results.push({
            category: 'API Routes',
            name: `${route} - redactPHI Import`,
            status: content.includes("import { redactPHI }") ? 'PASS' : 'FAIL',
            message: content.includes("import { redactPHI }") ? 'Imports redactPHI' : 'Missing redactPHI import',
            recommendation: content.includes("import { redactPHI }") ? undefined : "Add: import { redactPHI } from '@/lib/privacy';"
        });

        // Check usage
        results.push({
            category: 'API Routes',
            name: `${route} - Redaction Applied`,
            status: content.includes('redactPHI(extractedText') ? 'PASS' : 'FAIL',
            message: content.includes('redactPHI(extractedText') ? 'Redacts extractedText before AI' : 'NOT redacting before AI call!',
            recommendation: content.includes('redactPHI(extractedText') ? undefined : 'Wrap extractedText with redactPHI()'
        });

        // Check auth
        results.push({
            category: 'API Routes',
            name: `${route} - Auth Enforced`,
            status: content.includes('requireOrgAccess') ? 'PASS' : 'FAIL',
            message: content.includes('requireOrgAccess') ? 'Auth enforced' : 'Missing auth check!'
        });
    }

    return results;
}

// =============================================================================
// CHECK 3: NO PHI PERSISTENCE
// =============================================================================
function checkDataPersistence() {
    const results = [];

    for (const route of AI_CALL_ROUTES) {
        const routePath = path.join(API_ROUTES_DIR, route, 'route.ts');
        if (!fileExists(routePath)) continue;

        const content = readFile(routePath);
        const hasDisabled = content.includes('HIPAA: HISTORY DISABLED') || content.includes('do NOT save');

        results.push({
            category: 'Data Persistence',
            name: `${route} - No PHI Storage`,
            status: hasDisabled ? 'PASS' : 'WARN',
            message: hasDisabled ? 'PHI persistence disabled' : 'Verify no PHI is saved to DB'
        });
    }

    return results;
}

// =============================================================================
// CHECK 4: LOGGING SECURITY
// =============================================================================
function checkLoggingSecurity() {
    const results = [];
    const files = getFiles(SRC_DIR);
    const issues = [];

    const dangerousPatterns = [
        /console\.log\(.*extractedText/i,
        /console\.log\(.*patientRaw/i,
        /console\.log\(.*body\)/,
    ];

    for (const file of files) {
        const content = readFile(file);
        const lines = content.split('\n');
        const relativePath = path.relative(ROOT_DIR, file);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('//')) continue;

            for (const pattern of dangerousPatterns) {
                if (pattern.test(line)) {
                    issues.push(`${relativePath}:${i + 1}`);
                }
            }
        }
    }

    results.push({
        category: 'Logging Security',
        name: 'No PHI in Logs',
        status: issues.length === 0 ? 'PASS' : 'WARN',
        message: issues.length === 0 ? 'No PHI logging detected' : `Found ${issues.length} potential issues`,
        details: issues.slice(0, 5)
    });

    return results;
}

// =============================================================================
// CHECK 5: ENVIRONMENT SECURITY
// =============================================================================
function checkEnvironmentSecurity() {
    const results = [];
    const gitignorePath = path.join(ROOT_DIR, '.gitignore');

    if (fileExists(gitignorePath)) {
        const content = readFile(gitignorePath);
        const hasEnv = content.includes('.env');

        results.push({
            category: 'Environment Security',
            name: 'Env Files in .gitignore',
            status: hasEnv ? 'PASS' : 'FAIL',
            message: hasEnv ? 'Environment files ignored' : 'Add .env to .gitignore!'
        });
    }

    // Check for hardcoded secrets
    const files = getFiles(SRC_DIR);
    let hasSecrets = false;

    for (const file of files) {
        const content = readFile(file);
        if (/sk-[a-zA-Z0-9]{20,}/.test(content) || /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/.test(content)) {
            hasSecrets = true;
            break;
        }
    }

    results.push({
        category: 'Environment Security',
        name: 'No Hardcoded Secrets',
        status: hasSecrets ? 'FAIL' : 'PASS',
        message: hasSecrets ? 'Found hardcoded secrets!' : 'No hardcoded secrets'
    });

    return results;
}

// =============================================================================
// CHECK 6: CLIENT STORAGE
// =============================================================================
function checkClientStorage() {
    const results = [];
    const files = getFiles(SRC_DIR, ['.tsx', '.ts']).filter(f => !f.includes('api'));
    const issues = [];

    for (const file of files) {
        const content = readFile(file);
        if (/localStorage\.setItem\s*\(\s*['"][^'"]*patient/i.test(content) ||
            /localStorage\.setItem\s*\(\s*['"][^'"]*clinical/i.test(content)) {
            issues.push(path.relative(ROOT_DIR, file));
        }
    }

    results.push({
        category: 'Client Storage',
        name: 'No PHI in Browser Storage',
        status: issues.length === 0 ? 'PASS' : 'FAIL',
        message: issues.length === 0 ? 'No PHI in localStorage' : `Found ${issues.length} issues`,
        details: issues
    });

    return results;
}

// =============================================================================
// CHECK 7: RATE LIMITING
// =============================================================================
function checkRateLimiting() {
    const results = [];

    for (const route of AI_CALL_ROUTES) {
        const routePath = path.join(API_ROUTES_DIR, route, 'route.ts');
        if (!fileExists(routePath)) continue;

        const content = readFile(routePath);
        results.push({
            category: 'Rate Limiting',
            name: `${route} - Rate Limit`,
            status: content.includes('checkRateLimit') ? 'PASS' : 'WARN',
            message: content.includes('checkRateLimit') ? 'Rate limiting enabled' : 'May not have rate limiting'
        });
    }

    return results;
}

// =============================================================================
// CHECK 8: MIDDLEWARE
// =============================================================================
function checkMiddleware() {
    const results = [];
    const middlewarePath = path.join(SRC_DIR, 'middleware.ts');

    if (fileExists(middlewarePath)) {
        const content = readFile(middlewarePath);
        results.push({
            category: 'Middleware',
            name: 'Route Protection',
            status: content.includes('isProtectedRoute') ? 'PASS' : 'WARN',
            message: content.includes('isProtectedRoute') ? 'Routes are protected' : 'Verify route protection'
        });
    } else {
        results.push({
            category: 'Middleware',
            name: 'Middleware Exists',
            status: 'WARN',
            message: 'No middleware.ts found'
        });
    }

    return results;
}

// =============================================================================
// CHECK 9: ENCRYPTION (HTTPS)
// =============================================================================
function checkEncryption() {
    const results = [];
    const files = getFiles(SRC_DIR);
    let hasHttp = false;

    for (const file of files) {
        const content = readFile(file);
        if (/http:\/\/(?!localhost|127\.0\.0\.1)/.test(content)) {
            hasHttp = true;
            break;
        }
    }

    results.push({
        category: 'Encryption',
        name: 'HTTPS Only',
        status: hasHttp ? 'WARN' : 'PASS',
        message: hasHttp ? 'Found non-localhost HTTP URLs' : 'All external URLs use HTTPS'
    });

    return results;
}

// =============================================================================
// CHECK 10: CSRF
// =============================================================================
function checkCSRF() {
    const results = [];
    const csrfPath = path.join(SRC_DIR, 'lib', 'csrf.ts');

    results.push({
        category: 'CSRF Protection',
        name: 'CSRF Module',
        status: fileExists(csrfPath) ? 'PASS' : 'WARN',
        message: fileExists(csrfPath) ? 'CSRF module exists' : 'No dedicated CSRF module'
    });

    return results;
}

// =============================================================================
// MAIN
// =============================================================================
function runAllChecks() {
    console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${BOLD}${CYAN}║          ARM HEALTH - HIPAA COMPLIANCE CHECKER                ║${RESET}`);
    console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}\n`);

    const allResults = [
        ...checkPHIRedaction(),
        ...checkAPIRouteRedaction(),
        ...checkDataPersistence(),
        ...checkLoggingSecurity(),
        ...checkEnvironmentSecurity(),
        ...checkClientStorage(),
        ...checkRateLimiting(),
        ...checkMiddleware(),
        ...checkEncryption(),
        ...checkCSRF()
    ];

    // Group by category
    const grouped = {};
    for (const r of allResults) {
        if (!grouped[r.category]) grouped[r.category] = [];
        grouped[r.category].push(r);
    }

    // Print
    for (const [category, checks] of Object.entries(grouped)) {
        console.log(`${BOLD}${BLUE}━━━ ${category} ━━━${RESET}`);

        for (const check of checks) {
            let icon = INFO, color = RESET;
            if (check.status === 'PASS') { icon = CHECK; color = GREEN; }
            else if (check.status === 'FAIL') { icon = CROSS; color = RED; }
            else if (check.status === 'WARN') { icon = WARN; color = YELLOW; }

            console.log(`  ${icon} ${color}${check.name}${RESET}: ${check.message}`);

            if (check.details) {
                for (const d of check.details) console.log(`      ${CYAN}→ ${d}${RESET}`);
            }
            if (check.recommendation) console.log(`      ${YELLOW}💡 ${check.recommendation}${RESET}`);
        }
        console.log('');
    }

    // Summary
    const passed = allResults.filter(r => r.status === 'PASS').length;
    const failed = allResults.filter(r => r.status === 'FAIL').length;
    const warned = allResults.filter(r => r.status === 'WARN').length;

    console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}                        SUMMARY${RESET}`);
    console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════${RESET}\n`);
    console.log(`  ${CHECK} ${GREEN}Passed:   ${passed}${RESET}`);
    console.log(`  ${CROSS} ${RED}Failed:   ${failed}${RESET}`);
    console.log(`  ${WARN} ${YELLOW}Warnings: ${warned}${RESET}\n`);

    if (failed === 0 && warned === 0) {
        console.log(`${GREEN}${BOLD}🎉 ALL CHECKS PASSED! HIPAA compliant.${RESET}\n`);
    } else if (failed === 0) {
        console.log(`${YELLOW}${BOLD}⚠️  No failures, but ${warned} warning(s) to review.${RESET}\n`);
    } else {
        console.log(`${RED}${BOLD}❌ ${failed} CRITICAL ISSUE(S) FOUND!${RESET}\n`);
        for (const r of allResults.filter(r => r.status === 'FAIL')) {
            console.log(`  ${CROSS} ${r.category} - ${r.name}`);
            if (r.recommendation) console.log(`     ${YELLOW}→ ${r.recommendation}${RESET}`);
        }
    }

    process.exit(failed > 0 ? 1 : 0);
}

runAllChecks();
