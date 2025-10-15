# PDF OCR Text Extractor

A Node.js function that extracts text from PDF files using OCR (Optical Character Recognition) with parallel page processing for maximum speed.

## Features

- ✅ Single JavaScript function
- ✅ Parallel OCR processing of all pages
- ✅ Cross-platform (Windows, Linux, macOS)
- ✅ **Render-ready** - works on Render servers with proper setup
- ✅ Outputs cleaned text file with no extra whitespace

## System Requirements

This solution requires **poppler-utils** to be installed on your system.

### Linux (Ubuntu/Debian) - Including Render
```bash
sudo apt-get update
sudo apt-get install -y poppler-utils
```

### Windows
1. Download poppler for Windows: https://github.com/oschwartz10612/poppler-windows/releases/
2. Extract to `C:\Program Files\poppler`
3. Add `C:\Program Files\poppler\Library\bin` to your PATH environment variable
4. Restart your terminal/IDE

### macOS
```bash
brew install poppler
```

## Installation

```bash
npm install
```

## Usage

```javascript
const { pdfToTextOCR } = require('./pdfOCR');

async function example() {
    await pdfToTextOCR('input.pdf', 'output.txt');
}

example();
```

## Function Signature

```javascript
async function pdfToTextOCR(inputPdfPath, outputTxtPath)
```

**Parameters:**
- `inputPdfPath` (string): Path to the input PDF file
- `outputTxtPath` (string): Path where the extracted text will be saved

**Returns:**
- `Promise<{text: string, pageCount: number}>`: Object containing the extracted text and page count

## How It Works

1. Converts PDF pages to PNG images using poppler (200 DPI)
2. Processes all pages in parallel using Tesseract.js OCR
3. Combines and cleans the text (removes extra whitespace/newlines)
4. Writes the result to a text file
5. Cleans up temporary image files

## Deploying to Render

### Option 1: Using render.yaml (Recommended)

The included `render.yaml` file automatically installs poppler-utils during build:

1. Push your code to GitHub
2. Connect your repo to Render
3. Render will automatically detect `render.yaml` and install dependencies

### Option 2: Manual Configuration

1. Create a new Web Service on Render
2. Set build command:
   ```bash
   apt-get update && apt-get install -y poppler-utils && npm install
   ```
3. Set start command: `node your-server.js`

**Important**: Render uses Ubuntu, so poppler-utils will install without issues.

## Example

Run the included example:

```bash
node example.js
```

This will process the PDF in the current directory and output the text.

## Character Support

The OCR is configured to recognize:
- Letters: A-Z, a-z
- Numbers: 0-9
- Special characters: ` .,!?;:()[]{}'"-_=+*/&%$#@~\`<>|\\`

## Performance

All pages are processed in parallel, making the extraction very fast even for large PDFs. Processing time depends on:
- Number of pages
- Image complexity
- Available CPU cores

## Error Handling

- If OCR fails on a specific page, an error is logged but the process continues
- Failed pages return empty text instead of crashing the entire process
- Full error details are logged to console
- Temporary files are cleaned up even if errors occur

## Dependencies

- **tesseract.js**: JavaScript OCR engine (pure JS, no system dependencies)
- **pdf-poppler**: Node.js wrapper for poppler-utils PDF rendering

## Troubleshooting

### "Error: spawn pdftoppm ENOENT" on Windows
- Poppler is not installed or not in PATH
- Follow the Windows installation instructions above

### "Error: spawn pdftoppm ENOENT" on Linux/Render
- poppler-utils not installed
- Run: `sudo apt-get install -y poppler-utils`
- Or ensure your render.yaml is configured correctly

### OCR is slow
- Reduce `density` in the options (currently 200)
- Lower density = faster processing but lower accuracy
- Trade-off between speed and text quality
