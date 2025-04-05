const axios = require('axios');
const logger = require('../utils/logger');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Send a message to Claude and get a response
 * @param {string} prompt - The user's prompt
 * @param {Object} options - Additional options for the request
 * @param {string} clientApiKey - Optional client's API key
 * @returns {Promise<Object>} - The Claude response
 */
async function generateClaudeResponse(prompt, options = {}, clientApiKey = null) {
  const {
    systemPrompt = 'You are Claude, an AI assistant by Anthropic that specializes in Salesforce data and operations.',
    model = 'claude-3-opus-20240229',
    maxTokens = 1024,
    temperature = 0.7,
    ...otherOptions
  } = options;

  try {
    logger.debug('Sending request to Claude API');
    
    // Use the client's API key if provided, otherwise use the server's
    const apiKey = clientApiKey || process.env.ANTHROPIC_API_KEY;
    
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: systemPrompt,
        max_tokens: maxTokens,
        temperature,
        ...otherOptions
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    logger.debug('Received response from Claude API');
    return response.data;
  } catch (error) {
    logger.error('Error calling Claude API:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Process Salesforce data with Claude
 * @param {Object} sfData - Salesforce data to process
 * @param {string} task - The task to perform on the data
 * @param {string} clientApiKey - Optional client's API key
 * @returns {Promise<Object>} - The processed result
 */
async function processSalesforceData(sfData, task, clientApiKey = null) {
  try {
    const prompt = `
Here is Salesforce data that I need you to process according to the task:

Salesforce Data:
${JSON.stringify(sfData, null, 2)}

Task: ${task}

Please analyze the data and provide your response.
`;

    const systemPrompt = `You are a Salesforce expert AI assistant. Process and analyze the Salesforce data provided,
and respond according to the specified task. Provide accurate insights and actionable information.`;

    const response = await generateClaudeResponse(prompt, { systemPrompt }, clientApiKey);
    return response;
  } catch (error) {
    logger.error('Error processing Salesforce data with Claude:', error);
    throw error;
  }
}

module.exports = {
  generateClaudeResponse,
  processSalesforceData
}; 