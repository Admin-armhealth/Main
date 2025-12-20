
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const formsDir = path.join(process.cwd(), 'public', 'forms');
if (!fs.existsSync(formsDir)) {
    fs.mkdirSync(formsDir, { recursive: true });
}

async function createTexasForm() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Texas Standard Prior Authorization Request', { x: 50, y: 750, size: 18, font });
    page.drawText('(Form NOFR001 Replica)', { x: 50, y: 730, size: 10, font });

    const createField = (name: string, label: string, y: number) => {
        page.drawText(label, { x: 50, y, size: 10, font });
        const textField = form.createTextField(name);
        textField.setText('');
        textField.addToPage(page, { x: 200, y: y - 5, width: 350, height: 20 });
    };

    createField('patient_name', 'Patient Name:', 700);
    createField('dob', 'Info: Date of Birth:', 670);
    createField('member_id', 'Member ID:', 640);
    createField('group_id', 'Group Number:', 610);
    createField('provider_name', 'Ordering Provider:', 580);
    createField('diagnosis_code', 'Diagnosis (ICD-10):', 480);

    const filePath = path.join(formsDir, 'texas_standard_prior_auth.pdf');
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);
    console.log(`Created: ${filePath}`);
}

async function createAetnaForm() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText('Aetna Precertification Request', { x: 50, y: 750, size: 20, font, color: rgb(0.5, 0, 0.5) }); // Purple branding

    const createField = (name: string, label: string, y: number) => {
        page.drawText(label, { x: 50, y, size: 10, font });
        const textField = form.createTextField(name);
        textField.addToPage(page, { x: 200, y: y - 5, width: 350, height: 20 });
    };

    createField('patient_name', 'Patient Name:', 700);
    createField('aetna_member_id', 'Aetna Member ID:', 670);
    createField('requesting_provider', 'Requesting Provider:', 640);
    createField('servicing_provider', 'Servicing Provider:', 610);
    createField('diagnosis', 'Primary Diagnosis:', 550);
    createField('cpt_codes', 'Procedure Codes:', 520);

    const filePath = path.join(formsDir, 'aetna_precertification.pdf');
    fs.writeFileSync(filePath, await pdfDoc.save());
    console.log(`Created: ${filePath}`);
}

async function createMedicaidForm() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    page.drawText('HEALTH INSURANCE CLAIM FORM', { x: 50, y: 750, size: 16, font });
    page.drawText('APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE', { x: 50, y: 735, size: 8, font });

    const createField = (name: string, label: string, y: number) => {
        page.drawText(label, { x: 50, y, size: 9, font });
        const textField = form.createTextField(name);
        textField.addToPage(page, { x: 200, y: y - 2, width: 350, height: 15 });
    };

    createField('ins_medicare_id', '1. MEDICARE/MEDICAID ID:', 700);
    createField('pat_name', '2. PATIENT NAME:', 680);
    createField('pat_dob', '3. PATIENT BIRTH DATE:', 660);
    createField('insured_name', '4. INSURED NAME:', 640);
    createField('diagnosis_nature', '21. DIAGNOSIS OR NATURE OF ILLNESS:', 500);

    const filePath = path.join(formsDir, 'cms_1500_claim.pdf');
    fs.writeFileSync(filePath, await pdfDoc.save());
    console.log(`Created: ${filePath}`);
}

async function run() {
    await createTexasForm();
    await createAetnaForm();
    await createMedicaidForm();
}

run().catch(console.error);
