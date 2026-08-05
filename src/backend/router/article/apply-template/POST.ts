import {applyTemplateToArticle} from '../../../utils/article';

/**
 * @zod-to-schema
 */
export type ArticleApplyTemplatePOSTReq = {
  summary?: string;
  content?: string;
};

/**
 * @zod-to-schema
 */
export type ArticleApplyTemplatePOSTRes = {
  success?: boolean;
  url?: string;
  error?: string;
};

/** Writes a template into the current article or draft. */
function handle(ctx: CtxPost<ArticleApplyTemplatePOSTReq, ArticleApplyTemplatePOSTRes, never, "article">): void {
  const {summary, content} = ctx.request.json();
  const result = applyTemplateToArticle(ctx, summary, content);
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
