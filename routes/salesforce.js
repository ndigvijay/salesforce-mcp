const express = require('express');
const router = express.Router();
const salesforceService = require('../services/salesforce');
const logger = require('../utils/logger');

// Query Salesforce objects
router.post('/query', async (req, res) => {
  try {
    const { soql } = req.body;
    
    if (!soql) {
      return res.status(400).json({ error: 'SOQL query is required' });
    }
    
    logger.info(`Executing SOQL query: ${soql}`);
    const result = await salesforceService.querySalesforce(soql);
    res.json(result);
  } catch (error) {
    logger.error('Error in /query endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a record
router.post('/create/:objectName', async (req, res) => {
  try {
    const { objectName } = req.params;
    const record = req.body;
    
    if (!objectName) {
      return res.status(400).json({ error: 'Object name is required' });
    }
    
    if (!record || Object.keys(record).length === 0) {
      return res.status(400).json({ error: 'Record data is required' });
    }
    
    logger.info(`Creating ${objectName} record`);
    const result = await salesforceService.createRecord(objectName, record);
    res.json(result);
  } catch (error) {
    logger.error(`Error in /create/${req.params.objectName} endpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Update a record
router.patch('/update/:objectName/:id', async (req, res) => {
  try {
    const { objectName, id } = req.params;
    const record = req.body;
    
    if (!objectName || !id) {
      return res.status(400).json({ error: 'Object name and ID are required' });
    }
    
    if (!record || Object.keys(record).length === 0) {
      return res.status(400).json({ error: 'Record data is required' });
    }
    
    logger.info(`Updating ${objectName} record with ID: ${id}`);
    const result = await salesforceService.updateRecord(objectName, id, record);
    res.json(result);
  } catch (error) {
    logger.error(`Error in /update/${req.params.objectName}/${req.params.id} endpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a record
router.delete('/delete/:objectName/:id', async (req, res) => {
  try {
    const { objectName, id } = req.params;
    
    if (!objectName || !id) {
      return res.status(400).json({ error: 'Object name and ID are required' });
    }
    
    logger.info(`Deleting ${objectName} record with ID: ${id}`);
    const result = await salesforceService.deleteRecord(objectName, id);
    res.json(result);
  } catch (error) {
    logger.error(`Error in /delete/${req.params.objectName}/${req.params.id} endpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Describe an object
router.get('/describe/:objectName', async (req, res) => {
  try {
    const { objectName } = req.params;
    
    if (!objectName) {
      return res.status(400).json({ error: 'Object name is required' });
    }
    
    logger.info(`Describing ${objectName} object`);
    const result = await salesforceService.describeObject(objectName);
    res.json(result);
  } catch (error) {
    logger.error(`Error in /describe/${req.params.objectName} endpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 