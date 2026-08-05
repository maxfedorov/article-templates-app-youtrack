/**
 * Helpers for the two article-scoped endpoints.
 *
 * YouTrack routes an app endpoint to `articles/{id}` for a published article and to
 * `users/me/articleDrafts/{id}` for a draft. The context exposes the entity under `article` in the
 * first case and under `articleDraft` in the second, so both have to be checked -- the generated
 * `Ctx` type only knows about `article`.
 */

import type {ArticleRef, ProjectRef, UserRef} from './store';
import type {OpResult, WithError} from './result';
import {fail, ok} from './result';

const ERR_ENTITY_NOT_FOUND = 'Entity not found';

interface ArticleScopeCtx {
  currentUser: UserRef;
  article?: ArticleRef;
  articleDraft?: ArticleRef;
  project?: ProjectRef;
}

/** The article or draft the widget was opened from, and the project it belongs to. */
function resolve(ctx: unknown): {entity: ArticleRef | null; project?: ProjectRef; user: UserRef} {
  const scoped = ctx as ArticleScopeCtx;
  const entity = scoped.article || scoped.articleDraft || null;
  return {entity, project: entity?.project || scoped.project, user: scoped.currentUser};
}

export interface ArticleData {
  summary?: string;
  content?: string;
  projectId?: string;
  url?: string;
}

/** Reads the summary, content and project of the current article or draft. */
export function readArticleData(ctx: unknown): OpResult<ArticleData & WithError> {
  const {entity, project} = resolve(ctx);
  if (!entity) {
    return fail(404, ERR_ENTITY_NOT_FOUND);
  }
  return ok({
    summary: entity.summary,
    content: entity.content,
    projectId: project?.shortName,
    url: entity.url
  });
}

/**
 * Compares the article author with the caller.
 *
 * Both sides are compared field by field and only when the field is actually set -- the Workflow API
 * leaves parts of a `User` undefined, and `undefined === undefined` would make every caller look
 * like the author.
 */
const isAuthor = (entity: ArticleRef, user: UserRef): boolean => {
  const author = entity.author;
  if (!author) {
    return false;
  }
  const sameRingId = !!author.ringId && author.ringId === user.ringId;
  const sameLogin = !!author.login && author.login === user.login;
  return sameRingId || sameLogin;
};

/**
 * Whether the current user may overwrite this article or draft.
 *
 * YouTrack lets the author of an article edit it with nothing but `CREATE_ARTICLE`, which is what a
 * Contributor gets -- requiring `UPDATE_ARTICLE` for everyone would lock those users out of their
 * own drafts. Everyone else needs `UPDATE_ARTICLE`.
 *
 * The check cannot be skipped when the project is unknown: extension endpoints run with the app's
 * rights, not the caller's, so an unguarded write here succeeds even for a user the platform would
 * have refused. A draft with no project yet is the caller's own by construction (YouTrack resolves
 * drafts through `users/me/articleDrafts`), so authorship alone is enough there.
 */
function canWriteArticle(entity: ArticleRef, project: ProjectRef | undefined, user: UserRef): boolean {
  if (!project) {
    return isAuthor(entity, user);
  }
  return user.hasPermission('UPDATE_ARTICLE', project) ||
    (isAuthor(entity, user) && user.hasPermission('CREATE_ARTICLE', project));
}

/**
 * Writes a template into the current article or draft.
 *
 * For a draft this only fills it in; for an article that is being edited the change is saved right
 * away, which is why the widget warns about it before calling this.
 */
export function applyTemplateToArticle(
  ctx: unknown,
  summary: string | undefined,
  content: string | undefined
): OpResult<{success?: boolean; url?: string} & WithError> {
  const {entity, project, user} = resolve(ctx);
  if (!entity) {
    return fail(404, ERR_ENTITY_NOT_FOUND);
  }
  if (!canWriteArticle(entity, project, user)) {
    return fail(403, 'You do not have permission to edit this article');
  }

  entity.summary = summary || '';
  entity.content = content || '';

  return ok({success: true, url: entity.url});
}
