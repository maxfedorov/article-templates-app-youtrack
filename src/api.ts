import {HostAPI} from '../@types/globals';

export interface TemplateAuthor {
  id?: string;
  login?: string;
  fullName?: string;
  email?: string;
}

export interface Template {
  id: string;
  name: string;
  summary: string;
  content: string;
  createdAt?: number;
  usageCount?: number;
  isPrivate?: boolean;
  deletedAt?: number;
  author?: TemplateAuthor;
}

export interface YTProject {
  id: string;
  name: string;
  shortName: string;
}

export interface YTArticle {
  id: string;
  summary: string;
  idReadable: string;
  content?: string;
}

export interface AppSettings {
  purgeIntervalDays: number;
}

export interface UserPreferences {
  favorites: string[];
  showFavoritesOnly: boolean;
  authorFilter?: string[];
}

interface ArticleDataResponse {
  summary: string;
  content: string;
}

function extractResult<T>(response: unknown): T {
  const res = response as {result?: T};
  if (res && typeof res === 'object' && 'result' in res && res.result !== undefined) {
    return res.result;
  }
  return response as T;
}

export default class API {
  constructor(private host: HostAPI) {}

  private async request<T>(path: string, options: object = {}): Promise<T> {
    const response = await this.host.fetchApp<T | {result: T}>(path, options);
    return extractResult<T>(response);
  }

  async getArticleData(): Promise<ArticleDataResponse> {
    return this.request<ArticleDataResponse>('backend/article-data', {scope: true});
  }

  async getTemplates(): Promise<Template[]> {
    return this.request<Template[]>('backend-global/templates');
  }

  async getDeletedTemplates(): Promise<Template[]> {
    return this.request<Template[]>('backend-global/deleted-templates');
  }

  async addTemplate(template: Omit<Template, 'id'>): Promise<Template> {
    return this.request<Template>('backend-global/templates', {
      method: 'POST',
      body: template
    });
  }

  async updateTemplate(template: Template): Promise<Template> {
    return this.request<Template>('backend-global/templates', {
      method: 'POST',
      body: template
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.request('backend-global/templates', {
      method: 'DELETE',
      query: {id}
    });
  }

  async bulkDeleteTemplates(ids: string[]): Promise<void> {
    await this.request('backend-global/bulk-delete-templates', {
      method: 'POST',
      body: {ids}
    });
  }

  async restoreTemplate(id: string): Promise<Template> {
    return this.request<Template>('backend-global/restore-template', {
      method: 'POST',
      query: {id}
    });
  }

  async bulkRestoreTemplates(ids: string[]): Promise<void> {
    await this.request('backend-global/bulk-restore-templates', {
      method: 'POST',
      body: {ids}
    });
  }

  async permanentlyDeleteTemplate(id: string): Promise<void> {
    await this.request('backend-global/permanent-template', {
      method: 'DELETE',
      query: {id}
    });
  }

  async importPredefinedTemplates(): Promise<{importedCount: number}> {
    return this.request<{importedCount: number}>('backend-global/import-predefined-templates', {
      method: 'POST'
    });
  }

  async createDraft(summary: string, content: string, projectKey: string, parentArticleId?: string, templateId?: string): Promise<{id: string, url: string, parentArticle: unknown | null}> {
    return this.request<{id: string, url: string, parentArticle: unknown | null}>('backend-global/create-draft', {
      method: 'POST',
      body: {summary, content, projectKey, parentArticleId, templateId}
    });
  }

  async getProjects(): Promise<YTProject[]> {
    const data = await this.host.fetchYouTrack<YTProject[]>('admin/projects?fields=id,name,shortName');
    return extractResult<YTProject[]>(data);
  }

  async getArticles(projectKey: string): Promise<YTArticle[]> {
    const data = await this.host.fetchYouTrack<YTArticle[]>(`admin/projects/${projectKey}/articles?fields=id,summary,idReadable`);
    return extractResult<YTArticle[]>(data);
  }

  async getSettings(): Promise<AppSettings> {
    return this.request<AppSettings>('backend-global/settings');
  }

  async getUserPreferences(): Promise<UserPreferences> {
    return this.request<UserPreferences>('backend-global/user-preferences');
  }

  async toggleFavorite(id: string): Promise<string[]> {
    const res = await this.request<{favorites: string[]}>('backend-global/toggle-favorite', {
      method: 'POST',
      query: {id}
    });
    return res.favorites;
  }

  async toggleShowFavorites(): Promise<boolean> {
    const res = await this.request<{showFavoritesOnly: boolean}>('backend-global/toggle-show-favorites', {
      method: 'POST'
    });
    return res.showFavoritesOnly;
  }

  async setAuthorFilter(authorIds: string[]): Promise<string[]> {
    const res = await this.request<{authorFilter: string[]}>('backend-global/author-filter', {
      method: 'POST',
      body: {authorIds}
    });
    return res.authorFilter;
  }
}
