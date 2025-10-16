const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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
        
        // Get page count first
        const { stdout: pageInfo } = await execAsync(`pdfinfo "${inputPdfPath}"`);
        const pageCountMatch = pageInfo.match(/Pages:\s+(\d+)/);
        const pageCount = pageCountMatch ? parseInt(pageCountMatch[1]) : 0;
        
        if (pageCount === 0) {
            throw new Error('Could not determine page count from PDF');
        }
        
        console.log(`Found ${pageCount} pages in PDF`);
        
        // Enforce 30 page limit
        if (pageCount > 30) {
            throw new Error(`PDF has ${pageCount} pages. Maximum allowed is 30 pages.`);
        }
        
        // Convert PDF to images using pdftoppm (part of poppler-utils)
        // Using JPEG with lower DPI for faster processing and less memory/disk usage
        console.log('Converting PDF to images for OCR...');
        const outputPrefix = path.join(tempDir, 'page');
        await execAsync(`pdftoppm -jpeg -r 120 -jpegopt quality=85 "${inputPdfPath}" "${outputPrefix}"`);
        
        // Get list of generated image files
        const files = fs.readdirSync(tempDir)
            .filter(file => file.startsWith('page') && file.endsWith('.jpg'))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)[0]);
                const numB = parseInt(b.match(/\d+/)[0]);
                return numA - numB;
            });
        
        console.log(`Generated ${files.length} image files`);
        
        // Process pages in batches to avoid memory issues (important for Render free tier - 512MB limit)
        const BATCH_SIZE = 5; // Process 3 pages at a time - safe for 512MB memory limit
        const results = [];
        
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}`);
            
            const batchPromises = batch.map((file, batchIndex) => {
                const globalIndex = i + batchIndex;
                const imagePath = path.join(tempDir, file);
                return processPageOCR(imagePath, globalIndex, files.length);
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Delete processed images immediately to free up memory/disk
            batch.forEach(file => {
                try {
                    fs.unlinkSync(path.join(tempDir, file));
                } catch (e) {
                    // Ignore deletion errors
                }
            });
        }
        
        // Sort by index and combine text
        results.sort((a, b) => a.index - b.index);
        const fullText = results.map(r => r.text).join(' ');
        
        // Remove temp directory (images already deleted during processing)
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
    try {
        console.log(`Processing page ${index + 1}/${totalPages} with OCR...`);
        
        // Use native tesseract command (3-5x faster than tesseract.js)
        const outputBasePath = imagePath.replace(/\.[^.]+$/, '');
        const tesseractCmd = `tesseract "${imagePath}" "${outputBasePath}" -c tessedit_char_whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?;:()[]{}\'\\\"-_=+*/&%$#@~\\\`<>|\\\\" --psm 1 txt 2>&1`;
        
        await execAsync(tesseractCmd);
        
        // Read the output file
        const textFilePath = `${outputBasePath}.txt`;
        let text = '';
        
        if (fs.existsSync(textFilePath)) {
            text = fs.readFileSync(textFilePath, 'utf8');
            // Clean up the text file
            fs.unlinkSync(textFilePath);
        }
        
        console.log(`Page ${index + 1} complete`);
        
        return {
            index: index,
            text: text
        };
        
    } catch (error) {
        console.error(`Error processing page ${index + 1}:`, error);
        
        // Return empty text on error but don't fail the whole process
        return {
            index: index,
            text: ''
        };
    }
}

module.exports = { pdfToTextOCR };
