/**
 * Template operations shared by the `global` route handlers.
 *
 * Each operation returns an {@link OpResult} -- an HTTP status code plus the response body -- so
 * the route files stay a two-liner: run the operation, copy the code, send the body. That matters
 * here: the router build plugin keeps only the `handle` function body of a route file and drops
 * every module-level declaration, so all reusable logic has to live in this module.
 */

import type {Template, TemplateAuthor} from '@/common/types';
import {PREDEFINED_TEMPLATES} from './predefined-templates';
import type {ArticleRef, ProjectRef, StoreData, TemplateStore, UserRef} from './store';
import {createArticleDraft, createStore, findArticle, findProject, generateId} from './store';
import type {OpResult, WithError} from './result';
import {fail, ok} from './result';

const ERR_ID_REQUIRED = 'ID is required';
const ERR_IDS_REQUIRED = 'IDs array is required';
const ERR_NOT_FOUND = 'Template not found';
const ERR_NOT_IN_TRASH = 'Template not found in trash';
const ERR_NO_CREATE = 'You do not have permission to create templates';
const ERR_IMPORT_ADMIN = 'Only project administrators can import predefined templates';

/**
 * `hasPermission` throws on an unknown key, so every call is wrapped: a permission the caller does
 * not hold must read as `false`, never bubble up as a 500.
 */
function hasPermission(user: UserRef, permission: string, project?: ProjectRef): boolean {
  try {
    return user.hasPermission(permission, project);
  } catch {
    return false;
  }
}

/**
 * The base capability for touching shared template storage at all: the caller must be able to
 * create articles somewhere. With no project argument YouTrack answers "in any accessible scope",
 * so this is `false` for guests and for users with no article-creation role anywhere.
 */
export function canManageTemplates(user: UserRef): boolean {
  return hasPermission(user, 'CREATE_ARTICLE');
}

/** Global app administrators bypass every authorship/lock check so a template is never orphaned. */
export function isAppAdmin(user: UserRef): boolean {
  return hasPermission(user, 'ADMIN_UPDATE_APP');
}

/**
 * Whether the caller may administer a template regardless of authorship or the lock flag. A
 * project-bound template answers to an admin of that project (`UPDATE_PROJECT` on it); a template
 * with no project answers to an admin of any project. A global app admin always qualifies.
 */
export function isTemplateAdmin(user: UserRef, template: Template): boolean {
  if (isAppAdmin(user)) {
    return true;
  }
  if (template.projectId) {
    const project = findProject(template.projectId);
    return !!project && hasPermission(user, 'UPDATE_PROJECT', project);
  }
  return hasPermission(user, 'UPDATE_PROJECT');
}

/**
 * Seeding the built-in templates into shared storage is an administrative action, opened up to any
 * project administrator (they already curate templates for their project) as well as app admins.
 */
export function canImportPredefined(user: UserRef): boolean {
  return isAppAdmin(user) || hasPermission(user, 'UPDATE_PROJECT');
}

/**
 * Whether the caller wrote the template. `author.id` stores the ring id (see {@link getAuthor}).
 * A login can be reassigned to a different person, so only the immutable id is trusted here.
 */
export function isTemplateAuthor(template: Template, user: UserRef): boolean {
  const author = template.author;
  return !!author?.id && !!user.ringId && author.id === user.ringId;
}

/**
 * Who may modify (edit, trash, restore, purge) an existing template. Extension endpoints run with
 * the app's rights, so this is the only thing standing between a stranger and someone else's
 * template:
 * - a template admin (see {@link isTemplateAdmin}) or the author may always change it;
 * - while the author leaves it unlocked, anyone who can see and use it may edit it too -- the base
 *   article-creation capability plus access to the bound project, which excludes guests and users
 *   with no article role anywhere;
 * - once `lockedForOthers` is set, only the author and admins get through.
 */
export function canModifyTemplate(template: Template, user: UserRef): boolean {
  if (isTemplateAdmin(user, template) || isTemplateAuthor(template, user)) {
    return true;
  }
  if (template.lockedForOthers) {
    return false;
  }
  return canManageTemplates(user) && checkProjectPermission(user, template.projectId);
}

/** Templates bound to a project are only visible to users who can create articles in it. */
export function checkProjectPermission(currentUser: UserRef, projectId: string | undefined): boolean {
  if (!projectId) {
    return true;
  }
  const project = findProject(projectId);
  if (!project) {
    return false;
  }
  return hasPermission(currentUser, 'CREATE_ARTICLE', project);
}

