const express = require('express');
const router = express.Router();
const salesforceService = require('../services/salesforce');
const anthropicService = require('../services/anthropic');
const logger = require('../utils/logger');

// Query Salesforce and analyze with Claude
router.post('/query-analyze', async (req, res) => {
  try {
    const { soql, task } = req.body;
    
    if (!soql) {
      return res.status(400).json({ error: 'SOQL query is required' });
    }
    
    if (!task) {
      return res.status(400).json({ error: 'Analysis task is required' });
    }
    
    logger.info(`Querying Salesforce and analyzing results with Claude: ${soql}`);
    
    // Step 1: Query Salesforce
    const sfData = await salesforceService.querySalesforce(soql);
    
    // Step 2: Process data with Claude using client's API key
    const analysis = await anthropicService.processSalesforceData(sfData, task, req.anthropicKey);
    
    res.json({
      salesforceData: sfData,
      analysis
    });
  } catch (error) {
    logger.error('Error in /query-analyze endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate optimized SOQL query with Claude
router.post('/generate-soql', async (req, res) => {
  try {
    const { prompt, objectName } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!objectName) {
      return res.status(400).json({ error: 'Object name is required' });
    }
    
    logger.info(`Generating optimized SOQL query for ${objectName}`);
    
    // Step 1: Get object metadata
    const objectMetadata = await salesforceService.describeObject(objectName);
    
    // Step 2: Ask Claude to generate optimized SOQL using client's API key
    const systemPrompt = `You are a Salesforce expert. 
Generate an optimized SOQL query based on the user's requirements. 
Use only fields that exist in the object metadata provided.
Format your response as a valid SOQL query string only.`;
    
    const userPrompt = `
Object Metadata: ${JSON.stringify(objectMetadata, null, 2)}

User Requirements: ${prompt}

Generate an optimized SOQL query for this object based on the user's requirements.
Ensure you only use fields that actually exist in the object metadata.
`;
    
    const claudeResponse = await anthropicService.generateClaudeResponse(
      userPrompt, 
      { systemPrompt }, 
      req.anthropicKey
    );
    
    // Extract the SOQL query from Claude's response
    let soqlQuery = claudeResponse.content[0].text;
    
    res.json({
      soqlQuery,
      objectMetadata
    });
  } catch (error) {
    logger.error('Error in /generate-soql endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI-powered data enrichment
router.post('/enrich-data/:objectName/:id', async (req, res) => {
  try {
    const { objectName, id } = req.params;
    const { fields, enrichmentTask } = req.body;
    
    if (!objectName || !id) {
      return res.status(400).json({ error: 'Object name and ID are required' });
    }
    
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Fields to enrich are required' });
    }
    
    if (!enrichmentTask) {
      return res.status(400).json({ error: 'Enrichment task description is required' });
    }
    
    logger.info(`Enriching ${objectName} record ${id} with Claude`);
    
    // Step 1: Query the record
    const soql = `SELECT ${fields.join(', ')} FROM ${objectName} WHERE Id = '${id}'`;
    const queryResult = await salesforceService.querySalesforce(soql);
    
    if (queryResult.records.length === 0) {
      return res.status(404).json({ error: `${objectName} record with ID ${id} not found` });
    }
    
    const record = queryResult.records[0];
    
    // Step 2: Process with Claude using client's API key
    const systemPrompt = `You are a Salesforce data enrichment expert. 
Analyze the record data and enrich it according to the specified task.
You should only output a JSON object with the updated field values, nothing else.`;
    
    const userPrompt = `
Record Data: ${JSON.stringify(record, null, 2)}

Enrichment Task: ${enrichmentTask}

Fields to Enrich: ${fields.join(', ')}

Analyze this data and provide enriched values for the specified fields.
Output format must be a JSON object with field names as keys and enriched values as values.
`;
    
    const claudeResponse = await anthropicService.generateClaudeResponse(
      userPrompt, 
      { systemPrompt }, 
      req.anthropicKey
    );
    
    // Extract the enriched data from Claude's response and update the record
    const enrichedData = JSON.parse(claudeResponse.content[0].text);
    const updateResult = await salesforceService.updateRecord(objectName, id, enrichedData);
    
    res.json({
      originalRecord: record,
      enrichedData,
      updateResult
    });
  } catch (error) {
    logger.error(`Error in /enrich-data/${req.params.objectName}/${req.params.id} endpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 