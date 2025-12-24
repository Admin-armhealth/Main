
import { redactPHI } from '../src/lib/privacy';

const sampleText = `
Patient: John Doe
DOB: 01/15/1980
MRN: 12345678
NPI: 9876543210

History: Patient states left knee pain started on 2024-05-20.
Plan: MRI of Left Knee.
`;

const knownName = "John Doe";

console.log("--- Original Text ---");
console.log(sampleText);

const redacted = redactPHI(sampleText, knownName);

console.log("\n--- Redacted Text ---");
console.log(redacted);

// Assertions
if (redacted.includes("John Doe")) console.error("FAIL: Name not redacted");
else console.log("PASS: Name redacted");

if (redacted.includes("01/15/1980")) console.error("FAIL: DOB not redacted");
else console.log("PASS: DOB redacted");

if (redacted.includes("12345678")) console.error("FAIL: MRN not redacted");
else console.log("PASS: MRN redacted");
