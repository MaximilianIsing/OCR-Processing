const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const pdfPoppler = require('pdf-poppler');

/**
 * Extract text from PDF using OCR
 * @param {string} inputPdfPath - Path to input PDF file
 * @param {string} outputTxtPath - Path to output text file
 * @returns {Promise<{text: string, pageCount: number}>}
 */
async function pdfToTextOCR(inputPdfPath, outputTxtPath) {
    const tempDir = path.join(__dirname, 'temp_ocr');
    
    try {
        // Create temp directory
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        console.log(`Starting OCR extraction from: ${inputPdfPath}`);
        
        // Convert PDF to images with lower quality for speed
        const options = {
            format: 'png',
            out_dir: tempDir,
            out_prefix: 'page',
            page: null,
            density: 200  // Lower density = faster
        };
        
        console.log('Converting PDF to images for OCR...');
        await pdfPoppler.convert(inputPdfPath, options);
        
        // Get list of generated image files
        const files = fs.readdirSync(tempDir)
            .filter(file => file.startsWith('page') && file.endsWith('.png'))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)[0]);
                const numB = parseInt(b.match(/\d+/)[0]);
                return numA - numB;
            });
        
        console.log(`Found ${files.length} pages to process with OCR`);
        
        // Process all pages in parallel
        const ocrPromises = files.map((file, index) => 
            processPageOCR(path.join(tempDir, file), index, files.length)
        );
        
        // Wait for all pages to complete
        const results = await Promise.all(ocrPromises);
        
        // Sort by index and combine text
        results.sort((a, b) => a.index - b.index);
        const fullText = results.map(r => r.text).join(' ');
        
        // Clean up temp files
        files.forEach(file => {
            try {
                fs.unlinkSync(path.join(tempDir, file));
            } catch (e) {
                console.error(`Error deleting ${file}:`, e.message);
            }
        });
        
        // Remove temp directory
        try {
            fs.rmdirSync(tempDir);
        } catch (e) {
            console.warn(`Could not remove temp directory: ${e.message}`);
        }
        
        // Clean up text: remove newlines and extra spaces
        const cleanedText = fullText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Write to output file
        fs.writeFileSync(outputTxtPath, cleanedText, 'utf8');
        
        console.log('\n=== FULL OCR EXTRACTED TEXT ===');
        console.log(cleanedText);
        console.log('=== END OF OCR TEXT ===\n');
        console.log(`Text saved to: ${outputTxtPath}`);
        
        return {
            text: cleanedText,
            pageCount: files.length
        };
        
    } catch (error) {
        console.error('Error in PDF OCR extraction:', error);
        
        // Clean up temp directory on error
        try {
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir);
                files.forEach(file => {
                    try {
                        fs.unlinkSync(path.join(tempDir, file));
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                });
                fs.rmdirSync(tempDir);
            }
        } catch (e) {
            // Ignore cleanup errors
        }
        
        throw error;
    }
}

/**
 * Process a single page with OCR
 * @param {string} imagePath - Path to image file
 * @param {number} index - Page index
 * @param {number} totalPages - Total number of pages
 * @returns {Promise<{index: number, text: string}>}
 */
async function processPageOCR(imagePath, index, totalPages) {
    let worker = null;
    
    try {
        console.log(`Processing page ${index + 1}/${totalPages} with OCR...`);
        
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Create Tesseract worker
        worker = await createWorker('eng');
        
        // Configure Tesseract with optimized settings
        await worker.setParameters({
            tessedit_pageseg_mode: '6',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?;:()[]{}\'\"-_=+*/&%$#@~`<>|\\'
        });
        
        // Perform OCR
        const { data: { text } } = await worker.recognize(imageBuffer);
        
        console.log(`Page ${index + 1} complete`);
        
        // Cleanup worker
        await worker.terminate();
        
        return {
            index: index,
            text: text
        };
        
    } catch (error) {
        console.error(`Error processing page ${index + 1}:`, error);
        
        // Cleanup worker on error
        if (worker) {
            try {
                await worker.terminate();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        
        // Return empty text on error but don't fail the whole process
        return {
            index: index,
            text: ''
        };
    }
}

module.exports = { pdfToTextOCR };