/**
 * Only the author fields the UI needs. Templates written by earlier versions also carry the
 * author's email, which nothing reads -- it is dropped both on the way out and on the next save.
 */
const pickAuthorFields = (author: TemplateAuthor): TemplateAuthor => ({
  id: author.id,
  login: author.login,
  fullName: author.fullName
});

/** Adds the computed `projectName` / `canEdit` fields, which are never persisted. */
function processTemplateForResponse(template: Template, currentUser: UserRef): Template {
  const result: Template = {...template};
  delete result.projectName;
  delete result.canEdit;

  if (template.author) {
    result.author = pickAuthorFields(template.author);
  }

  if (template.projectId) {
    const project = findProject(template.projectId);
    if (project) {
      result.projectName = project.name;
      result.projectId = project.shortName;
    }
  }
  result.canEdit = canModifyTemplate(template, currentUser);
  return result;
}

/**
 * Builds the predicate used by both list endpoints.
 *
 * `projects` carries the projects the caller may create articles in: `all` for a global
 * permission, a comma-separated list of short names otherwise.
 */
function isVisible(currentUser: UserRef, projects: string | undefined): (t: Template) => boolean {
  const allowed = projects ? projects.split(',') : [];
  return (t: Template) => {
    if (!checkProjectPermission(currentUser, t.projectId)) {
      return false;
    }
    if (projects === 'all' || !t.projectId) {
      return true;
    }
    return allowed.includes(t.projectId);
  };
}

const withoutDeletedAt = (template: Template): Template => {
  const restored = {...template};
  delete restored.deletedAt;
  return restored;
};

const findTemplate = (id: string | undefined, ...lists: Template[][]): Template | undefined =>
  lists.reduce<Template | undefined>((found, list) => found || list.find(t => t.id === id), undefined);

/**
 * The active templates the caller can see.
 *
 * Until the first write happens the predefined templates are only shown, not stored -- a GET
 * handler must not modify the database.
 */
export function listTemplates(ctx: unknown, projects?: string): Template[] {
  const store = createStore(ctx);
  const data = store.purge(false);
  const deletedIds = new Set([...data.deletedShared, ...data.deletedPrivate].map(t => t.id));
  const all = new Map<string, Template>();

  const collect = (list: Template[], isPrivate: boolean) => list.forEach(t => {
    if (!deletedIds.has(t.id)) {
      all.set(t.id, {...t, isPrivate});
    }
  });

  if (!data.initialImportDone) {
    collect(PREDEFINED_TEMPLATES, false);
  }
  collect(data.shared, false);
  collect(data.private, true);

  return Array.from(all.values())
    .filter(isVisible(store.currentUser, projects))
    .map(t => processTemplateForResponse(t, store.currentUser));
}

/** The trashed templates the caller can see. */
export function listDeletedTemplates(ctx: unknown, projects?: string): Template[] {
  const store = createStore(ctx);
  const {deletedShared, deletedPrivate} = store.purge(false);

  return [
    ...deletedShared.map(t => ({...t, isPrivate: false})),
    ...deletedPrivate.map(t => ({...t, isPrivate: true}))
  ]
    .filter(isVisible(store.currentUser, projects))
    .map(t => processTemplateForResponse(t, store.currentUser));
}

/** Keeps only the persisted fields, so computed ones never leak into storage. */
function prepareTemplate(input: Template, old: Template | undefined, currentUser: UserRef): Template {
  const base = old || ({} as Template);
  return {
    id: input.id || generateId(),
    name: input.name,
    summary: input.summary,
    content: input.content,
    createdAt: base.createdAt || input.createdAt || Date.now(),
    usageCount: base.usageCount ?? input.usageCount ?? 0,
    isPrivate: input.isPrivate,
    author: old ? (base.author && pickAuthorFields(base.author)) : getAuthor(currentUser),
    lockedForOthers: input.lockedForOthers,
    projectId: input.projectId
  };
}

function getAuthor(user: UserRef): TemplateAuthor {
  return {
    id: user?.ringId || user?.id || '',
    login: user?.login || '',
    fullName: user?.fullName || ''
  };
}

