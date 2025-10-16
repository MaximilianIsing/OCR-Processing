const { pdfToTextOCR } = require('./pdfOCR');
const path = require('path');

// Example usage
async function main() {
    const inputPdf = path.join(__dirname, 'TheinternationalOrderClimateCrisis (1).pdf');
    const outputTxt = path.join(__dirname, 'output.txt');
    
    try {
        const result = await pdfToTextOCR(inputPdf, outputTxt);
        console.log(`\nSuccess! Processed ${result.pageCount} pages.`);
        console.log(`Output saved to: ${outputTxt}`);
    } catch (error) {
        console.error('Failed to process PDF:', error);
        process.exit(1);
    }
}

main();

