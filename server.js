const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { pdfToTextOCR } = require('./pdfOCR');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'PDF OCR API is running',
        endpoints: {
            health: 'GET /',
            extractText: 'POST /extract-text'
        }
    });
});

// PDF OCR extraction endpoint
app.post('/extract-text', upload.single('pdf'), async (req, res) => {
    let uploadedFilePath = null;
    let outputFilePath = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No PDF file uploaded',
                message: 'Please upload a PDF file using the "pdf" field'
            });
        }

        console.log(`Received PDF upload: ${req.file.originalname} (${req.file.size} bytes)`);
        
        uploadedFilePath = req.file.path;
        outputFilePath = `${uploadedFilePath}_output.txt`;
        
        // Process PDF with OCR
        const result = await pdfToTextOCR(uploadedFilePath, outputFilePath);
        
        // Read the output text
        const extractedText = fs.readFileSync(outputFilePath, 'utf8');
        
        // Clean up uploaded file and output file
        if (fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }
        if (fs.existsSync(outputFilePath)) {
            fs.unlinkSync(outputFilePath);
        }
        
        // Return the extracted text
        res.json({
            success: true,
            filename: req.file.originalname,
            pageCount: result.pageCount,
            textLength: extractedText.length,
            text: extractedText
        });
        
    } catch (error) {
        console.error('Error processing PDF:', error);
        
        // Clean up files on error
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            try {
                fs.unlinkSync(uploadedFilePath);
            } catch (e) {
                console.error('Error deleting uploaded file:', e);
            }
        }
        if (outputFilePath && fs.existsSync(outputFilePath)) {
            try {
                fs.unlinkSync(outputFilePath);
            } catch (e) {
                console.error('Error deleting output file:', e);
            }
        }
        
        // Check if error is due to page limit
        if (error.message.includes('Maximum allowed is 30 pages')) {
            return res.status(400).json({
                success: false,
                error: 'PDF exceeds page limit',
                message: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to process PDF',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: 'Maximum file size is 50MB'
            });
        }
        return res.status(400).json({
            error: 'Upload error',
            message: error.message
        });
    }
    
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`PDF OCR API server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/`);
    console.log(`Extract text: POST http://localhost:${PORT}/extract-text`);
});

