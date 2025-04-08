# Jira MCP Server

Enhanced Model Context Protocol server for interacting with Jira directly from Claude.

This server allows [Model Context Protocol](https://github.com/modelcontextprotocol) enabled AI assistants like Claude to directly interact with your Jira instance to perform a wide range of project management tasks, including:

- Retrieving project information and issues
- Creating and updating issues and subtasks
- Managing issue workflows and transitions
- Creating issue links and dependencies
- Adding comments and managing issue fields
- User management and assignment
- Bulk operations for efficient issue management

## Features

- **Full Jira API Integration**: Comprehensive access to Jira functionality
- **Enhanced Formatting**: Improved Markdown to Atlassian Document Format (ADF) conversion with support for code blocks and inline formatting
- **Input Validation**: Robust schema validation using Zod
- **Improved Error Handling**: Detailed error messages and graceful error recovery
- **Custom Field Support**: Easy configuration for working with custom Jira fields
- **Status Transitions**: Advanced workflow management
- **Bulk Operations**: Support for bulk issue operations (updates, deletions)
- **Granular Label/Component Management**: Add, remove, or replace labels and components
- **Configurable Logging**: Control log verbosity with environment variables

## Prerequisites

- Node.js 18 or higher
- Jira Cloud or Server instance
- Jira API token (for Cloud) or username/password (for Server)
- Claude Desktop or other MCP-compatible AI assistant

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/jira-server.git
   cd jira-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your Jira credentials:
   ```
   JIRA_HOST=your-instance.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-api-token
   ```

5. Build the server:
   ```bash
   npm run build
   ```

## Usage

### Starting the Server

```bash
npm start
```

### Development Mode

For development with auto-reload:

```bash
npm run dev
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
```

### Configuring Claude Desktop

To use this MCP server with Claude Desktop:

1. Locate your Claude Desktop configuration file:

   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Add the Jira MCP server to your configuration:

   ```json
   {
     "mcp_servers": [
       {
         "name": "jira-server",
         "command": "npm start",
         "cwd": "/absolute/path/to/jira-server",
         "env": {
           "JIRA_HOST": "your-instance.atlassian.net",
           "JIRA_EMAIL": "your-email@example.com",
           "JIRA_API_TOKEN": "your-api-token",
           "JIRA_API_VERSION": "3",
           "JIRA_CUSTOM_FIELDS": "summary,description,status,priority,assignee,issuetype,parent,subtasks",
           "LOG_LEVEL": "info"
         }
       }
     ]
   }
   ```

   Replace `/absolute/path/to/jira-server` with the absolute path to your cloned repository.

3. Restart Claude Desktop to apply the changes.

## Available Tools

### Project Information

```typescript
// Get project information
{
  projectKey: "PROJECT",
  expand: ["lead", "description", "url"] // Optional
}

// List all available issue types
// No parameters required

// List all available Jira fields
// No parameters required

// List all available issue link types
// No parameters required
```

### User Management

```typescript
// Get user's account ID by email
{
  email: "user@example.com"
}

// Add a watcher to an issue
{
  issueKey: "PROJECT-123",
  username: "user@example.com"
}
```

### Issue Retrieval

```typescript
// Get all issues in a project
{
  projectKey: "PROJECT"
}

// Get issues with JQL filtering
{
  projectKey: "PROJECT",
  jql: "status = 'In Progress' AND assignee = currentUser()"
}

// Get more issues at once (default: 50)
{
  projectKey: "PROJECT",
  maxResults: 100
}

// Get specific fields
{
  projectKey: "PROJECT",
  fields: ["summary", "status", "assignee", "labels"]
}
```

### Issue Creation

```typescript
// Create a standard issue
{
  projectKey: "PROJECT",
  summary: "Issue title",
  issueType: "Task",  // or "Story", "Bug", etc.
  description: "Detailed description",
  assignee: "user@example.com",
  labels: ["frontend", "urgent"],
  components: ["ui", "api"],
  priority: "High"
}

// Create a subtask
{
  projectKey: "PROJECT",
  summary: "Subtask title",
  issueType: "Subtask",
  description: "Subtask details",
  assignee: "user@example.com",
  parent: "PROJECT-123"
}
```

### Issue Updates

```typescript
// Update issue fields
{
  issueKey: "PROJECT-123",
  summary: "Updated title",
  description: "New description",
  assignee: "user@example.com",
  status: "In Progress",
  priority: "High", 
  labels: ["frontend", "updated"],
  components: ["ui"]
}
```

### Bulk Issue Updates

```typescript
// Update multiple issues with the same values
{
  issueKeys: ["PROJECT-123", "PROJECT-124", "PROJECT-125"],
  priority: "High",
  status: "In Progress"
}

// Add labels to multiple issues (preserves existing labels)
{
  issueKeys: ["PROJECT-123", "PROJECT-124", "PROJECT-125"],
  addLabels: ["urgent", "sprint-5"]
}

// Remove labels from multiple issues
{
  issueKeys: ["PROJECT-123", "PROJECT-124", "PROJECT-125"],
  removeLabels: ["outdated"]
}

// Replace all labels on multiple issues
{
  issueKeys: ["PROJECT-123", "PROJECT-124", "PROJECT-125"],
  setLabels: ["frontend", "sprint-6"]
}

// Add components to multiple issues
{
  issueKeys: ["PROJECT-123", "PROJECT-124", "PROJECT-125"],
  addComponents: ["api"]
}

// Complex bulk update
{
  issueKeys: ["PROJECT-123", "PROJECT-124", "PROJECT-125"],
  status: "In Progress",
  priority: "High",
  assignee: "developer@example.com",
  addLabels: ["sprint-6"],
  removeLabels: ["backlog"],
  addComponents: ["api"]
}
```

### Issue Linking

```typescript
// Create issue link
{
  linkType: "Blocks",  // from list_link_types
  inwardIssueKey: "PROJECT-124",  // blocked issue
  outwardIssueKey: "PROJECT-123",  // blocking issue
  comment: "Blocking due to dependency" // Optional
}
```

### Issue Deletion

```typescript
// Delete single issue
{
  issueKey: "PROJECT-123"
}

// Delete issue with subtasks
{
  issueKey: "PROJECT-123",
  deleteSubtasks: true
}

// Delete multiple issues
{
  issueKeys: ["PROJECT-123", "PROJECT-124"]
}
```

### Workflow Management

```typescript
// Get available transitions
{
  issueKey: "PROJECT-123"
}

// Transition an issue by transition name
{
  issueKey: "PROJECT-123",
  transitionName: "In Progress"
}

// Transition an issue by transition ID with comment
{
  issueKey: "PROJECT-123",
  transitionId: "31",
  comment: "Moving to in progress as development has started"
}

// Transition with additional fields
{
  issueKey: "PROJECT-123",
  transitionName: "Done",
  fields: {
    "resolution": { 
      "name": "Fixed" 
    }
  }
}
```

### Issue Comments

```typescript
// Add a comment
{
  issueKey: "PROJECT-123",
  body: "This is a comment with **bold** and *italic* formatting"
}

// Add a comment with visibility restrictions
{
  issueKey: "PROJECT-123",
  body: "This comment is only visible to a specific role",
  visibility: {
    type: "role",
    value: "Administrators"
  }
}
```

## Text Formatting

The server supports enhanced Markdown-style formatting for descriptions and comments:

- **Paragraphs**: Separated by blank lines
- **Lists**: Use `- ` or `* ` for bullet points, or `1. ` for numbered lists
- **Headers**: Use `#` syntax (`# Header 1`, `## Header 2`) or lines ending with `:` followed by a blank line
- **Text Formatting**: Use `**bold**`, `*italic*`, and `` `code` ``
- **Code Blocks**: Use triple backticks (` ``` `) for code blocks, with optional language specification

Example:

````markdown
# Issue Description

This issue needs to be addressed **urgently**.

## Requirements:
- Implement the API endpoint
- Add proper error handling
- Write unit tests

Steps to reproduce:
1. Navigate to the dashboard
2. Click on the settings icon
3. Observe the error message

```javascript
// Current problematic code:
function getData() {
  return fetch('/api/data').then(res => res.json());
}
```

*Note*: This is blocking the release.
````

## Error Handling

The server provides detailed error messages for:

- Invalid parameters
- Authentication issues
- Missing required fields
- Permission problems
- Resource not found errors
- API rate limits
- Workflow validation errors

## Logging

You can control the verbosity of logging by setting the `LOG_LEVEL` environment variable:

```
LOG_LEVEL=debug   # Most verbose, shows all details
LOG_LEVEL=info    # Default, shows general information
LOG_LEVEL=warn    # Shows only warnings and errors
LOG_LEVEL=error   # Shows only errors
```

## Customization

### Custom Fields

To work with custom Jira fields, add them to the `JIRA_CUSTOM_FIELDS` environment variable:

```
JIRA_CUSTOM_FIELDS=summary,description,status,priority,assignee,issuetype,parent,subtasks,customfield_10001,customfield_10002
```

You can then use these custom fields in your requests:

```typescript
// Update with custom fields
{
  issueKey: "PROJECT-123",
  customFields: {
    "customfield_10001": "Custom value",
    "customfield_10002": { "value": "Option 1" }
  }
}
```

### Field Types

Different custom fields may require different formats:

- **Text fields**: Simple string values
- **Select/Option fields**: Object with `value` property
- **User fields**: Object with `id` property (account ID)
- **Multi-select fields**: Array of objects with `value` property
- **Date fields**: String in ISO format

Example:

```typescript
{
  issueKey: "PROJECT-123",
  customFields: {
    "customfield_10001": "Text value",               // Text field
    "customfield_10002": { "value": "Option 1" },    // Select field
    "customfield_10003": { "id": "123456:abcdef" },  // User field
    "customfield_10004": [                           // Multi-select field
      { "value": "Option 1" },
      { "value": "Option 2" }
    ],
    "customfield_10005": "2023-04-30"                // Date field
  }
}
```

## Development

### Project Structure

```
jira-server/
├── src/
│   ├── index.ts             # Main server entry point
│   ├── services/            # Service modules
│   │   └── JiraService.ts   # Jira API integration
│   ├── types/               # Type definitions
│   │   └── index.ts         # Schema definitions
│   └── utils/               # Utility functions
│       └── formatters.ts    # Text formatting utilities
├── build/                   # Compiled JavaScript
├── package.json             # Project dependencies
├── tsconfig.json            # TypeScript configuration
└── .env.example             # Environment variables template
```

### Testing Tools

You can use the MCP Inspector to test the server directly:

```bash
npm run inspector
```

This will start an interactive session where you can test calling tools and see their responses.

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm run lint`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Ensure your JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN are correct
   - For Cloud instances, verify API token was generated at https://id.atlassian.com/manage-profile/security/api-tokens

2. **Permission Errors**
   - Ensure the user associated with the API token has appropriate permissions in Jira

3. **Invalid Field Errors**
   - Use the `list_fields` tool to get the correct field IDs
   - Check the format of custom fields (some require objects instead of simple values)

4. **Connection Issues**
   - Check network connectivity to your Jira instance
   - Verify firewall settings allow outbound connections

5. **Rate Limiting**
   - If you encounter rate limiting, add delays between bulk operations or reduce batch sizes

## License

MIT

## References

- [Model Context Protocol](https://github.com/modelcontextprotocol)
- [Jira REST API Documentation](https://docs.atlassian.com/software/jira/docs/api/REST/latest)
- [Jira REST API Examples](https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/)
- [Atlassian Document Format (ADF)](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)
- [Jira Client Library](https://github.com/jira-node/node-jira-client)
- [Zod Schema Validation](https://github.com/colinhacks/zod) 