const fs = require('fs');
const csv = require('csv-parser');
const salesforceService = require('./salesforce');
const logger = require('../utils/logger');

/**
 * Process a contacts CSV file and import to Salesforce
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Object>} - Import results
 */
async function importContactsFromCSV(filePath) {
  try {
    logger.info(`Processing contacts CSV file: ${filePath}`);
    
    const results = [];
    const errors = [];
    const successfulRecords = [];
    
    // Read and parse the CSV file
    const contacts = await new Promise((resolve, reject) => {
      const data = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => data.push(row))
        .on('end', () => resolve(data))
        .on('error', (error) => reject(error));
    });
    
    logger.info(`Found ${contacts.length} contacts in CSV file`);
    
    // Process each contact
    for (const contact of contacts) {
      try {
        // Map CSV fields to Salesforce Contact fields
        const contactRecord = mapContactFields(contact);
        
        // If AccountName is provided, find or create the Account
        if (contactRecord.AccountName) {
          const accountId = await findOrCreateAccount(contactRecord.AccountName);
          if (accountId) {
            contactRecord.AccountId = accountId;
          }
          // Remove AccountName as it's not a field in the Contact object
          delete contactRecord.AccountName;
        }
        
        // Create the contact in Salesforce
        const result = await salesforceService.createRecord('Contact', contactRecord);
        
        if (result.success) {
          successfulRecords.push({
            id: result.id,
            name: `${contactRecord.FirstName || ''} ${contactRecord.LastName}`.trim()
          });
        } else {
          errors.push({
            record: contactRecord,
            error: result.errors.join(', ')
          });
        }
        
        results.push(result);
      } catch (error) {
        logger.error(`Error processing contact: ${JSON.stringify(contact)}`, error);
        errors.push({
          record: contact,
          error: error.message
        });
      }
    }
    
    // Clean up the temporary file
    fs.unlinkSync(filePath);
    
    return {
      totalProcessed: contacts.length,
      successful: successfulRecords.length,
      failed: errors.length,
      successfulRecords,
      errors
    };
  } catch (error) {
    logger.error('Error importing contacts from CSV:', error);
    throw error;
  }
}

/**
 * Map CSV fields to Salesforce Contact fields
 * @param {Object} csvContact - Contact data from CSV
 * @returns {Object} - Mapped Salesforce Contact record
 */
function mapContactFields(csvContact) {
  // Map standard fields
  const contactRecord = {
    LastName: csvContact.LastName || 'Unknown' // LastName is required
  };
  
  // Map other standard fields if they exist
  const standardFields = [
    'FirstName', 'Email', 'Phone', 'MobilePhone', 'Title', 
    'Department', 'Description'
  ];
  
  standardFields.forEach(field => {
    if (csvContact[field]) {
      contactRecord[field] = csvContact[field];
    }
  });
  
  // Map address fields
  if (csvContact.MailingStreet || csvContact.MailingCity || 
      csvContact.MailingState || csvContact.MailingPostalCode || 
      csvContact.MailingCountry) {
    
    if (csvContact.MailingStreet) contactRecord.MailingStreet = csvContact.MailingStreet;
    if (csvContact.MailingCity) contactRecord.MailingCity = csvContact.MailingCity;
    if (csvContact.MailingState) contactRecord.MailingState = csvContact.MailingState;
    if (csvContact.MailingPostalCode) contactRecord.MailingPostalCode = csvContact.MailingPostalCode;
    if (csvContact.MailingCountry) contactRecord.MailingCountry = csvContact.MailingCountry;
  }
  
  // Keep AccountName for processing
  if (csvContact.AccountName) {
    contactRecord.AccountName = csvContact.AccountName;
  }
  
  // Map any custom fields (fields ending with __c)
  Object.keys(csvContact).forEach(key => {
    if (key.endsWith('__c')) {
      contactRecord[key] = csvContact[key];
    }
  });
  
  return contactRecord;
}

/**
 * Find an account by name or create a new one
 * @param {string} accountName - Name of the account
 * @returns {Promise<string>} - Salesforce Account ID
 */
async function findOrCreateAccount(accountName) {
  try {
    // Try to find the account first
    const query = `SELECT Id FROM Account WHERE Name = '${accountName.replace(/'/g, "\\'")}'`;
    const result = await salesforceService.querySalesforce(query);
    
    if (result.records && result.records.length > 0) {
      return result.records[0].Id;
    }
    
    // Account not found, create it
    const createResult = await salesforceService.createRecord('Account', { Name: accountName });
    
    if (createResult.success) {
      return createResult.id;
    }
    
    logger.warn(`Could not create account: ${accountName}`);
    return null;
  } catch (error) {
    logger.error(`Error finding or creating account: ${accountName}`, error);
    return null;
  }
}

module.exports = {
  importContactsFromCSV
}; 