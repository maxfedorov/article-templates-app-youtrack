/**
 * Frontend facade over the generated, type-safe API client.
 *
 * The widgets talk to this class instead of using `createApi()` directly, because:
 *  - both list endpoints need a `projects` request parameter that is derived from the permission
 *    cache; deriving it costs a REST round trip, so it is fetched once and cached per widget;
 *  - the endpoints answer with `{templates}` / `{template}` / `{error}` envelopes, which are
 *    unwrapped here so that components keep working with plain `Template` values;
 *  - the two calls that have no app endpoint (`admin/projects` and the project article list) sit
 *    next to the app endpoints instead of being spread over the widgets.
 */

import {createApi} from '@/api';
import type {ApiRouter} from '@/api/api';
import type {CachedPermission, Template, YTArticle, YTProject} from '@/common/types';
import type {HostAPI} from '../../../@types/globals';

/** Response shapes are read back from the generated router, so they cannot drift from the backend. */
export type ArticleData = Awaited<ReturnType<ApiRouter['article']['article-data']['GET']>>;
export type ApplyTemplateResult = Awaited<ReturnType<ApiRouter['article']['apply-template']['POST']>>;
export type AppSettings = Awaited<ReturnType<ApiRouter['global']['settings']['GET']>>;
export type UserPreferences = Awaited<ReturnType<ApiRouter['global']['user-preferences']['GET']>>;
export type CreateDraftResult = Awaited<ReturnType<ApiRouter['global']['create-draft']['POST']>>;

const CREATE_ARTICLE_PERMISSION = 'JetBrains.YouTrack.CREATE_ARTICLE';
const PERMISSION_CACHE_PATH =
  'permissions/cache?fields=global,permission(key),projects(id,shortName,projectType(id))';
const PROJECTS_PATH = 'admin/projects?fields=id,name,shortName';
const ARTICLE_FIELDS = 'id,summary,idReadable';

/** Every endpoint reports a refused operation the same way, through an `error` message. */
function assertOk(response: {error?: string}): void {
  if (response.error) {
    throw new Error(response.error);
  }
}

/** Turns the `{template, error}` envelope of the single-template endpoints back into a template. */
function unwrapTemplate(response: {template?: Template; error?: string}): Template {
  assertOk(response);
  if (!response.template) {
    throw new Error('The server did not return a template');
  }
  return response.template;
}

/**
 * Fills in the fields the endpoint schema requires.
 *
 * A template that has not been saved yet carries no id -- the backend generates one for every
 * falsy id it receives.
 */
function toPayload(template: Partial<Template>): Template {
  return {
    ...template,
    id: template.id || '',
    name: template.name || '',
    summary: template.summary || '',
    content: template.content || ''
  };
}

/** Projects the caller may create articles in, in the form the list endpoints expect. */
function toProjectsParam(permissions: CachedPermission[]): string {
  const relevant = permissions.filter(perm => perm.permission?.key === CREATE_ARTICLE_PERMISSION);
  if (relevant.length === 0) {
    return '';
  }
  if (relevant.some(perm => perm.global)) {
    return 'all';
  }

  const shortNames = new Set<string>();
  relevant.forEach(perm => (perm.projects || []).forEach(project => {
    if (project.shortName) {
      shortNames.add(project.shortName);
    }
  }));
  return Array.from(shortNames).join(',');
}

export class TemplatesApi {
  private readonly host: HostAPI;
  private readonly api: ApiRouter;
  private projectsParamPromise: Promise<string> | null = null;

  constructor(host: HostAPI) {
    this.host = host;
    this.api = createApi(host);
  }

  /** Reads the article or draft the widget was opened from. */
  async getArticleData(): Promise<ArticleData> {
    return this.api.article['article-data'].GET();
  }

  /** Writes a template into the article or draft the widget was opened from. */
  async applyTemplate(summary: string, content: string): Promise<ApplyTemplateResult> {
    const result = await this.api.article['apply-template'].POST({summary, content});
    assertOk(result);
    return result;
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    assertOk(await this.api.global['template-usage'].POST({id}));
  }

