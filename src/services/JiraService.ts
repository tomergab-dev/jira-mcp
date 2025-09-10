import JiraClient from "jira-client";
import * as dotenv from "dotenv";

dotenv.config();

export interface JiraIssue {
  key: string;
  id: string;
  fields: {
    summary: string;
    description?: any;
    status: {
      name: string;
      id: string;
    };
    priority?: {
      name: string;
      id: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress: string;
    };
    issuetype: {
      name: string;
      id: string;
    };
    labels: string[];
    components: Array<{
      name: string;
      id: string;
    }>;
    [key: string]: any;
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  custom: boolean;
  schema?: {
    type: string;
    items?: string;
    system?: string;
    custom?: string;
    customId?: number;
  };
}

export interface GetIssuesArgs {
  projectKey?: string;
  jql?: string;
  maxResults?: number;
  fields?: string[];
}

export interface CreateIssueArgs {
  projectKey: string;
  summary: string;
  issueType: string;
  description?: string;
  assignee?: string;
  labels?: string[];
  components?: string[];
  priority?: string;
  parent?: string;
  customFields?: Record<string, any>;
}

export interface UpdateIssueArgs {
  issueKey: string;
  summary?: string;
  description?: string;
  assignee?: string;
  status?: string;
  priority?: string;
  labels?: string[];
  components?: string[];
  customFields?: Record<string, any>;
}

export interface GetUsersArgs {
  query: string;
  maxResults?: number;
}

export interface LogTimeArgs {
  issueKey: string;
  timeSpentSeconds: number;
  description?: string;
  startDate?: string; // YYYY-MM-DD format
  startTime?: string; // HH:MM format
  authorAccountId?: string;
}

export interface WorkLog {
  tempoWorklogId: number;
  jiraWorklogId: number;
  issue: {
    key: string;
    id: number;
  };
  timeSpentSeconds: number;
  billableSeconds?: number;
  startDate: string;
  startTime: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  author: {
    accountId: string;
    displayName: string;
  };
}

export class JiraService {
  private client: JiraClient;
  private tempoApiToken?: string;
  private tempoBaseUrl?: string;
  private readonly defaultFields = [
    "summary",
    "description", 
    "status",
    "priority",
    "assignee",
    "issuetype",
    "labels",
    "components",
    "parent",
    "subtasks",
    "created",
    "updated"
  ];

  constructor() {
    const host = process.env.JIRA_HOST;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const apiVersion = process.env.JIRA_API_VERSION || "3";

    if (!host || !email || !apiToken) {
      throw new Error(
        "Missing required environment variables: JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN must be set"
      );
    }

    this.client = new JiraClient({
      protocol: "https",
      host,
      username: email,
      password: apiToken,
      apiVersion,
      strictSSL: true,
    });

    // Tempo API configuration (optional)
    this.tempoApiToken = process.env.TEMPO_API_TOKEN;
    this.tempoBaseUrl = process.env.TEMPO_BASE_URL || `https://api.tempo.io/core/3`;
  }

  async getIssues(args: GetIssuesArgs): Promise<JiraIssue[]> {
    try {
      const { projectKey, jql, maxResults = 50, fields } = args;
      
      let finalJql: string;
      if (projectKey && jql) {
        finalJql = `project = "${projectKey}" AND (${jql})`;
      } else if (projectKey) {
        finalJql = `project = "${projectKey}"`;
      } else if (jql) {
        finalJql = jql;
      } else {
        throw new Error("Either projectKey or jql must be provided");
      }

      const fieldsToUse = fields || this.defaultFields;
      
      const response = await this.client.searchJira(finalJql, {
        maxResults,
        fields: fieldsToUse,
        expand: ["names", "schema"]
      });

      return response.issues || [];
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error("Authentication failed. Check your Jira credentials.");
      }
      if (error.statusCode === 400) {
        throw new Error(`Invalid JQL query: ${error.message}`);
      }
      if (error.statusCode === 403) {
        throw new Error("Permission denied. Check your Jira permissions.");
      }
      throw new Error(`Failed to get issues: ${error.message}`);
    }
  }

  async createIssue(args: CreateIssueArgs): Promise<JiraIssue> {
    try {
      const {
        projectKey,
        summary,
        issueType,
        description,
        assignee,
        labels,
        components,
        priority,
        parent,
        customFields = {}
      } = args;

      const issueData: any = {
        fields: {
          project: { key: projectKey },
          summary,
          issuetype: { name: issueType },
          ...customFields
        }
      };

      if (description) {
        issueData.fields.description = this.convertToADF(description);
      }

      if (parent) {
        issueData.fields.parent = { key: parent };
      }

      if (assignee) {
        const user = await this.findUserByEmail(assignee);
        issueData.fields.assignee = { id: user.accountId };
      }

      if (labels && labels.length > 0) {
        issueData.fields.labels = labels;
      }

      if (components && components.length > 0) {
        issueData.fields.components = components.map(name => ({ name }));
      }

      if (priority) {
        issueData.fields.priority = { name: priority };
      }

      const result = await this.client.addNewIssue(issueData);
      
      // Return the created issue with full details
      return await this.client.findIssue(result.key, this.defaultFields.join(",")) as JiraIssue;
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error("Authentication failed. Check your Jira credentials.");
      }
      if (error.statusCode === 400) {
        throw new Error(`Invalid issue data: ${error.message}`);
      }
      if (error.statusCode === 403) {
        throw new Error("Permission denied. Check your Jira permissions.");
      }
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  }

