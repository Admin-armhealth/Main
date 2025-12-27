
import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { redactPHI } from './privacy';

describe('redactPHI', () => {
    it('should redact valid email addresses', () => {
        const input = "Contact john.doe@example.com for info";
        const expected = "Contact [EMAIL] for info";
        assert.strictEqual(redactPHI(input), expected);
    });

    it('should redact specific dates (MM/DD/YYYY)', () => {
        const input = "DOB: 01/01/1980";
        const expected = "DOB: [DATE]";
        assert.strictEqual(redactPHI(input), expected);
    });

    it('should redact specific dates (YYYY-MM-DD)', () => {
        const input = "Service Date: 2023-12-25";
        const expected = "Service Date: [DATE]";
        assert.strictEqual(redactPHI(input), expected);
    });

    it('should redact SSN patterns', () => {
        const input = "SSN: 123-45-6789";
        const expected = "SSN: [ID_SSN]";
        assert.strictEqual(redactPHI(input), expected);
    });

    it('should redact phone numbers', () => {
        const input = "Call 555-123-4567 immediately";
        const expected = "Call [PHONE] immediately";
        assert.strictEqual(redactPHI(input), expected);
    });

    it('should redact explicit patient name if provided', () => {
        const input = "Patient John Doe presents with pain.";
        const expected = "Patient [PATIENT_NAME] presents with pain.";
        assert.strictEqual(redactPHI(input, "John Doe"), expected);
    });

    it('should handle empty input', () => {
        assert.strictEqual(redactPHI(null as any), null);
        assert.strictEqual(redactPHI(""), "");
    });
});
