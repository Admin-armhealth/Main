
const fs = require('fs');
const path = require('path');

async function testOO() {
    try {
        const pdf = require('pdf-parse');
        const PDFParse = pdf.PDFParse || pdf.default?.PDFParse || pdf;

        console.log('Instantiating PDFParse with options...');
        // Guessing options structure based on error
        const instance = new PDFParse({ verbosityLevel: 0 });

        const pdfPath = path.resolve('sample_clinical_notes.pdf');
        if (!fs.existsSync(pdfPath)) { console.log('No PDF found'); return; }
        const buffer = fs.readFileSync(pdfPath);

        console.log('Loading buffer...');
        await instance.load(buffer);

        console.log('Getting text...');
        const text = await instance.getText();

        console.log('Success! Text length:', text.length);
        console.log('Snippet:', text.substring(0, 50));

        if (instance.destroy) {
            instance.destroy();
        }

    } catch (e) {
        console.error('OO Test Failed:', e);
    }
}

testOO();
