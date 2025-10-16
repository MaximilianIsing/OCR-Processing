# PDF OCR API Usage

A REST API that extracts text from PDF files using OCR with parallel processing.

## API Endpoints

### Health Check
```
GET /
```

**Response:**
```json
{
  "status": "ok",
  "message": "PDF OCR API is running",
  "endpoints": {
    "health": "GET /",
    "extractText": "POST /extract-text"
  }
}
```

### Extract Text from PDF
```
POST /extract-text
```

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: PDF file with field name `pdf`

**Response (Success):**
```json
{
  "success": true,
  "filename": "document.pdf",
  "pageCount": 10,
  "textLength": 5432,
  "text": "Extracted text content here..."
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to process PDF",
  "message": "Error details here"
}
```

## Usage Examples

### Using cURL
```bash
curl -X POST \
  -F "pdf=@/path/to/your/document.pdf" \
  http://localhost:3000/extract-text
```

### Using Python (requests)
```python
import requests

url = "http://localhost:3000/extract-text"
files = {"pdf": open("document.pdf", "rb")}

response = requests.post(url, files=files)
data = response.json()

if data["success"]:
    print(f"Extracted {data['textLength']} characters from {data['pageCount']} pages")
    print(data["text"])
else:
    print(f"Error: {data['message']}")
```

### Using JavaScript (fetch)
```javascript
const formData = new FormData();
formData.append('pdf', fileInput.files[0]);

fetch('http://localhost:3000/extract-text', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log(`Extracted text from ${data.pageCount} pages`);
    console.log(data.text);
  } else {
    console.error('Error:', data.message);
  }
})
.catch(error => console.error('Error:', error));
```

### Using Postman
1. Select `POST` method
2. Enter URL: `http://localhost:3000/extract-text`
3. Go to `Body` tab
4. Select `form-data`
5. Add key: `pdf` (change type to `File`)
6. Select your PDF file
7. Click `Send`

## Limitations

- Maximum file size: **50MB**
- Maximum pages: **30 pages**
- Only PDF files are accepted
- Processing time depends on:
  - Number of pages
  - Image quality/complexity
  - Available CPU resources

## Error Codes

- `400` - Bad request (no file, wrong file type, file too large, too many pages)
- `500` - Server error (processing failed)

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
node server.js
```

3. Server will run on `http://localhost:3000`

## Deployment

The API is Docker-ready and configured for deployment on platforms like Render, Heroku, Railway, etc.

