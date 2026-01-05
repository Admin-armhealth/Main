
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doc = new jsPDF();

// Add content
doc.setFontSize(16);
doc.text('INSURANCE PAYER INC.', 20, 20);
doc.setFontSize(10);
doc.text('123 Payer Way, Springfield, IL', 20, 26);

doc.setFontSize(14);
doc.text('NOTICE OF ADVERSE BENEFIT DETERMINATION', 20, 40);

doc.setFontSize(10);
doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
doc.text('Provider: Dr. Dentist', 20, 56);
doc.text('Patient: Jane Doe (Member ID: MEM-123456)', 20, 62);
doc.text('Claim ID: CLM-999999', 20, 68);

doc.line(20, 72, 190, 72);

doc.setFontSize(12);
doc.text('RE: Pre-Authorization Request for Dental Services', 20, 82);

doc.setFontSize(10);
doc.text('Service Requested:', 20, 92);
doc.text('- D2740: Crown - Porc/Ceramic Substrate', 30, 98);
doc.text('- Tooth: #19', 30, 104);

doc.setFontSize(12);
doc.text('Determination: DENIED', 20, 115);

doc.setFontSize(10);
doc.text('Reason for Denial:', 20, 125);
doc.text('Based on the clinical documentation submitted, the request does not meet the criteria', 20, 131);
doc.text('for medical necessity under Policy D-202 (Major Restorative Services).', 20, 135);

doc.text('Specifically:', 20, 145);
doc.text('1. The provided periapical X-ray does not demonstrate decay involving more than', 25, 151);
doc.text('   50% of the tooth structure.', 25, 155);
doc.text('2. There is no evidence of a fracture line or cusp failure requiring full coverage.', 25, 161);
doc.text('3. Conservative therapy (filling) has not been ruled out.', 25, 167);

doc.text('Please submit valid clinical notes, probing depths, and clear X-rays to support', 20, 180);
doc.text('the necessity of a full crown.', 20, 184);

doc.text('Sincerely,', 20, 200);
doc.text('Dental Director', 20, 206);

const outputPath = path.resolve(__dirname, '../dental_denial_letter.pdf');
doc.save(outputPath);

console.log(`Generated Dental Denial Letter at: ${outputPath}`);