/** Creates a template or overwrites an existing one, moving it between shared and private storage. */
export function saveTemplate(ctx: unknown, input: Template): OpResult<{template?: Template} & WithError> {
  const store = createStore(ctx);
  const {shared, private: priv} = store.purge(true);
  const user = store.currentUser;
  const old = input.id ? findTemplate(input.id, shared, priv) : undefined;

  const denied = saveDenialReason(user, input, old);
  if (denied) {
    return fail(denied.code, denied.error);
  }

  const template = prepareTemplate(input, old, user);
  if (!old) {
    const favorites = store.favorites;
    if (!favorites.includes(template.id)) {
      store.favorites = [...favorites, template.id];
    }
  }

  const updatedShared = shared.filter(t => t.id !== template.id);
  const updatedPrivate = priv.filter(t => t.id !== template.id);
  (template.isPrivate ? updatedPrivate : updatedShared).push(template);
  store.save({shared: updatedShared, private: updatedPrivate});

  return ok({template: processTemplateForResponse(template, user)});
}

function saveDenialReason(
  user: UserRef,
  input: Template,
  old: Template | undefined
): {code: number; error: string} | null {
  // Editing an existing template is gated by {@link canModifyTemplate} (author/admin, or anyone
  // who can see and use it while it is unlocked).
  if (old) {
    if (!canModifyTemplate(old, user)) {
      return {code: 403, error: 'You do not have permission to edit this template'};
    }
  } else if (!canManageTemplates(user)) {
    // Creating a new one: the caller must be able to create articles somewhere.
    return {code: 403, error: ERR_NO_CREATE};
  }
  // The target project (whether new or unchanged) must be one the caller can create articles in.
  if (input.projectId && !checkProjectPermission(user, input.projectId)) {
    return {code: 403, error: 'You do not have permission to use the selected project'};
  }
  return null;
}

/** Moves a template to the trash, where it stays until the purge interval elapses. */
export function deleteTemplate(ctx: unknown, id: string | undefined): OpResult<{success?: boolean} & WithError> {
  if (!id) {
    return fail(400, ERR_ID_REQUIRED);
  }
  const store = createStore(ctx);
  const {shared, private: priv, deletedShared, deletedPrivate} = store.purge(true);
  const template = findTemplate(id, shared, priv, PREDEFINED_TEMPLATES);

  if (!template) {
    return fail(404, ERR_NOT_FOUND);
  }
  if (!canModifyTemplate(template, store.currentUser)) {
    return fail(403, 'You do not have permission to delete this template');
  }

  const trashed = {...template, deletedAt: Date.now()};
  store.save({
    shared: shared.filter(t => t.id !== id),
    private: priv.filter(t => t.id !== id),
    deletedShared: template.isPrivate ? deletedShared : [...deletedShared, trashed],
    deletedPrivate: template.isPrivate ? [...deletedPrivate, trashed] : deletedPrivate
  });

  return ok({success: true});
}

/**
 * Trashes every template the caller is allowed to delete and reports how many that was, so the UI
 * can tell the user which ones were skipped.
 */
export function bulkDeleteTemplates(
  ctx: unknown,
  ids: string[] | undefined
): OpResult<{success?: boolean; count?: number} & WithError> {
  if (!ids?.length) {
    return fail(400, ERR_IDS_REQUIRED);
  }
  const store = createStore(ctx);
  const {shared, private: priv, deletedShared, deletedPrivate} = store.purge(true);
  const user = store.currentUser;
  const requested = new Set(ids);
  const allowed = (t: Template) => requested.has(t.id) && canModifyTemplate(t, user);

  const fromShared = shared.filter(allowed);
  const fromPrivate = priv.filter(allowed);
  const stored = new Set([...fromShared, ...fromPrivate].map(t => t.id));
  // Predefined templates are only materialised on the first write, so they may not be in `shared`.
  const fromPredefined = PREDEFINED_TEMPLATES.filter(t => allowed(t) && !stored.has(t.id));

  if (!fromShared.length && !fromPrivate.length && !fromPredefined.length) {
    return fail(403, 'No templates found or you do not have permission to delete them');
  }

  const now = Date.now();
  const trash = (list: Template[], isPrivate: boolean) => list.map(t => ({...t, deletedAt: now, isPrivate}));

  store.save({
    shared: shared.filter(t => !stored.has(t.id)),
    private: priv.filter(t => !stored.has(t.id)),
    deletedShared: [...deletedShared, ...trash([...fromShared, ...fromPredefined], false)],
    deletedPrivate: [...deletedPrivate, ...trash(fromPrivate, true)]
  });

  return ok({success: true, count: fromShared.length + fromPrivate.length + fromPredefined.length});
}

