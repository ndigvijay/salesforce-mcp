const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const routes = require('./routes');
const { setupSalesforce } = require('./services/salesforce');
const logger = require('./utils/logger');
const { authenticateAnthropicKey, rateLimiter } = require('./middleware/auth');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Check for required environment variables
const requiredEnvVars = [
  'ANTHROPIC_API_KEY',
  'SF_LOGIN_URL',
  'SF_USERNAME',
  'SF_PASSWORD',
  'SF_SECURITY_TOKEN'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Initialize Salesforce connection
setupSalesforce().catch(err => {
  logger.error('Failed to connect to Salesforce:', err);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'mcp-salesforce' });
});

// Apply middleware to API routes
app.use('/api/claude', authenticateAnthropicKey, rateLimiter);
app.use('/api/integrated', authenticateAnthropicKey, rateLimiter);
app.use('/api/csv/analyze', authenticateAnthropicKey, rateLimiter);
app.use('/api/csv/report', authenticateAnthropicKey, rateLimiter);

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`MCP Server running on port ${PORT}`);
}); 