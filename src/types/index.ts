import { z } from "zod";

/**
 * Schema for creating a Jira issue
 */
export const CreateIssueSchema = z.object({
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

export type CreateIssueArgs = z.infer<typeof CreateIssueSchema>;

/**
 * Schema for retrieving issues
 */
export const GetIssuesSchema = z
  .object({
    projectKey: z.string().min(1).optional(),
    jql: z.string().optional(),
    maxResults: z.number().min(1).max(100).optional().default(50),
    fields: z.array(z.string()).optional(),
  })
  .refine((data) => data.projectKey !== undefined || data.jql !== undefined, {
    message: "Either projectKey or jql must be provided",
  });

export type GetIssuesArgs = z.infer<typeof GetIssuesSchema>;

/**
 * Schema for updating an issue
 */
export const UpdateIssueSchema = z.object({
  issueKey: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  assignee: z.string().email().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  customFields: z.record(z.any()).optional(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
});

export type UpdateIssueArgs = z.infer<typeof UpdateIssueSchema>;

/**
 * Schema for bulk updating multiple issues
 */
export const BulkUpdateIssuesSchema = z
  .object({
    issueKeys: z.array(z.string().min(1)),
    summary: z.string().optional(),
    description: z.string().optional(),
    assignee: z.string().email().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    addLabels: z.array(z.string()).optional(),
    removeLabels: z.array(z.string()).optional(),
    setLabels: z.array(z.string()).optional(),
    addComponents: z.array(z.string()).optional(),
    removeComponents: z.array(z.string()).optional(),
    setComponents: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
  })
  .refine(
    (data) => {
      // Ensure at least one update field is provided
      return (
        data.summary !== undefined ||
        data.description !== undefined ||
        data.assignee !== undefined ||
        data.status !== undefined ||
        data.priority !== undefined ||
        data.addLabels !== undefined ||
        data.removeLabels !== undefined ||
        data.setLabels !== undefined ||
        data.addComponents !== undefined ||
        data.removeComponents !== undefined ||
        data.setComponents !== undefined ||
        (data.customFields !== undefined &&
          Object.keys(data.customFields).length > 0)
      );
    },
    {
      message: "At least one field to update must be provided",
    },
  );

export type BulkUpdateIssuesArgs = z.infer<typeof BulkUpdateIssuesSchema>;

/**
 * Schema for creating an issue link
 */
export const CreateIssueLinkSchema = z.object({
  inwardIssueKey: z.string().min(1),
  outwardIssueKey: z.string().min(1),
  linkType: z.string().min(1),
  comment: z.string().optional(),
});

export type CreateIssueLinkArgs = z.infer<typeof CreateIssueLinkSchema>;

/**
 * Schema for getting a user's account ID
 */
export const GetUserSchema = z.object({
  email: z.string().email(),
});

export type GetUserArgs = z.infer<typeof GetUserSchema>;

/**
 * Schema for deleting an issue
 */
export const DeleteIssueSchema = z.object({
  issueKey: z.string().min(1),
  deleteSubtasks: z.boolean().optional().default(false),
});

export type DeleteIssueArgs = z.infer<typeof DeleteIssueSchema>;

/**
 * Schema for bulk deleting issues
 */
export const BulkDeleteIssuesSchema = z.object({
  issueKeys: z.array(z.string().min(1)),
});

export type BulkDeleteIssuesArgs = z.infer<typeof BulkDeleteIssuesSchema>;

/**
 * Schema for transitioning an issue
 */
export const TransitionIssueSchema = z
  .object({
    issueKey: z.string().min(1),
    transitionId: z.string().optional(),
    transitionName: z.string().optional(),
    comment: z.string().optional(),
    resolution: z.string().optional(),
    fields: z.record(z.any()).optional(),
  })
  .refine(
    (data) =>
      data.transitionId !== undefined || data.transitionName !== undefined,
    {
      message: "Either transitionId or transitionName must be provided",
    },
  );

export type TransitionIssueArgs = z.infer<typeof TransitionIssueSchema>;

/**
 * Schema for adding a comment to an issue
 */
export const AddCommentSchema = z.object({
  issueKey: z.string().min(1),
  body: z.string().min(1),
  visibility: z
    .object({
      type: z.enum(["group", "role"]),
      value: z.string(),
    })
    .optional(),
});

export type AddCommentArgs = z.infer<typeof AddCommentSchema>;

/**
 * Schema for retrieving issue transitions
 */
export const GetTransitionsSchema = z.object({
  issueKey: z.string().min(1),
});

export type GetTransitionsArgs = z.infer<typeof GetTransitionsSchema>;

/**
 * Schema for adding watcher to an issue
 */
export const AddWatcherSchema = z.object({
  issueKey: z.string().min(1),
  username: z.string().email(),
});

export type AddWatcherArgs = z.infer<typeof AddWatcherSchema>;

/**
 * Schema for getting project information
 */
export const GetProjectSchema = z.object({
  projectKey: z.string().min(1),
  expand: z.array(z.string()).optional(),
});

export type GetProjectArgs = z.infer<typeof GetProjectSchema>;

/**
 * Schema for searching issues across all projects
 */
export const SearchIssuesSchema = z.object({
  jql: z.string().min(1),
  maxResults: z.number().min(1).max(100).optional().default(50),
  fields: z.array(z.string()).optional(),
});

export type SearchIssuesArgs = z.infer<typeof SearchIssuesSchema>;

/**
 * Interface for Jira issue type
 */
export interface IssueType {
  id: string;
  name: string;
  description?: string;
  subtask: boolean;
  iconUrl?: string;
}

/**
 * Interface for Jira field definition
 */
export interface JiraField {
  id: string;
  name: string;
  custom: boolean;
  orderable: boolean;
  navigable: boolean;
  searchable: boolean;
  clauseNames: string[];
  schema?: {
    type: string;
    items?: string;
    system?: string;
    custom?: string;
    customId?: number;
  };
}

/**
 * Interface for Jira link type
 */
export interface IssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self?: string;
}