/** Moves a template back out of the trash. */
export function restoreTemplate(ctx: unknown, id: string | undefined): OpResult<{template?: Template} & WithError> {
  const store = createStore(ctx);
  const {shared, private: priv, deletedShared, deletedPrivate} = store.purge(true);
  const template = findTemplate(id, deletedShared, deletedPrivate);

  if (!template) {
    return fail(404, ERR_NOT_IN_TRASH);
  }
  if (!canModifyTemplate(template, store.currentUser)) {
    return fail(403, 'You do not have permission to restore this template');
  }

  const restored = withoutDeletedAt(template);
  store.save({
    shared: template.isPrivate ? shared : [...shared, restored],
    private: template.isPrivate ? [...priv, restored] : priv,
    deletedShared: deletedShared.filter(t => t.id !== id),
    deletedPrivate: deletedPrivate.filter(t => t.id !== id)
  });

  return ok({template: processTemplateForResponse(restored, store.currentUser)});
}

/** Restores every trashed template the caller is allowed to restore. */
export function bulkRestoreTemplates(
  ctx: unknown,
  ids: string[] | undefined
): OpResult<{success?: boolean; count?: number} & WithError> {
  if (!ids?.length) {
    return fail(400, ERR_IDS_REQUIRED);
  }
  const store = createStore(ctx);
  const {shared, private: priv, deletedShared, deletedPrivate} = store.purge(true);
  const user = store.currentUser;
  const requested = new Set(ids);
  const allowed = (t: Template) => requested.has(t.id) && canModifyTemplate(t, user);

  const fromShared = deletedShared.filter(allowed);
  const fromPrivate = deletedPrivate.filter(allowed);

  if (!fromShared.length && !fromPrivate.length) {
    return fail(403, 'No templates found in trash or you do not have permission to restore them');
  }

  const restoredIds = new Set([...fromShared, ...fromPrivate].map(t => t.id));
  store.save({
    shared: [...shared, ...fromShared.map(withoutDeletedAt)],
    private: [...priv, ...fromPrivate.map(withoutDeletedAt)],
    deletedShared: deletedShared.filter(t => !restoredIds.has(t.id)),
    deletedPrivate: deletedPrivate.filter(t => !restoredIds.has(t.id))
  });

  return ok({success: true, count: fromShared.length + fromPrivate.length});
}

/** Drops a template from the trash for good. */
export function permanentDeleteTemplate(
  ctx: unknown,
  id: string | undefined
): OpResult<{success?: boolean} & WithError> {
  if (!id) {
    return fail(400, ERR_ID_REQUIRED);
  }
  const store = createStore(ctx);
  const {deletedShared, deletedPrivate} = store.purge(true);
  const template = findTemplate(id, deletedShared, deletedPrivate);

  if (!template) {
    return fail(404, ERR_NOT_FOUND);
  }
  if (!canModifyTemplate(template, store.currentUser)) {
    return fail(403, 'You do not have permission to permanently delete this template');
  }

  const favorites = store.favorites;
  if (favorites.includes(id)) {
    store.favorites = favorites.filter(f => f !== id);
  }
  store.save({
    deletedShared: deletedShared.filter(t => t.id !== id),
    deletedPrivate: deletedPrivate.filter(t => t.id !== id)
  });

  return ok({success: true});
}

/**
 * Copies the predefined templates into shared storage, skipping the ones whose name is already
 * taken. Each copy gets a fresh id so it can be edited independently of the built-in definition.
 */
export function importPredefinedTemplates(
  ctx: unknown
): OpResult<{success?: boolean; importedCount?: number} & WithError> {
  const store = createStore(ctx);
  // Bulk-seeds shared storage for the whole instance, so it is reserved for project/app admins.
  if (!canImportPredefined(store.currentUser)) {
    return fail(403, ERR_IMPORT_ADMIN);
  }
  const {shared} = store.purge(true);
  const existing = new Set(shared.map(t => t.name.toLowerCase()));
  const toAdd = PREDEFINED_TEMPLATES
    .filter(t => !existing.has(t.name.toLowerCase()))
    .map(t => ({...t, id: generateId(), isPrivate: false, createdAt: Date.now()}));

  if (toAdd.length) {
    store.save({shared: [...shared, ...toAdd], initialImportDone: true});
  }
  return ok({success: true, importedCount: toAdd.length});
}

