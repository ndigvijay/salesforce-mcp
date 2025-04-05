const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csvImportService = require('../services/csvImport');
const csvReportService = require('../services/csvReport');
const logger = require('../utils/logger');
const os = require('os');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(os.tmpdir(), 'sf-uploads');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${path.basename(file.originalname, ext)}-${uniqueSuffix}${ext}`);
  }
});

// Create the multer upload instance
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (path.extname(file.originalname).toLowerCase() === '.csv') {
      return cb(null, true);
    }
    
    cb(new Error('Only CSV files are allowed'));
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Import contacts from CSV
router.post('/import/contacts', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }
    
    logger.info(`Processing uploaded CSV file: ${req.file.originalname}`);
    
    // Import contacts from the CSV file
    const result = await csvImportService.importContactsFromCSV(req.file.path);
    
    res.json(result);
  } catch (error) {
    logger.error('Error in /csv/import/contacts endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate a report of Contacts as CSV
router.post('/report/contacts', async (req, res) => {
  try {
    const { soql, reportName, description, filters } = req.body;
    
    let queryToExecute = soql;
    
    // If no SOQL provided, generate one using Claude
    if (!queryToExecute) {
      if (!description) {
        return res.status(400).json({ error: 'Either SOQL query or report description is required' });
      }
      
      logger.info(`Generating SOQL for report: ${reportName || 'Contacts Report'}`);
      
      const queryResult = await csvReportService.generateReportQuery(
        description,
        'Contact',
        { filters },
        req.anthropicKey
      );
      
      queryToExecute = queryResult.soqlQuery;
    }
    
    // Generate the CSV report
    const reportResult = await csvReportService.generateCsvReport(
      queryToExecute,
      reportName || 'Contacts_Report'
    );
    
    if (!reportResult.success) {
      return res.status(404).json(reportResult);
    }
    
    // Return the file as a download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportResult.filename}"`);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(reportResult.filePath);
    fileStream.pipe(res);
    
    // Clean up the file when done
    fileStream.on('end', () => {
      fs.unlinkSync(reportResult.filePath);
    });
  } catch (error) {
    logger.error('Error in /csv/report/contacts endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply analysis to existing contacts.csv file
router.post('/analyze/contacts', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }
    
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Analysis task is required' });
    }
    
    logger.info(`Analyzing uploaded CSV file: ${req.file.originalname}`);
    
    // Read the CSV file content
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    // Use Claude to analyze the file content
    const systemPrompt = `You are a Salesforce data analysis expert. 
Analyze the provided Contacts CSV data according to the specified task.
Provide clear, structured insights and actionable recommendations.`;
    
    const userPrompt = `
Here is a Contacts CSV file:

\`\`\`
${fileContent}
\`\`\`

Task: ${task}

Analyze this data and provide your insights.
`;
    
    const claudeResponse = await require('../services/anthropic').generateClaudeResponse(
      userPrompt,
      { systemPrompt },
      req.anthropicKey
    );
    
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({
      analysis: claudeResponse,
      fileName: req.file.originalname,
      task
    });
  } catch (error) {
    logger.error('Error in /csv/analyze/contacts endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 