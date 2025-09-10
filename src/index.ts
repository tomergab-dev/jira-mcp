#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { JiraService } from "./services/JiraService.js";
import { z } from "zod";

// Environment setup
const server = new Server(
  {
    name: "jira-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Jira service
let jiraService: JiraService;

try {
  jiraService = new JiraService();
} catch (error) {
  console.error("Failed to initialize Jira service:", error);
  process.exit(1);
}

// Tool schemas
const GetIssuesSchema = z.object({
  projectKey: z.string().optional(),
  jql: z.string().optional(),
  maxResults: z.number().min(1).max(100).default(50),
  fields: z.array(z.string()).optional(),
}).refine(
  (data) => data.projectKey || data.jql,
  { message: "Either projectKey or jql must be provided" }
);

const CreateIssueSchema = z.object({
  projectKey: z.string().min(1),
  summary: z.string().min(1),
  issueType: z.string().min(1),
  description: z.string().optional(),
  assignee: z.string().email().optional(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  priority: z.string().optional(),
  parent: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

const UpdateIssueSchema = z.object({
  issueKey: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  assignee: z.string().email().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
});

const GetUsersSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().min(1).max(50).default(10),
});

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_issues",
        description: "Get issues from Jira by project key or JQL query. Supports custom fields retrieval.",
        inputSchema: {
          type: "object",
          properties: {
            projectKey: {
              type: "string",
              description: "Project key to get issues from (optional if jql provided)"
            },
            jql: {
              type: "string", 
              description: "JQL query to filter issues (optional if projectKey provided)"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results (1-100, default: 50)",
              minimum: 1,
              maximum: 100,
              default: 50
            },
            fields: {
              type: "array",
              items: { type: "string" },
              description: "Specific fields to retrieve (optional, includes custom fields)"
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "create_issue",
        description: "Create a new issue in Jira with support for custom fields",
        inputSchema: {
          type: "object",
          properties: {
            projectKey: {
              type: "string",
              description: "Project key where the issue will be created"
            },
            summary: {
              type: "string",
              description: "Issue summary/title"
            },
            issueType: {
              type: "string", 
              description: "Issue type (e.g., 'Task', 'Story', 'Bug')"
            },
            description: {
              type: "string",
              description: "Issue description (optional)"
            },
            assignee: {
              type: "string",
              description: "Assignee email address (optional)"
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Labels to add to the issue (optional)"
            },
            components: {
              type: "array", 
              items: { type: "string" },
              description: "Components to add to the issue (optional)"
            },
            priority: {
              type: "string",
              description: "Priority level (optional)"
            },
            parent: {
              type: "string",
              description: "Parent issue key for subtasks (optional)"
            },
            customFields: {
              type: "object",
              description: "Custom fields as key-value pairs (optional)"
            }
          },
          required: ["projectKey", "summary", "issueType"],
          additionalProperties: false
        }
      },
      {
        name: "update_issue", 
        description: "Update an existing issue in Jira including custom fields",
        inputSchema: {
          type: "object",
          properties: {
            issueKey: {
              type: "string",
              description: "Key of the issue to update (e.g., 'PROJECT-123')"
            },
            summary: {
              type: "string",
              description: "Updated summary/title (optional)"
            },
            description: {
              type: "string", 
              description: "Updated description (optional)"
            },
            assignee: {
              type: "string",
              description: "Updated assignee email address (optional)"
            },
            status: {
              type: "string",
              description: "New status (optional)"
            },
            priority: {
              type: "string",
              description: "Updated priority (optional)"
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Updated labels (optional)"
            },
            components: {
              type: "array",
              items: { type: "string" }, 
              description: "Updated components (optional)"
            },
            customFields: {
              type: "object",
              description: "Custom fields to update as key-value pairs (optional)"
            }
          },
          required: ["issueKey"],
          additionalProperties: false
        }
      },
      {
        name: "get_users",
        description: "Search for users in Jira by name or email",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (name, email, or username)"
            },
            maxResults: {
              type: "number", 
              description: "Maximum number of results (1-50, default: 10)",
              minimum: 1,
              maximum: 50,
              default: 10
            }
          },
          required: ["query"],
          additionalProperties: false
        }
      },
      {
        name: "get_custom_fields",
        description: "Get all custom fields available in the Jira instance",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case "get_issues": {
        const validArgs = GetIssuesSchema.parse(args);
        const result = await jiraService.getIssues(validArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case "create_issue": {
        const validArgs = CreateIssueSchema.parse(args);
        const result = await jiraService.createIssue(validArgs);
        return {
          content: [
            {
              type: "text", 
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case "update_issue": {
        const validArgs = UpdateIssueSchema.parse(args);
        const result = await jiraService.updateIssue(validArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case "get_users": {
        const validArgs = GetUsersSchema.parse(args);
        const result = await jiraService.getUsers(validArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      case "get_custom_fields": {
        const result = await jiraService.getCustomFields();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jira MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});