  async updateIssue(args: UpdateIssueArgs): Promise<JiraIssue> {
    try {
      const {
        issueKey,
        summary,
        description,
        assignee,
        status,
        priority,
        labels,
        components,
        customFields = {}
      } = args;

      const updateData: any = {
        fields: { ...customFields }
      };

      if (summary) {
        updateData.fields.summary = summary;
      }

      if (description) {
        updateData.fields.description = this.convertToADF(description);
      }

      if (assignee) {
        const user = await this.findUserByEmail(assignee);
        updateData.fields.assignee = { id: user.accountId };
      }

      if (priority) {
        updateData.fields.priority = { name: priority };
      }

      if (labels) {
        updateData.fields.labels = labels;
      }

      if (components) {
        updateData.fields.components = components.map(name => ({ name }));
      }

      // Update the issue
      await this.client.updateIssue(issueKey, updateData);

      // Handle status transition separately if provided
      if (status) {
        await this.transitionIssue(issueKey, status);
      }

      // Return the updated issue
      return await this.client.findIssue(issueKey, this.defaultFields.join(",")) as JiraIssue;
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error("Authentication failed. Check your Jira credentials.");
      }
      if (error.statusCode === 404) {
        throw new Error(`Issue ${args.issueKey} not found`);
      }
      if (error.statusCode === 400) {
        throw new Error(`Invalid update data: ${error.message}`);
      }
      if (error.statusCode === 403) {
        throw new Error("Permission denied. Check your Jira permissions.");
      }
      throw new Error(`Failed to update issue: ${error.message}`);
    }
  }

  async getUsers(args: GetUsersArgs): Promise<JiraUser[]> {
    try {
      const { query, maxResults = 10 } = args;
      
      const users = await this.client.searchUsers({
        query,
        maxResults
      });

      return users.map((user: any) => ({
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress,
        active: user.active
      }));
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error("Authentication failed. Check your Jira credentials.");
      }
      if (error.statusCode === 403) {
        throw new Error("Permission denied. Check your Jira permissions.");
      }
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  async getCustomFields(): Promise<CustomField[]> {
    try {
      const fields = await this.client.listFields();
      
      return fields
        .filter((field: any) => field.custom === true)
        .map((field: any) => ({
          id: field.id,
          name: field.name,
          custom: field.custom,
          schema: field.schema
        }));
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error("Authentication failed. Check your Jira credentials.");
      }
      if (error.statusCode === 403) {
        throw new Error("Permission denied. Check your Jira permissions.");
      }
      throw new Error(`Failed to get custom fields: ${error.message}`);
    }
  }

  async logTime(args: LogTimeArgs): Promise<WorkLog> {
    try {
      if (!this.tempoApiToken) {
        throw new Error(
          "Tempo API token not configured. Set TEMPO_API_TOKEN environment variable."
        );
      }

      const {
        issueKey,
        timeSpentSeconds,
        description = "",
        startDate,
        startTime = "09:00",
        authorAccountId
      } = args;

      // Use current date if not provided
      const logDate = startDate || new Date().toISOString().split('T')[0];

      const worklogData = {
        issueKey,
        timeSpentSeconds,
        description,
        startDate: logDate,
        startTime,
        ...(authorAccountId && { authorAccountId })
      };

      const response = await fetch(`${this.tempoBaseUrl}/worklogs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tempoApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(worklogData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Tempo API error (${response.status}): ${errorData.message || response.statusText}`
        );
      }

      const worklog = await response.json();
      return worklog as WorkLog;
    } catch (error: any) {
      if (error.message.includes('fetch')) {
        throw new Error("Failed to connect to Tempo API. Check your network connection and Tempo configuration.");
      }
      throw new Error(`Failed to log time: ${error.message}`);
    }
  }

  private async findUserByEmail(email: string): Promise<JiraUser> {
    const users = await this.getUsers({ query: email, maxResults: 1 });
    const user = users.find(u => u.emailAddress.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error(`User with email "${email}" not found`);
    }
    
    return user;
  }

  private async transitionIssue(issueKey: string, statusName: string): Promise<void> {
    try {
      const transitions = await this.client.listTransitions(issueKey);
      const transition = transitions.transitions.find(
        (t: any) => t.name.toLowerCase() === statusName.toLowerCase()
      );

      if (!transition) {
        const availableTransitions = transitions.transitions.map((t: any) => t.name).join(", ");
        throw new Error(
          `Status "${statusName}" not available. Available transitions: ${availableTransitions}`
        );
      }

      await this.client.transitionIssue(issueKey, {
        transition: { id: transition.id }
      });
    } catch (error: any) {
      throw new Error(`Failed to transition issue: ${error.message}`);
    }
  }

  private convertToADF(text: string): any {
    if (!text || !text.trim()) {
      return {
        version: 1,
        type: "doc",
        content: []
      };
    }

    const paragraphs = text.split('\n\n').filter(p => p.trim());
    const content = paragraphs.map(paragraph => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: paragraph.trim()
        }
      ]
    }));

    return {
      version: 1,
      type: "doc",
      content
    };
  }
}