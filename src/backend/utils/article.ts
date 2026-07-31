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
  if (project && !user.hasPermission('UPDATE_ARTICLE', project)) {
    return fail(403, 'You do not have permission to edit articles in this project');
  }

  entity.summary = summary || '';
  entity.content = content || '';

  return ok({success: true, url: entity.url});
}
