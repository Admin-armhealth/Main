
import { redactPHI } from '../src/lib/privacy';

const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function assertRedacted(input: string, label: string, shouldNotContain: string[]) {
    // For this test, we assume we might NOT know the patient name for some cases, 
    // but if we DO, we pass it.
    // Let's assume a standard context where we DO catch the name if provided.
    const knownName = "Johnathan Doe";
    const result = redactPHI(input, knownName);

    let failed = false;
    const failures: string[] = [];

    shouldNotContain.forEach(term => {
        if (result.includes(term)) {
            failed = true;
            failures.push(term);
        }
    });

    if (failed) {
        console.log(`${RED}FAIL: ${label}${RESET}`);
        console.log(`   Input:    "${input}"`);
        console.log(`   Result:   "${result}"`);
        console.log(`   Leaked:   ${failures.join(", ")}`);
    } else {
        console.log(`${GREEN}PASS: ${label}${RESET}`);
    }
}

console.log(`${BOLD}--- Starting HIPAA Edge Case Tests ---${RESET}\n`);

// 1. DATES
assertRedacted("DOB: 01/15/1980", "Standard Date MM/DD/YYYY", ["01/15/1980"]);
assertRedacted("Born on 1980-01-15", "ISO Date YYYY-MM-DD", ["1980-01-15"]);
assertRedacted("DOB 1/5/80", "Short Date M/D/YY", ["1/5/80"]); // Edge case: regex often misses 2-digit years if not careful
assertRedacted("Date: 12-25-2023", "Hyphenated MM-DD-YYYY", ["12-25-2023"]);

// 2. PHONE NUMBERS
assertRedacted("Call 555-123-4567", "Standard Phone", ["555-123-4567"]);
assertRedacted("Mobile: (555) 123-4567", "Parens Phone", ["(555) 123-4567"]);
assertRedacted("Phone: 555.123.4567", "Dot Phone", ["555.123.4567"]);
assertRedacted("Contact: +1 555 123 4567", "International Format", ["555 123 4567"]);

// 3. IDs / SSN
assertRedacted("SSN: 123-45-6789", "SSN Format", ["123-45-6789"]);
assertRedacted("MRN: 123456789", "Long Numeric ID", ["123456789"]);
assertRedacted("Account: 98765432", "8-digit ID", ["98765432"]);
assertRedacted("ShortID: 123456", "6-digit ID (False Positive check - should NOT redact per current 8+ rule)", []);
// ^ Note: We deliberately might NOT want to redact short numbers like "Weight 180" or "Height 170" or "Zip 90210" if we get too aggressive.

// 4. NAMES (Case Insensitivity & Partial)
assertRedacted("Patient johnathan doe arrived", "Lowercase Name", ["johnathan doe"]);
assertRedacted("Mr. DOE, JOHNATHAN", "Uppercase Name", ["DOE, JOHNATHAN"]); // This might fail if we only match exact "First Last" string.
// Let's see how smart our logic is. If we pass "Johnathan Doe", does it catch "Doe, Johnathan"? Probably not, but let's test.

// 5. EMAILS (Standard Regex usually catches this)
assertRedacted("Email: john.doe@example.com", "Email Address", ["john.doe@example.com"]);

// 6. ALPHANUMERIC IDs (Tricky)
assertRedacted("MRN: A12345678", "Alphanumeric ID", ["A12345678"]);

console.log(`\n${BOLD}--- End Tests ---${RESET}`);
