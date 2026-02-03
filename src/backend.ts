import {Context} from './types-backend';

export const httpHandler = {
  endpoints: [
    {
      scope: 'article',
      method: 'GET',
      path: 'article-data',
      handle: (ctx: Context) => {
        const entity = ctx.article || ctx.articleDraft;
        if (entity) {
          ctx.response.json({
            summary: entity.summary,
            content: entity.content,
            projectId: ctx.project?.shortName
          });
        } else {
          ctx.response.code = 404;
          ctx.response.json({error: 'Entity not found'});
        }
      }
    }
  ]
};