  /**
   * The permission cache is queried once per widget: it never changes while the widget is open,
   * and both list endpoints ask for it. A failed lookup drops the cache so the next call retries.
   */
  private async getProjectsParam(): Promise<string> {
    if (!this.projectsParamPromise) {
      this.projectsParamPromise = this.host
        .fetchYouTrack<CachedPermission[]>(PERMISSION_CACHE_PATH)
        .then(permissions => toProjectsParam(permissions || []))
        .catch(e => {
          this.projectsParamPromise = null;
          throw e;
        });
    }
    return this.projectsParamPromise;
  }

  async getTemplates(): Promise<Template[]> {
    const projects = await this.getProjectsParam();
    const result = await this.api.global.templates.GET({projects});
    return result.templates || [];
  }

  async getDeletedTemplates(): Promise<Template[]> {
    const projects = await this.getProjectsParam();
    const result = await this.api.global['deleted-templates'].GET({projects});
    return result.templates || [];
  }

  /** Creates a template, or overwrites the existing one with the same id. */
  async saveTemplate(template: Partial<Template>): Promise<Template> {
    return unwrapTemplate(await this.api.global.templates.POST({template: toPayload(template)}));
  }

  async deleteTemplate(id: string): Promise<void> {
    assertOk(await this.api.global.templates.DELETE({id}));
  }

  async bulkDeleteTemplates(ids: string[]): Promise<void> {
    assertOk(await this.api.global['bulk-delete-templates'].POST({ids}));
  }

  async restoreTemplate(id: string): Promise<Template> {
    return unwrapTemplate(await this.api.global['restore-template'].POST({id}));
  }

  async bulkRestoreTemplates(ids: string[]): Promise<void> {
    assertOk(await this.api.global['bulk-restore-templates'].POST({ids}));
  }

  async permanentlyDeleteTemplate(id: string): Promise<void> {
    assertOk(await this.api.global['permanent-template'].DELETE({id}));
  }

  async importPredefinedTemplates(): Promise<{importedCount: number}> {
    return this.api.global['import-predefined-templates'].POST({});
  }

  /** Creates an article draft from a template and counts the template as used. */
  async createDraft(
    summary: string,
    content: string,
    projectKey: string,
    parentArticleId?: string,
    templateId?: string
  ): Promise<CreateDraftResult> {
    const result = await this.api.global['create-draft'].POST({
      summary, content, projectKey, parentArticleId, templateId
    });
    assertOk(result);
    return result;
  }

  async getSettings(): Promise<AppSettings> {
    return this.api.global.settings.GET();
  }

  async getUserPreferences(): Promise<UserPreferences> {
    return this.api.global['user-preferences'].GET();
  }

  async toggleFavorite(id: string): Promise<string[]> {
    const result = await this.api.global['toggle-favorite'].POST({id});
    assertOk(result);
    return result.favorites || [];
  }

  async toggleShowFavorites(): Promise<boolean> {
    const result = await this.api.global['toggle-show-favorites'].POST({});
    return result.showFavoritesOnly;
  }

  async setAuthorFilter(authorIds: string[]): Promise<string[]> {
    return (await this.api.global['author-filter'].POST({authorIds})).authorFilter;
  }

  async setProjectFilter(projectIds: string[]): Promise<string[]> {
    return (await this.api.global['project-filter'].POST({projectIds})).projectFilter;
  }

  /** Plain REST: the app has no endpoint of its own for the project list. */
  async getProjects(): Promise<YTProject[]> {
    return (await this.host.fetchYouTrack<YTProject[]>(PROJECTS_PATH)) || [];
  }

  /** Candidates for the "Parent Article" column of the dashboard table. */
  async getArticles(projectKey: string): Promise<YTArticle[]> {
    const path = `admin/projects/${projectKey}/articles?fields=${ARTICLE_FIELDS}`;
    return (await this.host.fetchYouTrack<YTArticle[]>(path)) || [];
  }
}

export const createTemplatesApi = (host: HostAPI): TemplatesApi => new TemplatesApi(host);
