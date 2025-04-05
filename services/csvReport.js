const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const salesforceService = require('./salesforce');
const anthropicService = require('./anthropic');
const logger = require('../utils/logger');
const os = require('os');

/**
 * Generate a CSV report from a SOQL query
 * @param {string} soql - SOQL query to execute
 * @param {string} reportName - Name of the report
 * @param {string} [dir=os.tmpdir()] - Directory to store the report
 * @returns {Promise<Object>} - Report metadata
 */
async function generateCsvReport(soql, reportName, dir = os.tmpdir()) {
  try {
    logger.info(`Generating CSV report: ${reportName} with query: ${soql}`);
    
    // Execute the SOQL query
    const queryResult = await salesforceService.querySalesforce(soql);
    
    if (!queryResult.records || queryResult.records.length === 0) {
      logger.warn(`No records found for report: ${reportName}`);
      return {
        success: false,
        error: 'No records found for the specified query',
        query: soql
      };
    }
    
    // Generate a filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${reportName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.csv`;
    const filePath = path.join(dir, filename);
    
    // Extract field names from the first record
    const fields = Object.keys(queryResult.records[0])
      .filter(field => field !== 'attributes'); // Remove Salesforce metadata
    
    // Prepare the data for CSV
    const csvData = queryResult.records.map(record => {
      const row = {};
      fields.forEach(field => {
        row[field] = record[field];
      });
      return row;
    });
    
    // Write the CSV file
    await writeCsvFile(filePath, csvData, fields);
    
    return {
      success: true,
      filename,
      filePath,
      recordCount: queryResult.records.length,
      fields,
      query: soql
    };
  } catch (error) {
    logger.error(`Error generating CSV report: ${reportName}`, error);
    throw error;
  }
}

/**
 * Write data to a CSV file
 * @param {string} filePath - Path to save the CSV file
 * @param {Array} data - Array of objects to write to CSV
 * @param {Array} headers - Array of header field names
 * @returns {Promise<void>}
 */
function writeCsvFile(filePath, data, headers) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filePath);
    
    csv.write(data, { headers })
      .pipe(fileStream)
      .on('finish', () => {
        logger.debug(`CSV file written successfully: ${filePath}`);
        resolve();
      })
      .on('error', (error) => {
        logger.error(`Error writing CSV file: ${filePath}`, error);
        reject(error);
      });
  });
}

/**
 * Generate a SOQL query for a report using Claude
 * @param {string} description - Description of the report to generate
 * @param {string} objectName - Salesforce object name
 * @param {Object} options - Options for field selection and filtering
 * @param {string} [clientApiKey] - Optional client's API key
 * @returns {Promise<Object>} - The generated SOQL and report metadata
 */
async function generateReportQuery(description, objectName, options = {}, clientApiKey = null) {
  try {
    logger.info(`Generating report query for ${objectName} with description: ${description}`);
    
    // Get object metadata to know available fields
    const objectMetadata = await salesforceService.describeObject(objectName);
    
    // Prepare fields information
    const fields = objectMetadata.fields.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type,
      isCustom: field.custom
    }));
    
    // Build a system prompt for Claude
    const systemPrompt = `You are a Salesforce SOQL expert. 
Generate an optimized SOQL query based on the user's report requirements. 
Use only fields that exist in the object metadata provided.
Format your response as a valid SOQL query string only, nothing else.`;
    
    // Construct the prompt with all necessary information
    const userPrompt = `
I need to generate a report from Salesforce ${objectName} data.

Report Description: ${description}

Available Fields:
${JSON.stringify(fields, null, 2)}

Additional Options:
${JSON.stringify(options, null, 2)}

Generate a complete, valid SOQL query that will retrieve the data needed for this report.
The query should be well-formatted and optimized for performance.
Only include fields that exist in the metadata provided.
If specific sorting, grouping, or limiting is appropriate, include it.
`;
    
    // Generate the query using Claude
    const claudeResponse = await anthropicService.generateClaudeResponse(
      userPrompt, 
      { systemPrompt }, 
      clientApiKey
    );
    
    // Extract the query from Claude's response
    const soqlQuery = claudeResponse.content[0].text.trim();
    
    return {
      success: true,
      soqlQuery,
      objectName,
      description,
      availableFields: fields
    };
  } catch (error) {
    logger.error(`Error generating report query: ${error.message}`, error);
    throw error;
  }
}

module.exports = {
  generateCsvReport,
  generateReportQuery
}; 