import {ApplyTemplateRequest, Context, YTArticle} from './types-backend';

function getEntity(ctx: Context): YTArticle | null {
  return ctx.article || ctx.articleDraft || null;
}

function notFound(ctx: Context) {
  ctx.response.code = 404;
  ctx.response.json({error: 'Entity not found'});
}

export const httpHandler = {
  endpoints: [
    {
      scope: 'article',
      method: 'GET',
      path: 'article-data',
      handle: (ctx: Context) => {
        const entity = getEntity(ctx);
        if (!entity) {
          notFound(ctx);
          return;
        }
        const project = entity.project || ctx.project;
        ctx.response.json({
          summary: entity.summary,
          content: entity.content,
          projectId: project?.shortName,
          url: entity.url
        });
      }
    },
    {
      scope: 'article',
      method: 'POST',
      path: 'apply-template',
      handle: (ctx: Context) => {
        const entity = getEntity(ctx);
        if (!entity) {
          notFound(ctx);
          return;
        }

        const project = entity.project || ctx.project;
        if (project && !ctx.currentUser.hasPermission('UPDATE_ARTICLE', project)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to edit articles in this project'});
          return;
        }

        const {summary, content} = ctx.request.json<ApplyTemplateRequest>();
        entity.summary = summary || '';
        entity.content = content || '';

        ctx.response.json({success: true, url: entity.url});
      }
    }
  ]
};
