# MCP Server for Salesforce with Anthropic Claude Integration

A Model Control Plane (MCP) server that connects Salesforce API with Anthropic's Claude AI to power intelligent Salesforce operations.

## Features

- **AI-Powered Salesforce Operations**: Use Claude to analyze and process Salesforce data
- **Flexible Integration**: Connect your own Anthropic API key directly through the API
- **SOQL Query Generation**: Generate optimized Salesforce queries with AI assistance
- **Data Enrichment**: Enhance Salesforce records with AI-generated insights
- **CSV Import**: Import contacts from CSV files into Salesforce
- **Report Generation**: Generate and filter reports in CSV format
- **CSV Analysis**: Analyze existing CSV files with Claude
- **Rate Limiting**: Built-in protection against excessive API usage
- **Authentication**: API key-based authentication system

## Setup

### Prerequisites

- Node.js (v14+)
- Salesforce account with API access
- Anthropic API key

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd mcp-salesforce
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file:
   ```
   cp .env.example .env
   ```

4. Edit the `.env` file with your credentials:
   ```
   # Anthropic API
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Salesforce Credentials
   SF_LOGIN_URL=https://login.salesforce.com
   SF_USERNAME=your_salesforce_username
   SF_PASSWORD=your_salesforce_password
   SF_SECURITY_TOKEN=your_salesforce_security_token

   # Server Config
   PORT=3000
   NODE_ENV=development
   ```

### Running the Server

```
npm start
```

For development with auto-reload:
```
npm run dev
```

## API Endpoints

### Health Check

- `GET /health` - Check if the server is running

### Salesforce Operations

- `POST /api/salesforce/query` - Execute SOQL query
- `POST /api/salesforce/create/:objectName` - Create a record
- `PATCH /api/salesforce/update/:objectName/:id` - Update a record
- `DELETE /api/salesforce/delete/:objectName/:id` - Delete a record
- `GET /api/salesforce/describe/:objectName` - Get object metadata

### Claude Integration

- `POST /api/claude/generate` - Generate response from Claude
- `POST /api/claude/process-salesforce` - Process Salesforce data with Claude

### Integrated Features

- `POST /api/integrated/query-analyze` - Query Salesforce and analyze with Claude
- `POST /api/integrated/generate-soql` - Generate optimized SOQL query with Claude
- `POST /api/integrated/enrich-data/:objectName/:id` - AI-powered data enrichment

### CSV Operations

- `POST /api/csv/import/contacts` - Import contacts from CSV file
- `POST /api/csv/report/contacts` - Generate a CSV report of contacts
- `POST /api/csv/analyze/contacts` - Analyze a contacts CSV file with Claude

## CSV Import Format

To import contacts, your CSV file should use the following format:

```csv
FirstName,LastName,Email,Phone,MobilePhone,Title,AccountName,Department,Description,MailingStreet,MailingCity,MailingState,MailingPostalCode,MailingCountry
John,Doe,john.doe@example.com,(555) 123-4567,(555) 987-6543,CEO,Acme Inc,Executive,Description text here,123 Main St,San Francisco,CA,94105,USA
```

Notes:
- The first row must contain the field names
- LastName is the only required field
- If you're associating contacts with accounts, use AccountName (the Account's name, not its ID)
- For custom fields, use their API names (e.g., Custom_Field__c)

## Example Usage

### Importing Contacts

```bash
curl -X POST \
  http://localhost:3000/api/csv/import/contacts \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@/path/to/contacts.csv'
```

### Generating a Contacts Report

```bash
curl -X POST \
  http://localhost:3000/api/csv/report/contacts \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: your_anthropic_api_key' \
  -d '{
    "description": "Get all contacts created in the last 30 days that work at Acme Inc",
    "reportName": "Recent_Acme_Contacts",
    "filters": {
      "createdDate": "LAST_30_DAYS",
      "accountName": "Acme Inc"
    }
  }'
```

### Analyzing a Contacts CSV File

```bash
curl -X POST \
  http://localhost:3000/api/csv/analyze/contacts \
  -H 'Content-Type: multipart/form-data' \
  -H 'x-api-key: your_anthropic_api_key' \
  -F 'file=@/path/to/contacts.csv' \
  -F 'task=Analyze the distribution of contacts by company and department'
```

## Client Integration

To use your own Anthropic API key, include it in the request header:

```
x-api-key: your_anthropic_api_key
```

## Security Considerations

- This server is designed for private use and should be deployed behind a secure gateway
- Consider adding additional authentication mechanisms for production use
- Implement proper HTTPS for all API endpoints in production

## License

MIT 