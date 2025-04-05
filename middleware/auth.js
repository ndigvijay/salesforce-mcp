const logger = require('../utils/logger');

/**
 * Authentication middleware for Anthropic API key
 */
function authenticateAnthropicKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    logger.warn('API request missing authentication key');
    return res.status(401).json({ error: 'Authentication required. Please provide your Anthropic API key in the x-api-key header.' });
  }
  
  // Store the API key for use in the Anthropic service
  req.anthropicKey = apiKey;
  
  next();
}

/**
 * Rate limiting middleware (simplified version)
 * In a production environment, use a proper rate limiting solution
 */
const requestCounts = {};
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 10 requests per minute

function rateLimiter(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.ip;
  const now = Date.now();
  
  // Initialize or clean up old requests
  if (!requestCounts[apiKey]) {
    requestCounts[apiKey] = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    };
  } else if (requestCounts[apiKey].resetTime < now) {
    requestCounts[apiKey] = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    };
  }
  
  // Check if rate limit exceeded
  if (requestCounts[apiKey].count >= RATE_LIMIT_MAX_REQUESTS) {
    logger.warn(`Rate limit exceeded for ${apiKey}`);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((requestCounts[apiKey].resetTime - now) / 1000)
    });
  }
  
  // Increment count
  requestCounts[apiKey].count++;
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', RATE_LIMIT_MAX_REQUESTS - requestCounts[apiKey].count);
  res.setHeader('X-RateLimit-Reset', Math.ceil(requestCounts[apiKey].resetTime / 1000));
  
  next();
}

module.exports = {
  authenticateAnthropicKey,
  rateLimiter
}; 