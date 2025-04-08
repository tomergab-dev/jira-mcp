import JiraClient from 'jira-client';
import * as dotenv from 'dotenv';
import { convertToADF, formatJQL } from '../utils/formatters.js';
import type {
  CreateIssueArgs,
  GetIssuesArgs,
  UpdateIssueArgs,
  GetUserArgs,
  CreateIssueLinkArgs,
  DeleteIssueArgs,
  BulkDeleteIssuesArgs,
  BulkUpdateIssuesArgs,
  TransitionIssueArgs,
  AddCommentArgs,
  GetTransitionsArgs,
  AddWatcherArgs,
  GetProjectArgs,
  IssueType,
  JiraField,
  IssueLinkType
} from '../types/index.js';

// Load environment variables
dotenv.config();

/**
 * Service class for interacting with the Jira API
 */
export class JiraService {
  private client: JiraClient;
  private readonly defaultFields: string[];

  /**
   * Creates a new JiraService instance
   * @throws Error if required environment variables are missing
   */
  constructor() {
    const host = process.env.JIRA_HOST;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const apiVersion = process.env.JIRA_API_VERSION || '3';
    
    if (!host || !email || !apiToken) {
      throw new Error(
        'Missing required environment variables: JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN are required'
      );
    }

    this.client = new JiraClient({
      protocol: 'https',
      host,
      username: email,
      password: apiToken,
      apiVersion,
      strictSSL: true,
    });

    this.defaultFields = (process.env.JIRA_CUSTOM_FIELDS?.split(',') || [
      'summary',
      'description',
      'status',
      'priority',
      'assignee',
      'issuetype',
      'parent',
      'subtasks',
    ]).map(field => field.trim());
  }

  /**
   * Get a user's account ID by email
   * @param args User lookup arguments
   * @returns User account ID
   */
  async getUserAccountId({ email }: GetUserArgs): Promise<string> {
    try {
      const users = await this.client.searchUsers({
        query: email,
      });

      const user = users.find((u: any) => u.emailAddress === email);
      if (!user) {
        throw new Error(`User with email "${email}" not found`);
      }

      return user.accountId;
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      throw error;
    }
  }

  /**
   * List all issue types available in the Jira instance
   * @returns Array of issue types
   */
  async listIssueTypes(): Promise<IssueType[]> {
    try {
      const issueTypes = await this.client.listIssueTypes();
      return issueTypes.map((type: any) => ({
        id: type.id,
        name: type.name,
        description: type.description,
        subtask: type.subtask,
        iconUrl: type.iconUrl,
      }));
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      throw error;
    }
  }

  /**
   * List all fields available in the Jira instance
   * @returns Array of field definitions
   */
  async listFields(): Promise<JiraField[]> {
    try {
      const fields = await this.client.listFields();
      return fields;
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      throw error;
    }
  }

  /**
   * List all issue link types available in the Jira instance
   * @returns Array of link types
   */
  async listLinkTypes(): Promise<IssueLinkType[]> {
    try {
      const response = await this.client.listIssueLinkTypes();
      return response.issueLinkTypes.map((type: any) => ({
        id: type.id,
        name: type.name,
        inward: type.inward,
        outward: type.outward,
        self: type.self,
      }));
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      throw error;
    }
  }

  /**
   * Get project information
   * @param args Project key and optional expand parameters
   * @returns Project data
   */
  async getProject({ projectKey, expand }: GetProjectArgs): Promise<any> {
    try {
      const options: any = {};
      if (expand && expand.length > 0) {
        options.expand = expand.join(',');
      }
      
      const project = await this.client.getProject(projectKey, options);
      return project;
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      if (error.statusCode === 404) {
        throw new Error(`Project ${projectKey} not found`);
      }
      throw error;
    }
  }

  /**
   * Get issues in a project, optionally filtered by JQL
   * @param args Query parameters
   * @returns Array of issues
   */
  async getIssues({ projectKey, jql, maxResults = 50, fields }: GetIssuesArgs): Promise<any[]> {
    try {
      const baseJql = jql || '';
      const finalJql = baseJql
        ? formatJQL(`project = \${projectKey} AND ${baseJql}`, { projectKey })
        : formatJQL('project = \${projectKey}', { projectKey });

      const finalFields = fields || this.defaultFields;
      
      const response = await this.client.searchJira(finalJql, {
        maxResults,
        fields: finalFields,
      });

      return response.issues || [];
    } catch (error: any) {
      if (error.statusCode === 400) {
        throw new Error(`Invalid JQL query: ${error.message}`);
      }
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      throw error;
    }
  }

