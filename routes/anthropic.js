const express = require('express');
const router = express.Router();
const anthropicService = require('../services/anthropic');
const logger = require('../utils/logger');

// Generate response from Claude
router.post('/generate', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    logger.info('Generating Claude response');
    const result = await anthropicService.generateClaudeResponse(prompt, options, req.anthropicKey);
    res.json(result);
  } catch (error) {
    logger.error('Error in /generate endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process Salesforce data with Claude
router.post('/process-salesforce', async (req, res) => {
  try {
    const { sfData, task } = req.body;
    
    if (!sfData) {
      return res.status(400).json({ error: 'Salesforce data is required' });
    }
    
    if (!task) {
      return res.status(400).json({ error: 'Task description is required' });
    }
    
    logger.info('Processing Salesforce data with Claude');
    const result = await anthropicService.processSalesforceData(sfData, task, req.anthropicKey);
    res.json(result);
  } catch (error) {
    logger.error('Error in /process-salesforce endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 