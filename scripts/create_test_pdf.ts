
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function createInternalPdf() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const drawText = (text: string, x: number, y: number, size: number = 12, isBold: boolean = false) => {
        page.drawText(text, {
            x,
            y,
            size,
            font: isBold ? boldFont : font,
            color: rgb(0, 0, 0),
        });
    };

    let y = height - 50;

    drawText('DATE: 2024-12-16', 50, y);
    y -= 20;
    drawText('PROVIDER: Dr. Sarah Bennett, Orthopedics', 50, y);
    y -= 20;
    drawText('PATIENT: Michael Chen (DOB: 1982-08-15)', 50, y);
    y -= 20;
    drawText('ID: AET-55443322', 50, y);

    y -= 40;
    drawText('CLINICAL ENCOUNTER NOTE', 50, y, 16, true);
    y -= 30;

    drawText('Chief Complaint:', 50, y, 12, true);
    y -= 15;
    drawText('Patient presents with widening left knee pain, worsening over past 6 months.', 50, y);
    y -= 15;
    drawText('Reports instability and "locking" sensation. Difficulty descending stairs.', 50, y);

    y -= 30;
    drawText('History of Present Illness:', 50, y, 12, true);
    y -= 15;
    drawText('Pain is 7/10 with activity. Non-responsive to conservative measures.', 50, y);
    y -= 15;
    drawText('Patient completed 8 weeks of PT (Oct-Nov 2024) without relief.', 50, y);
    y -= 15;
    drawText('NSAIDs (Ibuprofen 600mg) providing minimal benefit.', 50, y);

    y -= 30;
    drawText('Physical Exam:', 50, y, 12, true);
    y -= 15;
    drawText('- Antalgic gait.', 50, y);
    y -= 15;
    drawText('- Positive McMurray test on medial joint line.', 50, y);
    y -= 15;
    drawText('- Mild effusion noted.', 50, y);

    y -= 30;
    drawText('Assessment/Plan:', 50, y, 12, true);
    y -= 15;
    drawText('Suspect Medial Meniscus Tear. Ordering MRI of Left Knee without contrast', 50, y);
    y -= 15;
    drawText('to evaluate extent of injury and potential need for arthroscopic repair.', 50, y);

    y -= 30;
    drawText('CODES SUBMITTED:', 50, y, 12, true);
    y -= 15;
    drawText('CPT: 73721 (MRI joint of lower extremity)', 50, y);
    y -= 15;
    drawText('ICD-10: M23.222 (Derangement of posterior horn of medial meniscus)', 50, y);

    const pdfBytes = await pdfDoc.save();
    const outputPath = path.resolve('sample_clinical_notes.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`Successfully created test PDF at: ${outputPath}`);
}

createInternalPdf().catch(err => console.error(err));