/** Bumps the usage counter of a template wherever it is stored. */
export function incrementTemplateUsage(store: TemplateStore, templateId: string | undefined): void {
  if (!templateId) {
    return;
  }
  const data: StoreData = store.data;
  let changed = false;
  const bump = (list: Template[]) => list.map(t => {
    if (t.id !== templateId) {
      return t;
    }
    changed = true;
    return {...t, usageCount: (t.usageCount || 0) + 1};
  });

  const shared = bump(data.shared);
  const priv = bump(data.private);
  if (changed) {
    store.save({shared, private: priv});
  }
}

/** Bumps the usage counter from a request handler. */
export function trackTemplateUsage(ctx: unknown, id: string | undefined): OpResult<{success?: boolean} & WithError> {
  if (!id) {
    return fail(400, ERR_ID_REQUIRED);
  }
  const store = createStore(ctx);
  if (!canManageTemplates(store.currentUser)) {
    return fail(403, ERR_NO_CREATE);
  }
  incrementTemplateUsage(store, id);
  return ok({success: true});
}

export interface CreateDraftInput {
  summary?: string;
  content?: string;
  projectKey: string;
  parentArticleId?: string;
  templateId?: string;
}

/**
 * Creates an article draft filled in from a template.
 *
 * The draft has to be created on the backend: the REST API cannot produce one with a usable URL,
 * and only the Workflow API can attach it to a parent article.
 */
export function createDraftFromTemplate(
  ctx: unknown,
  input: CreateDraftInput
): OpResult<{id?: string; url?: string} & WithError> {
  const store = createStore(ctx);
  store.purge(true);

  const project = findProject(input.projectKey);
  if (!project) {
    return fail(404, `Project not found: ${input.projectKey}`);
  }
  if (!hasPermission(store.currentUser, 'CREATE_ARTICLE', project)) {
    return fail(403, `You do not have permission to create articles in project: ${input.projectKey}`);
  }

  // Resolve the parent before creating the draft: a caller who cannot read the parent must not be
  // able to graft their new draft under it, and failing here leaves no orphan draft behind.
  let parent: ArticleRef | null = null;
  if (input.parentArticleId) {
    parent = findArticle(input.parentArticleId);
    if (parent && (!parent.project || !hasPermission(store.currentUser, 'READ_ARTICLE', parent.project))) {
      return fail(403, 'You do not have permission to use the selected parent article');
    }
  }

  const draft: ArticleRef = createArticleDraft(project, store.currentUser);
  draft.summary = input.summary || '';
  draft.content = input.content || '';
  if (parent) {
    draft.parentArticle = parent;
  }

  incrementTemplateUsage(store, input.templateId);
  return ok({id: draft.id, url: draft.url});
}

/** The app settings the widgets need, with the admin's value already defaulted. */
export function readSettings(ctx: unknown): {purgeIntervalDays: number} {
  return {purgeIntervalDays: createStore(ctx).purgeIntervalDays};
}

/** Favourites, the favourites-only switch and the two list filters, as stored for the caller. */
export interface UserPreferences {
  favorites: string[];
  showFavoritesOnly: boolean;
  authorFilter: string[];
  projectFilter: string[];
}

export function readUserPreferences(ctx: unknown): UserPreferences {
  const store = createStore(ctx);
  return {
    favorites: store.favorites,
    showFavoritesOnly: store.showFavoritesOnly,
    authorFilter: store.authorFilter,
    projectFilter: store.projectFilter
  };
}

export function setAuthorFilter(ctx: unknown, authorIds: string[] | undefined): string[] {
  const store = createStore(ctx);
  store.authorFilter = authorIds || [];
  return store.authorFilter;
}

export function setProjectFilter(ctx: unknown, projectIds: string[] | undefined): string[] {
  const store = createStore(ctx);
  store.projectFilter = projectIds || [];
  return store.projectFilter;
}

export function toggleFavorite(ctx: unknown, id: string | undefined): OpResult<{favorites?: string[]} & WithError> {
  if (!id) {
    return fail(400, ERR_ID_REQUIRED);
  }
  const store = createStore(ctx);
  const favorites = store.favorites;
  store.favorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
  return ok({favorites: store.favorites});
}

export function toggleShowFavorites(ctx: unknown): boolean {
  const store = createStore(ctx);
  store.showFavoritesOnly = !store.showFavoritesOnly;
  return store.showFavoritesOnly;
}
