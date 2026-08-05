/**
 * Model types shared by the backend handlers and the widgets.
 *
 * `TemplateAuthor` and `Template` carry the `@zod-to-schema` annotation, so the API generator
 * pulls them into `src/api/api.zod.ts` when a route file imports them. Keep both of them flat
 * object literals -- the generator matches the type body with a non-greedy `{...}` regex and
 * would cut a nested inline object at its first closing brace.
 */

/**
 * @zod-to-schema
 */
export type TemplateAuthor = {
  id?: string;
  login?: string;
  fullName?: string;
};

/**
 * @zod-to-schema
 */
export type Template = {
  id: string;
  name: string;
  summary: string;
  content: string;
  createdAt?: number;
  usageCount?: number;
  isPrivate?: boolean;
  deletedAt?: number;
  author?: TemplateAuthor;
  lockedForOthers?: boolean;
  projectId?: string;
  /** Computed on every response, never persisted. */
  projectName?: string;
  /** Computed on every response, never persisted. */
  canEdit?: boolean;
};

/** A template that has not been saved yet has no id. */
export type NewTemplate = Omit<Template, 'id'> & {id?: string};

/** Project shape returned by `admin/projects` (frontend only). */
export interface YTProject {
  id: string;
  name: string;
  shortName: string;
}

/** Article shape returned by `admin/projects/{key}/articles` (frontend only). */
export interface YTArticle {
  id: string;
  summary: string;
  idReadable: string;
  content?: string;
}

/** Entry of `permissions/cache` used to build the `projects` request parameter. */
export interface CachedPermission {
  global: boolean;
  permission: {
    key: string;
  };
  projects: Array<{
    shortName: string;
  }> | null;
}
