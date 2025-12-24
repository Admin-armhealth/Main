
const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

const doc = new jsPDF();

// Base64 of a simple 1x1 pixel white image (placeholder)? 
// No, we need an image with TEXT for OCR to find.
// Let's use a very simple base64 URI of an image containing text "Tooth #14".
// Helper: Text to Image Base64 (using canvas in Node is hard, so we use a pre-calculated base64 for 'Tooth #14')
// Since we can't easily generate that here, let's use a known base64 string of a small image with text.
// Actually, for the purpose of the test "Uploaded a PDF with Image", any image works to prove the structure. 
// BUT we want OCR to match.
// Let's reuse the `public/ocr_test_sample.png`! We can read it in!

const imagePath = path.resolve(__dirname, '../public/ocr_test_sample.png');
const imageData = fs.readFileSync(imagePath).toString('base64');

// Add the image to the PDF
// format: 'PNG', x, y, width, height
doc.addImage(imageData, 'PNG', 10, 10, 180, 100);

// IMPORTANT: Do NOT add valid text layer via doc.text()
// This ensures that pdf-parse on the server finds NOTHING, forcing the fallback.

const pdfOutput = doc.output();
const outputPath = path.resolve(__dirname, '../public/scanned_test_sample.pdf');

fs.writeFileSync(outputPath, pdfOutput, 'binary');

console.log(`Generated PDF test sample at: ${outputPath}`);
