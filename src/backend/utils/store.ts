/**
 * Persistence layer for templates and per-user preferences.
 *
 * Shared templates live in `AppGlobalStorage.extensionProperties`, private templates and all
 * preferences live on the current `User`. Everything is stored as a JSON string, because
 * extension properties only accept scalars.
 *
 * This module is bundled into `dist/backend-utils.js` and required from every route chunk, so
 * it may use module-level constants and classes -- unlike the route files themselves, where the
 * router plugin keeps only the `handle` function.
 */

import * as entities from '@jetbrains/youtrack-scripting-api/entities';
import type {Template} from '@/common/types';
import {PREDEFINED_TEMPLATES} from './predefined-templates';

const DEFAULT_PURGE_DAYS = 7;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const MS_IN_SECOND = 1000;
const MS_PER_DAY = HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND;
const RADIX_36 = 36;
const SUBSTR_START = 2;
const SUBSTR_END = 9;

/** Project as exposed by the Workflow API. */
export interface ProjectRef {
  key: string;
  name: string;
  shortName: string;
}

/** Article (or article draft) as exposed by the Workflow API. */
export interface ArticleRef {
  id: string;
  idReadable: string;
  url: string;
  summary: string;
  content: string;
  project?: ProjectRef;
  parentArticle?: ArticleRef | null;
}

/** The subset of the Workflow API `User` the app relies on. */
export interface UserRef {
  id: string;
  ringId?: string;
  login: string;
  fullName: string;
  email?: string;
  extensionProperties: Record<string, string | undefined>;
  hasPermission: (permission: string, project?: ProjectRef) => boolean;
}

/** Structural view of the global-scope handler context. */
export interface GlobalScopeCtx {
  currentUser: UserRef;
  settings?: {purgeIntervalDays?: number};
  globalStorage: {extensionProperties: Record<string, string | undefined>};
}

interface EntitiesApi {
  Project: {findByKey: (key: string) => ProjectRef | null};
  Article: {
    createDraft: (project: ProjectRef, user: UserRef) => ArticleRef;
    findById: (id: string) => ArticleRef | null;
  };
}

const ytEntities = entities as unknown as EntitiesApi;

/** The full set of templates the current user can see, split by storage location. */
export interface StoreData {
  shared: Template[];
  private: Template[];
  deletedShared: Template[];
  deletedPrivate: Template[];
  initialImportDone: boolean;
}

export type StorePatch = Partial<StoreData>;

export const generateId = (): string =>
  Date.now().toString() + Math.random().toString(RADIX_36).substring(SUBSTR_START, SUBSTR_END);

export const findProject = (key: string): ProjectRef | null => ytEntities.Project.findByKey(key);

export const findArticle = (id: string): ArticleRef | null => ytEntities.Article.findById(id);

export const createArticleDraft = (project: ProjectRef, user: UserRef): ArticleRef =>
  ytEntities.Article.createDraft(project, user);

function parseList(json: string | undefined): Template[] {
  try {
    const parsed = json ? JSON.parse(json) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse stored templates', e);
    return [];
  }
}

function parseIds(json: string | undefined): string[] {
  try {
    const parsed = json ? JSON.parse(json) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Older versions stored a single id as a plain string.
    return json ? [json] : [];
  }
}

export class TemplateStore {
  private readonly ctx: GlobalScopeCtx;

  constructor(ctx: GlobalScopeCtx) {
    this.ctx = ctx;
  }

  get currentUser(): UserRef {
    return this.ctx.currentUser;
  }

  private get globalProps(): Record<string, string | undefined> {
    return this.ctx.globalStorage.extensionProperties;
  }

  private get userProps(): Record<string, string | undefined> {
    return this.ctx.currentUser.extensionProperties;
  }

  get data(): StoreData {
    return {
      shared: parseList(this.globalProps.templates),
      private: parseList(this.userProps.templates),
      deletedShared: parseList(this.globalProps.deletedTemplates),
      deletedPrivate: parseList(this.userProps.deletedTemplates),
      initialImportDone: this.globalProps.initialImportDone === 'true'
    };
  }

  save(patch: StorePatch): void {
    if (patch.shared !== undefined) {
      this.globalProps.templates = JSON.stringify(patch.shared);
    }
    if (patch.private !== undefined) {
      this.userProps.templates = JSON.stringify(patch.private);
    }
    if (patch.deletedShared !== undefined) {
      this.globalProps.deletedTemplates = JSON.stringify(patch.deletedShared);
    }
    if (patch.deletedPrivate !== undefined) {
      this.userProps.deletedTemplates = JSON.stringify(patch.deletedPrivate);
    }
    if (patch.initialImportDone !== undefined) {
      this.globalProps.initialImportDone = patch.initialImportDone ? 'true' : 'false';
    }
  }

  get favorites(): string[] {
    return parseIds(this.userProps.favorites);
  }

  set favorites(ids: string[]) {
    this.userProps.favorites = JSON.stringify(ids);
  }

  get showFavoritesOnly(): boolean {
    return this.userProps.showFavoritesOnly === 'true';
  }

  set showFavoritesOnly(value: boolean) {
    this.userProps.showFavoritesOnly = value ? 'true' : 'false';
  }

  get authorFilter(): string[] {
    return parseIds(this.userProps.authorFilter);
  }

  set authorFilter(ids: string[]) {
    this.userProps.authorFilter = JSON.stringify(ids);
  }

  get projectFilter(): string[] {
    return parseIds(this.userProps.projectFilter);
  }

  set projectFilter(ids: string[]) {
    this.userProps.projectFilter = JSON.stringify(ids);
  }

  get purgeIntervalDays(): number {
    return this.ctx.settings?.purgeIntervalDays ?? DEFAULT_PURGE_DAYS;
  }

  /**
   * Drops trashed templates older than the configured purge interval and, on the very first run,
   * seeds the shared storage with the predefined templates.
   *
   * @param shouldSave pass `false` from GET handlers -- YouTrack forbids writes there.
   */
  purge(shouldSave: boolean): StoreData {
    const data = this.data;
    const intervalMs = this.purgeIntervalDays * MS_PER_DAY;
    const now = Date.now();
    const keepFresh = (list: Template[]) => list.filter(t => t.deletedAt && (now - t.deletedAt < intervalMs));

    const deletedShared = keepFresh(data.deletedShared);
    const deletedPrivate = keepFresh(data.deletedPrivate);
    const trashChanged = deletedShared.length !== data.deletedShared.length ||
      deletedPrivate.length !== data.deletedPrivate.length;

    if (!shouldSave) {
      return {...data, deletedShared, deletedPrivate};
    }
    if (!data.initialImportDone) {
      const existing = new Set(data.shared.map(t => t.id));
      const shared = [...data.shared, ...PREDEFINED_TEMPLATES.filter(t => !existing.has(t.id))];
      this.save({shared, deletedShared, deletedPrivate, initialImportDone: true});
      return {...data, shared, deletedShared, deletedPrivate, initialImportDone: true};
    }
    if (trashChanged) {
      this.save({deletedShared, deletedPrivate});
    }
    return {...data, deletedShared, deletedPrivate};
  }
}

/**
 * Builds a store from a handler context.
 *
 * The global-scope `Ctx` types `currentUser` as the raw Workflow API `User`, whose
 * `extensionProperties` are generic. The cast narrows it to the shape this app writes.
 */
export const createStore = (ctx: unknown): TemplateStore => new TemplateStore(ctx as GlobalScopeCtx);
