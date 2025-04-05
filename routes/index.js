const express = require('express');
const router = express.Router();
const salesforceRoutes = require('./salesforce');
const anthropicRoutes = require('./anthropic');
const integratedRoutes = require('./integrated');
const csvRoutes = require('./csv');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount routes
router.use('/salesforce', salesforceRoutes);
router.use('/claude', anthropicRoutes);
router.use('/integrated', integratedRoutes);
router.use('/csv', csvRoutes);

module.exports = router; 