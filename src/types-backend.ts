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
  key: string;
  name: string;
  shortName: string;
}

export interface YTArticle {
  id: string;
  idReadable: string;
  url: string;
  summary: string;
  content: string;
  parentArticle?: YTArticle | null;
}

export interface YTUser {
  id: string;
  ringId?: string;
  login: string;
  fullName: string;
  email?: string;
  extensionProperties: Record<string, string>;
}

export interface Context {
  request: {
    json: <T = unknown>() => T;
    getParameter: (name: string) => string | null;
  };
  response: {
    code: number;
    json: (data: unknown) => void;
  };
  currentUser: YTUser;
  settings: {
    purgeIntervalDays: number;
  };
  project?: YTProject;
  article?: YTArticle;
  articleDraft?: YTArticle;
  globalStorage: {
    extensionProperties: Record<string, string>;
  };
}
