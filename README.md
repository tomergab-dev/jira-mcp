# Jira MCP Server

A perfect Model Context Protocol (MCP) server for interacting with Jira. This server provides AI assistants with the ability to manage Jira issues, users, and custom fields seamlessly.

## Features

- ✅ **Get Issues**: Retrieve issues by project key or JQL query with full custom fields support
- ✅ **Create Issues**: Create new issues with all standard and custom fields
- ✅ **Update Issues**: Update existing issues including status transitions
- ✅ **Get Users**: Search for users by name or email
- ✅ **Custom Fields**: Full support for retrieving and setting custom fields
- ✅ **Time Logging**: Log time spent on issues using Tempo API integration
- ✅ **Error Handling**: Comprehensive error handling with helpful messages
- ✅ **Type Safety**: Full TypeScript support with proper typing

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment example file:
   ```bash
   cp .env.example .env
   ```
4. Configure your Jira credentials in `.env`:
   ```env
   JIRA_HOST=your-domain.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-api-token-here
   JIRA_API_VERSION=3
   
   # Optional: For time logging with Tempo
   TEMPO_API_TOKEN=your-tempo-api-token-here
   TEMPO_BASE_URL=https://api.tempo.io/core/3
   ```

## Getting Your Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Enter a label for your token
4. Copy the generated token to your `.env` file

## Building

```bash
npm run build
```

## Usage

### As an MCP Server

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-mcp-server/build/index.js"],
      "env": {
        "JIRA_HOST": "your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com", 
        "JIRA_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

### Testing with Inspector

```bash
npm run inspector
```

## Available Tools

### \`get_issues\`
Retrieve issues from Jira by project key or JQL query.

**Parameters:**
- \`projectKey\` (string, optional): Project key to get issues from
- \`jql\` (string, optional): JQL query to filter issues
- \`maxResults\` (number, optional): Maximum results (1-100, default: 50)
- \`fields\` (array, optional): Specific fields to retrieve including custom fields

**Example:**
```json
{
  "projectKey": "PROJ",
  "maxResults": 10,
  "fields": ["summary", "status", "customfield_10001"]
}
```

### \`create_issue\`
Create a new issue in Jira with support for custom fields.

**Parameters:**
- \`projectKey\` (string, required): Project key where issue will be created
- \`summary\` (string, required): Issue summary/title  
- \`issueType\` (string, required): Issue type (e.g., 'Task', 'Story', 'Bug')
- \`description\` (string, optional): Issue description
- \`assignee\` (string, optional): Assignee email address
- \`labels\` (array, optional): Labels to add
- \`components\` (array, optional): Components to add
- \`priority\` (string, optional): Priority level
- \`parent\` (string, optional): Parent issue key for subtasks
- \`customFields\` (object, optional): Custom fields as key-value pairs

**Example:**
```json
{
  "projectKey": "PROJ",
  "summary": "New feature request",
  "issueType": "Story",
  "description": "Detailed description here",
  "assignee": "user@example.com",
  "labels": ["feature", "urgent"],
  "customFields": {
    "customfield_10001": "Custom value"
  }
}
```

### \`update_issue\`
Update an existing issue including custom fields.

**Parameters:**
- \`issueKey\` (string, required): Key of issue to update (e.g., 'PROJ-123')
- \`summary\` (string, optional): Updated summary
- \`description\` (string, optional): Updated description
- \`assignee\` (string, optional): Updated assignee email
- \`status\` (string, optional): New status (will trigger transition)
- \`priority\` (string, optional): Updated priority
- \`labels\` (array, optional): Updated labels
- \`components\` (array, optional): Updated components  
- \`customFields\` (object, optional): Custom fields to update

**Example:**
```json
{
  "issueKey": "PROJ-123",
  "summary": "Updated summary",
  "status": "In Progress",
  "customFields": {
    "customfield_10001": "Updated custom value"
  }
}
```

### \`get_users\`
Search for users in Jira by name or email.

**Parameters:**
- \`query\` (string, required): Search query (name, email, or username)
- \`maxResults\` (number, optional): Maximum results (1-50, default: 10)

**Example:**
```json
{
  "query": "john@example.com",
  "maxResults": 5
}
```

### \`get_custom_fields\`
Get all custom fields available in the Jira instance.

**Parameters:** None

**Example:**
```json
{}
```

### \`log_time\`
Log time spent on a Jira issue using Tempo. Requires TEMPO_API_TOKEN to be configured.

**Parameters:**
- \`issueKey\` (string, required): Key of the issue to log time against (e.g., 'PROJECT-123')
- \`timeSpentSeconds\` (number, required): Time spent in seconds (e.g., 3600 for 1 hour, 1800 for 30 minutes)
- \`description\` (string, optional): Description of the work performed
- \`startDate\` (string, optional): Date when the work was performed in YYYY-MM-DD format (defaults to today)
- \`startTime\` (string, optional): Time when the work started in HH:MM format (defaults to 09:00)
- \`authorAccountId\` (string, optional): Account ID of the person who performed the work (defaults to authenticated user)

**Example:**
```json
{
  "issueKey": "PROJ-123",
  "timeSpentSeconds": 7200,
  "description": "Implemented new feature and wrote tests",
  "startDate": "2024-01-15",
  "startTime": "10:30"
}
```

## Getting Your Tempo API Token

1. Log into your Tempo account
2. Go to **Settings** → **API Integration**
3. Click **Create Token**
4. Copy the generated token to your `.env` file as `TEMPO_API_TOKEN`

## Error Handling

The server provides comprehensive error handling:

- **Authentication Errors**: Clear messages when credentials are invalid
- **Permission Errors**: Helpful messages when access is denied
- **Validation Errors**: Detailed parameter validation with specific error messages
- **Not Found Errors**: Clear messages when resources don't exist
- **JQL Errors**: Helpful messages for invalid JQL queries

## Development

### Scripts

- \`npm run build\`: Build the TypeScript project
- \`npm run watch\`: Watch for changes and rebuild
- \`npm run dev\`: Run in development mode with nodemon
- \`npm run lint\`: Run ESLint
- \`npm run format\`: Format code with Prettier
- \`npm run inspector\`: Test with MCP inspector

### Project Structure

```
src/
├── index.ts           # Main MCP server implementation
└── services/
    └── JiraService.ts # Jira API service with all functionality
```

## License

MIT
