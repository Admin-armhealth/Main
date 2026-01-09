
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generatePDF() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 12;
    const text = `
    MEDICAL RECORD
    --------------------------------------------------------
    Patient Name: John Doe
    DOB: 05/15/1961 (Age: 65)
    Date of Visit: Jan 08, 2026
    Provider: Dr. Sarah Smith, MD
    
    CHIEF COMPLAINT:
    Evaluation for elevated PSA.

    HISTORY OF PRESENT ILLNESS:
    65-year-old male presents for follow-up of elevated PSA levels. 
    PSA history: 3.2 (2024), 4.5 (2025), current 6.4 ng/mL.
    Patient denies urinary retention or dysuria.

    PHYSICAL EXAM:
    Genitourinary: Normal external genitalia. 
    Digital Rectal Exam (DRE): Prostate enlarged (~40g). 
    Discrete, firm nodule palpable on the left lateral lobe. 
    Right lobe smooth.

    ASSESSMENT:
    1. Elevated PSA (R97.20)
    2. Nodule of Prostate (N40.2)
    3. Benign Prostatic Hyperplasia (N40.0)

    PLAN:
    Given the combination of elevated PSA (>4.0) and palpable nodule on DRE, 
    proceeding with Transrectal Ultrasound (TRUS) guided prostate biopsy. 
    
    Risks/benefits discussed with patient. Patient consents.
    
    Signed,
    Dr. Sarah Smith, MD
    `;

    page.drawText(text, {
        x: 50,
        y: height - 50,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
        lineHeight: 18,
    });

    const pdfBytes = await pdfDoc.save();
    const outputPath = path.resolve('sample_medical_records.pdf');
    fs.writeFileSync(outputPath, pdfBytes);

    console.log(`✅ Generated PDF at: ${outputPath}`);
}

generatePDF().catch(console.error);
