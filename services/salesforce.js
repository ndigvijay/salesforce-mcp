const jsforce = require('jsforce');
const logger = require('../utils/logger');

let connection = null;

/**
 * Set up connection to Salesforce
 */
async function setupSalesforce() {
  const conn = new jsforce.Connection({
    loginUrl: process.env.SF_LOGIN_URL
  });

  try {
    await conn.login(
      process.env.SF_USERNAME,
      process.env.SF_PASSWORD + process.env.SF_SECURITY_TOKEN
    );
    
    logger.info('Connected to Salesforce successfully');
    connection = conn;
    return conn;
  } catch (error) {
    logger.error('Error connecting to Salesforce:', error);
    throw error;
  }
}

/**
 * Get the active Salesforce connection or create a new one
 */
async function getConnection() {
  if (!connection) {
    return setupSalesforce();
  }
  return connection;
}

/**
 * Query Salesforce objects
 */
async function querySalesforce(soql) {
  try {
    const conn = await getConnection();
    logger.debug(`Executing SOQL: ${soql}`);
    const result = await conn.query(soql);
    return result;
  } catch (error) {
    logger.error('Error querying Salesforce:', error);
    throw error;
  }
}

/**
 * Create a record in Salesforce
 */
async function createRecord(objectName, record) {
  try {
    const conn = await getConnection();
    logger.debug(`Creating ${objectName} record:`, record);
    const result = await conn.sobject(objectName).create(record);
    return result;
  } catch (error) {
    logger.error(`Error creating ${objectName} record:`, error);
    throw error;
  }
}

/**
 * Update a record in Salesforce
 */
async function updateRecord(objectName, id, record) {
  try {
    const conn = await getConnection();
    logger.debug(`Updating ${objectName} record ${id}:`, record);
    record.Id = id;
    const result = await conn.sobject(objectName).update(record);
    return result;
  } catch (error) {
    logger.error(`Error updating ${objectName} record:`, error);
    throw error;
  }
}

/**
 * Delete a record in Salesforce
 */
async function deleteRecord(objectName, id) {
  try {
    const conn = await getConnection();
    logger.debug(`Deleting ${objectName} record ${id}`);
    const result = await conn.sobject(objectName).destroy(id);
    return result;
  } catch (error) {
    logger.error(`Error deleting ${objectName} record:`, error);
    throw error;
  }
}

/**
 * Describe Salesforce object metadata
 */
async function describeObject(objectName) {
  try {
    const conn = await getConnection();
    logger.debug(`Describing object: ${objectName}`);
    const result = await conn.describe(objectName);
    return result;
  } catch (error) {
    logger.error(`Error describing ${objectName}:`, error);
    throw error;
  }
}

module.exports = {
  setupSalesforce,
  getConnection,
  querySalesforce,
  createRecord,
  updateRecord,
  deleteRecord,
  describeObject
}; 