
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generatePDF() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 12;
    // MISMATCH SCENARIO:
    // Procedure Ordered: Transrectal Ultrasound (Prostate) -> Matches CPB-0001
    // Clinical Story: Knee Pain -> Mismatch!

    const text = `
    MEDICAL RECORD - URGENT
    --------------------------------------------------------
    Patient Name: John Doe
    DOB: 05/15/1961 (Age: 65)
    Date of Visit: Jan 08, 2026
    Provider: Dr. Sarah Smith, MD (Orthopedics)
    
    CHIEF COMPLAINT:
    "My left knee hurts when I walk."

    HISTORY OF PRESENT ILLNESS:
    65-year-old male presents with 3-week history of left knee pain following a fall in the garden.
    Pain is 6/10, sharp, localized to the medial joint line.
    No urinary symptoms. PSA not checked.

    PHYSICAL EXAM:
    MSK: Left Knee - Mild effusion present. Tenderness over medial meniscus.
    Range of Motion: Limited flexion directly due to pain.
    Lachman test: Negative.
    
    ASSESSMENT:
    1. Pain in Left Knee (M25.562)
    2. Suspected Meniscal Tear (S83.2)

    PLAN / ORDER:
    Requesting: Transrectal Ultrasound (TRUS) of Prostate (CPT 76872).
    
    (Note: This order seems incorrect for the diagnosis, but is requested for insurance verification test).
    
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
    const outputPath = path.resolve('sample_mismatch_record.pdf');
    fs.writeFileSync(outputPath, pdfBytes);

    console.log(`✅ Generated Mismatch PDF at: ${outputPath}`);
}

generatePDF().catch(console.error);