  /**
   * Create a new issue or subtask
   * @param args Issue creation parameters
   * @returns Created issue data
   */
  async createIssue(args: CreateIssueArgs): Promise<any> {
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

      // Prepare the issue data
      const issueData: any = {
        fields: {
          project: {
            key: projectKey,
          },
          summary,
          issuetype: {
            name: issueType,
          },
          ...customFields,
        },
      };

      // Add description if provided
      if (description) {
        issueData.fields.description = convertToADF(description);
      }

      // Add parent for subtasks
      if (parent) {
        issueData.fields.parent = {
          key: parent,
        };
      }

      // Add assignee if provided
      if (assignee) {
        try {
          const accountId = await this.getUserAccountId({ email: assignee });
          issueData.fields.assignee = {
            id: accountId,
          };
        } catch (error) {
          // If user lookup fails, continue without assignee
          console.warn(`Could not find user with email ${assignee}: ${error}`);
        }
      }

      // Add labels if provided
      if (labels && labels.length > 0) {
        issueData.fields.labels = labels;
      }

      // Add components if provided
      if (components && components.length > 0) {
        issueData.fields.components = components.map(name => ({ name }));
      }

      // Add priority if provided
      if (priority) {
        issueData.fields.priority = {
          name: priority,
        };
      }

      const issue = await this.client.addNewIssue(issueData);
      return issue;
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      if (error.statusCode === 400) {
        throw new Error(`Invalid issue data: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing issue
   * @param args Issue update parameters
   * @returns Updated issue data
   */
  async updateIssue(args: UpdateIssueArgs): Promise<any> {
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
        fields: {
          ...customFields,
        },
      };

      // Add fields that are provided
      if (summary) {
        updateData.fields.summary = summary;
      }

      if (description) {
        updateData.fields.description = convertToADF(description);
      }

      if (assignee) {
        try {
          const accountId = await this.getUserAccountId({ email: assignee });
          updateData.fields.assignee = {
            id: accountId,
          };
        } catch (error) {
          // If user lookup fails, continue without changing assignee
          console.warn(`Could not find user with email ${assignee}: ${error}`);
        }
      }

      if (priority) {
        updateData.fields.priority = {
          name: priority,
        };
      }

      // Update labels if provided
      if (labels) {
        updateData.fields.labels = labels;
      }

      // Update components if provided
      if (components) {
        updateData.fields.components = components.map(name => ({ name }));
      }

      // If status is provided, use transitions instead of direct update
      if (status) {
        await this.transitionIssue({
          issueKey,
          transitionName: status,
        });
      }

      await this.client.updateIssue(issueKey, updateData);

      // Get the updated issue and return it
      return await this.client.findIssue(issueKey, {
        fields: this.defaultFields,
      });
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      if (error.statusCode === 404) {
        throw new Error(`Issue ${args.issueKey} not found`);
      }
      if (error.statusCode === 400) {
        throw new Error(`Invalid update data: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Bulk update multiple issues at once
   * @param args Bulk update parameters
   * @returns Success message and failures array
   */
  async bulkUpdateIssues(args: BulkUpdateIssuesArgs): Promise<{ message: string; successes: string[]; failures: { issueKey: string; error: string }[] }> {
    const { 
      issueKeys, 
      summary, 
      description, 
      assignee, 
      status, 
      priority,
      addLabels,
      removeLabels,
      setLabels,
      addComponents,
      removeComponents,
      setComponents,
      customFields
    } = args;

    const successes: string[] = [];
    const failures: { issueKey: string; error: string }[] = [];
    let accountId: string | undefined;

    // If assignee provided, get account ID once to reuse
    if (assignee) {
      try {
        accountId = await this.getUserAccountId({ email: assignee });
      } catch (error: any) {
        console.warn(`Could not find user with email ${assignee}: ${error.message}`);
      }
    }

    // Process each issue
    for (const issueKey of issueKeys) {
      try {
        // Get current issue data for fields that need merging (labels, components)
        const currentIssue = await this.client.findIssue(issueKey, {
          fields: ['labels', 'components'],
        });

        const updateData: any = {
          fields: {
            ...customFields,
          },
        };

        // Set simple fields
        if (summary) {
          updateData.fields.summary = summary;
        }

        if (description) {
          updateData.fields.description = convertToADF(description);
        }

        if (accountId) {
          updateData.fields.assignee = {
            id: accountId,
          };
        }

        if (priority) {
          updateData.fields.priority = {
            name: priority,
          };
        }

        // Handle labels
        if (setLabels) {
          // Replace all labels
          updateData.fields.labels = setLabels;
        } else if (addLabels || removeLabels) {
          // Modify existing labels
          const currentLabels = currentIssue.fields.labels || [];
          let newLabels = [...currentLabels];
          
          if (addLabels) {
            // Add only non-existing labels
            addLabels.forEach(label => {
              if (!newLabels.includes(label)) {
                newLabels.push(label);
              }
            });
          }
          
          if (removeLabels) {
            // Remove specified labels
            newLabels = newLabels.filter(label => !removeLabels.includes(label));
          }
          
          updateData.fields.labels = newLabels;
        }

        // Handle components
        if (setComponents) {
          // Replace all components
          updateData.fields.components = setComponents.map(name => ({ name }));
        } else if (addComponents || removeComponents) {
          // Modify existing components
          const currentComponents = (currentIssue.fields.components || []).map((c: any) => c.name);
          let newComponents = [...currentComponents];
          
          if (addComponents) {
            // Add only non-existing components
            addComponents.forEach(comp => {
              if (!newComponents.includes(comp)) {
                newComponents.push(comp);
              }
            });
          }
          
          if (removeComponents) {
            // Remove specified components
            newComponents = newComponents.filter(comp => !removeComponents.includes(comp));
          }
          
          updateData.fields.components = newComponents.map(name => ({ name }));
        }

        // Update the issue
        await this.client.updateIssue(issueKey, updateData);

        // Handle status transition separately if provided
        if (status) {
          await this.transitionIssue({
            issueKey,
            transitionName: status,
          });
        }

        successes.push(issueKey);
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        failures.push({ issueKey, error: errorMessage });
      }
    }

    return {
      message: `Updated ${successes.length} of ${issueKeys.length} issues successfully`,
      successes,
      failures,
    };
  }

  /**
   * Add a watcher to an issue
   * @param args Watcher parameters
   * @returns Success message
   */
  async addWatcher(args: AddWatcherArgs): Promise<{ message: string }> {
    try {
      const { issueKey, username } = args;
      
      // Get the account ID for the username
      const accountId = await this.getUserAccountId({ email: username });
      
      await this.client.addWatcher(issueKey, accountId);
      return { message: `Added ${username} as a watcher to ${issueKey}` };
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      if (error.statusCode === 404) {
        throw new Error(`Issue ${args.issueKey} not found`);
      }
      throw error;
    }
  }

  /**
   * Create a link between two issues
   * @param args Link parameters
   * @returns Success message
   */
  async createIssueLink(args: CreateIssueLinkArgs): Promise<{ message: string }> {
    try {
      const { inwardIssueKey, outwardIssueKey, linkType, comment } = args;

      // Get link type information
      const linkTypes = await this.listLinkTypes();
      const matchedLinkType = linkTypes.find(
        type => type.name.toLowerCase() === linkType.toLowerCase()
      );

      if (!matchedLinkType) {
        throw new Error(`Link type "${linkType}" not found. Available types: ${linkTypes.map(t => t.name).join(', ')}`);
      }

      const linkData: any = {
        type: {
          name: matchedLinkType.name,
        },
        inwardIssue: {
          key: inwardIssueKey,
        },
        outwardIssue: {
          key: outwardIssueKey,
        },
      };

      if (comment) {
        linkData.comment = {
          body: convertToADF(comment),
        };
      }

      await this.client.issueLink(linkData);
      return { 
        message: `Created ${matchedLinkType.name} link between ${outwardIssueKey} (${matchedLinkType.outward}) and ${inwardIssueKey} (${matchedLinkType.inward})` 
      };
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      if (error.statusCode === 404) {
        throw new Error('One or both of the specified issues were not found');
      }
      if (error.statusCode === 400) {
        throw new Error(`Invalid link data: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete an issue
   * @param args Delete parameters
   * @returns Success message
   */
  async deleteIssue(args: DeleteIssueArgs): Promise<{ message: string }> {
    try {
      const { issueKey, deleteSubtasks = false } = args;
      await this.client.deleteIssue(issueKey, deleteSubtasks);
      return { message: `Issue ${issueKey} deleted successfully` };
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      if (error.statusCode === 404) {
        throw new Error(`Issue ${args.issueKey} not found`);
      }
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to delete this issue');
      }
      throw error;
    }
  }

  /**
   * Delete multiple issues
   * @param args Bulk delete parameters
   * @returns Success message
   */
  async bulkDeleteIssues(args: BulkDeleteIssuesArgs): Promise<{ message: string, failures: string[] }> {
    const { issueKeys } = args;
    const failures: string[] = [];

    for (const issueKey of issueKeys) {
      try {
        await this.client.deleteIssue(issueKey);
      } catch (error) {
        failures.push(issueKey);
      }
    }

    return {
      message: `Deleted ${issueKeys.length - failures.length} of ${issueKeys.length} issues`,
      failures,
    };
  }

  /**
   * Get possible transitions for an issue
   * @param args Issue key
   * @returns List of possible transitions
   */
  async getTransitions(args: GetTransitionsArgs): Promise<any[]> {
    try {
      const { issueKey } = args;
      const response = await this.client.listTransitions(issueKey);
      return response.transitions || [];
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      if (error.statusCode === 404) {
        throw new Error(`Issue ${args.issueKey} not found`);
      }
      throw error;
    }
  }

  /**
   * Transition an issue to a new status
   * @param args Transition parameters
   * @returns Success message
   */
  async transitionIssue(args: TransitionIssueArgs): Promise<{ message: string }> {
    try {
      const { issueKey, transitionId, transitionName, comment, fields } = args;
      
      let transitionIdToUse = transitionId;
      
      // If transition name is provided but no ID, look up the ID
      if (!transitionId && transitionName) {
        const transitions = await this.getTransitions({ issueKey });
        const matchedTransition = transitions.find(
          (t: any) => t.name.toLowerCase() === transitionName.toLowerCase()
        );
        
        if (!matchedTransition) {
          throw new Error(`Transition "${transitionName}" not found. Available transitions: ${transitions.map((t: any) => t.name).join(', ')}`);
        }
        
        transitionIdToUse = matchedTransition.id;
      }
      
      if (!transitionIdToUse) {
        throw new Error('Either transitionId or transitionName must be provided');
      }
      
      const transitionData: any = {
        transition: {
          id: transitionIdToUse,
        },
      };
      
      if (comment) {
        transitionData.update = {
          comment: [{
            add: {
              body: convertToADF(comment),
            },
          }],
        };
      }
      
      if (fields) {
        transitionData.fields = fields;
      }
      
      await this.client.transitionIssue(issueKey, transitionData);
      return { message: `Issue ${issueKey} transitioned successfully` };
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      if (error.statusCode === 404) {
        throw new Error(`Issue ${args.issueKey} not found`);
      }
      if (error.statusCode === 400) {
        throw new Error(`Invalid transition data: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Add a comment to an issue
   * @param args Comment parameters
   * @returns The created comment
   */
  async addComment(args: AddCommentArgs): Promise<any> {
    try {
      const { issueKey, body, visibility } = args;
      
      const commentData: any = {
        body: convertToADF(body),
      };
      
      if (visibility) {
        commentData.visibility = visibility;
      }
      
      const response = await this.client.addComment(issueKey, commentData);
      return response;
    } catch (error: any) {
      if (error.statusCode === 401) {
        throw new Error('Authentication failed. Check your Jira credentials.');
      }
      if (error.statusCode === 404) {
        throw new Error(`Issue ${args.issueKey} not found`);
      }
      throw error;
    }
  }
} 